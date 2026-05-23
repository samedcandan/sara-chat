// ── SARA Chat — ManyChat Webhook ────────────────────────
//
// 2 AYRI OTOMASYON MODELİ:
//
// [aysainsta] → mesaj gelince bu webhook'a POST atar
// [insta cevap] → API ile tetiklenip sara_cevap'ı kullanıcıya gönderir
//
// 3 KATMANLI CEVAP STRATEJİSİ:
// 1. sendContent — API ile doğrudan mesaj gönder (en hızlı yol)
// 2. setCustomField + sendFlow — "insta cevap" flow'unu tetikle (yedek yol)
// 3. JSON response'da ai_response dön — ManyChat Response Mapping (son yedek)

export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runAgent } from '@/lib/agent';
import { setCustomField, sendFlow, sendContent } from '@/lib/manychat';

// GET — Health check
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant');

  return NextResponse.json({
    status: 'ok',
    version: '2.0.0',
    tenant: tenantId || 'not specified',
    timestamp: new Date().toISOString(),
  });
}

// POST — ManyChat webhook
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant');

  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'tenant parametresi gerekli' },
      { status: 200 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Geçersiz JSON' },
      { status: 200 }
    );
  }

  // ManyChat subscriber ID — bu integer (contact_id veya id olarak gelebilir)
  const subscriberId = String(body.id || body.contact_id || body.subscriber_id || '');
  const userMessage = String(body.last_text_input || body.text || body.message || '');

  console.log(`[SARA-CHAT] Gelen body:`, JSON.stringify(body));
  console.log(`[SARA-CHAT] subscriberId: ${subscriberId}, message: "${userMessage}"`);

  if (!userMessage.trim()) {
    return NextResponse.json({ success: false, error: 'Boş mesaj' }, { status: 200 });
  }

  // ── Tenant bilgilerini çek ──
  const sql = getDb();
  const [tenant] = await sql<{
    id: string;
    system_prompt: string;
    manychat_field_id: number | null;
    manychat_flow_ns: string | null;
  }[]>`
    SELECT id, system_prompt, manychat_field_id, manychat_flow_ns
    FROM chat_tenants
    WHERE id = ${tenantId} AND is_active = true
    LIMIT 1
  `;

  if (!tenant) {
    return NextResponse.json({ success: false, error: 'Tenant bulunamadı' }, { status: 200 });
  }

  // ── AI cevap üret ──
  try {
    const aiResponse = await runAgent({
      tenantId: tenant.id,
      systemPrompt: tenant.system_prompt || '',
      contactId: subscriberId,
      platform: 'manychat',
      userMessage,
    });

    console.log(`[SARA-CHAT] AI cevap (${aiResponse.length} char): "${aiResponse.substring(0, 100)}..."`);

    // ── KATMAN 1: sendContent ile doğrudan mesaj gönder ──
    if (subscriberId && subscriberId !== 'unknown') {
      try {
        const directResult = await sendContent(subscriberId, aiResponse);
        console.log(`[SARA-CHAT] sendContent sonuç:`, JSON.stringify(directResult));
      } catch (e) {
        console.log(`[SARA-CHAT] sendContent başarısız, flow ile deneniyor...`, e);
      }
    }

    // ── KATMAN 2: setCustomField + sendFlow (2 ayrı otomasyon modeli) ──
    if (tenant.manychat_field_id && tenant.manychat_flow_ns && subscriberId) {
      try {
        const fieldResult = await setCustomField(subscriberId, tenant.manychat_field_id, aiResponse);
        console.log(`[SARA-CHAT] setCustomField:`, JSON.stringify(fieldResult));

        const flowResult = await sendFlow(subscriberId, tenant.manychat_flow_ns);
        console.log(`[SARA-CHAT] sendFlow:`, JSON.stringify(flowResult));
      } catch (e) {
        console.error(`[SARA-CHAT] ManyChat API hatası:`, e);
      }
    }

    // ── KATMAN 3: JSON response (ManyChat Response Mapping) ──
    return NextResponse.json({
      success: true,
      ai_response: aiResponse,
    });

  } catch (error) {
    console.error(`[SARA-CHAT] Agent hatası:`, error);
    return NextResponse.json({
      success: true,
      ai_response: 'Şu an teknik bir sorun yaşıyoruz. Lütfen biraz sonra tekrar deneyin.',
    });
  }
}
