import { getOpenAI } from './openai';
import { getDb } from './db';
import type OpenAI from 'openai';

// ── Dinamik Tool Sistemi ────────────────────────────────
// Müşterinin bilgi tabanındaki her kayıt otomatik olarak bir tool olur.
// chat_ prefix'li tablolar kullanılır (SARA'nınkiler assistant_ prefix'li).

async function buildDynamicTools(tenantId: string): Promise<{
  tools: OpenAI.Chat.ChatCompletionTool[];
  knowledgeMap: Record<string, string>;
}> {
  const sql = getDb();
  const files = await sql<{ file_type: string; content: string }[]>`
    SELECT file_type, content FROM chat_knowledge_files
    WHERE tenant_id = ${tenantId} AND content IS NOT NULL AND content != ''
  `;

  const knowledgeMap: Record<string, string> = {};
  const tools: OpenAI.Chat.ChatCompletionTool[] = [];

  for (const file of files) {
    const toolName = file.file_type
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_ğüşıöçĞÜŞİÖÇ]/gi, '')
      .substring(0, 60);

    knowledgeMap[toolName] = file.content;
    tools.push({
      type: 'function',
      function: {
        name: toolName,
        description: `"${file.file_type}" konusu hakkındaki bilgi tabanı. Bu konuyla ilgili sorularda bu kaynağı kullan.`,
        parameters: { type: 'object', properties: {}, required: [] },
      },
    });
  }

  return { tools, knowledgeMap };
}

function callTool(knowledgeMap: Record<string, string>, toolName: string): string {
  return knowledgeMap[toolName] || `[${toolName} için bilgi bulunamadı]`;
}

// ── Konuşma Geçmişi ────────────────────────────────────

async function getHistory(conversationId: string, limit = 20) {
  const sql = getDb();
  const rows = await sql<{ role: string; content: string; created_at: Date }[]>`
    SELECT role, content, created_at FROM (
      SELECT role, content, created_at FROM chat_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    ) sub
    ORDER BY created_at ASC
  `;
  return rows as { role: 'user' | 'assistant'; content: string; created_at: Date }[];
}

async function saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const sql = getDb();
  await sql`
    INSERT INTO chat_messages (conversation_id, role, content)
    VALUES (${conversationId}, ${role}, ${content})
  `;
}

async function getOrCreateConversation(tenantId: string, contactId: string, platform: string): Promise<string> {
  const sql = getDb();
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM chat_conversations
    WHERE tenant_id = ${tenantId} AND contact_id = ${contactId}
    LIMIT 1
  `;
  if (existing) return existing.id;

  const [created] = await sql<{ id: string }[]>`
    INSERT INTO chat_conversations (tenant_id, contact_id, platform)
    VALUES (${tenantId}, ${contactId}, ${platform})
    RETURNING id
  `;
  return created.id;
}

// ── Ana AI Agent ────────────────────────────────────────

export async function runAgent({
  tenantId,
  systemPrompt,
  contactId,
  platform,
  userMessage,
}: {
  tenantId: string;
  systemPrompt: string;
  contactId: string;
  platform: string;
  userMessage: string;
}): Promise<string> {
  const openai = getOpenAI();
  const conversationId = await getOrCreateConversation(tenantId, contactId, platform);
  await saveMessage(conversationId, 'user', userMessage);

  const { tools, knowledgeMap } = await buildDynamicTools(tenantId);
  const hasTools = tools.length > 0;

  const history = await getHistory(conversationId);
  const today = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  const toolListText = hasTools
    ? `\nMEVCUT BİLGİ TABANI KONULARI: ${Object.keys(knowledgeMap).join(', ')}`
    : '\nBİLGİ TABANI: Henüz bilgi girilmemiş.';

  const enrichedSystemPrompt = `Sen aşağıdaki bilgilere sıkı sıkıya bağlı kalarak hizmet veren profesyonel bir asistansın.
  
İŞLETME SAHİBİNİN SANA VERDİĞİ ROL VE KURALLAR:
--------------------------------------------------
${systemPrompt}
--------------------------------------------------
${toolListText}

KATI VE İHLAL EDİLEMEZ KURALLAR:
1. YALNIZCA sana sağlanan araçlardan (tools) elde ettiğin bilgi tabanı verilerini kullan.
2. Bilgi tabanında kesin ve net bir yanıt bulamıyorsan ASLA tahmin yürütme veya dış dünyadan bilgi uydurma.
3. Elinde yeterli bilgi yoksa: "Maalesef bu konuda kesin bir bilgim yok, isterseniz uzman ekibimiz size ulaşıp detaylı bilgi versin" şeklinde kibar bir dönüş yap.
4. Müşterinin sorduğu soruya uygun birden fazla bilgi bulursan, bu bilgileri akıcı, anlaşılır ve nazik bir tonda harmanlayarak sun.
5. Kullanıcıyla tartışmaya girme, her zaman itaatkar ve çözüm odaklı ol.
6. (ÖNEMLİ ZAMAN KAVRAMI): Sohbet geçmişindeki mesajların başında "[Tarih: ...]" yazar. Zaman farklarını analiz et.

Kullanıcı ID: ${contactId}
Şu Anki Tarih ve Saat: ${today}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...history.map((m) => {
      const timeStr = new Date(m.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      return {
        role: m.role,
        content: `[Tarih: ${timeStr}] ${m.content}`,
      };
    }),
  ];

  let response = '';
  let continueLoop = true;

  while (continueLoop) {
    const completionParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4o',
      temperature: 0.1,
      messages: [
        { role: 'system', content: enrichedSystemPrompt },
        ...messages,
      ],
    };

    if (hasTools) {
      completionParams.tools = tools;
      completionParams.tool_choice = messages.length <= 1 ? 'required' : 'auto';
    }

    const completion = await openai.chat.completions.create(completionParams);
    const choice = completion.choices[0];

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      messages.push(choice.message);

      const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
      for (const tc of choice.message.tool_calls) {
        const toolCall = tc as { id: string; function: { name: string } };
        const content = callTool(knowledgeMap, toolCall.function.name);
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content,
        });
      }
      messages.push(...toolResults);
    } else {
      response = choice.message.content || '';
      continueLoop = false;
    }
  }

  await saveMessage(conversationId, 'assistant', response);
  return response;
}
