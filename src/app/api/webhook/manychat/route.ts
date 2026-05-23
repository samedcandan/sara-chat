// ── SARA Chat — ManyChat Webhook ────────────────────────
// 
// MİMARİ (n8n'in çalışan modeli):
// 1. ManyChat POST atar → Biz anında 200 OK döneriz (timeout yok)
// 2. waitUntil ile arka planda AI cevap üretir
// 3. setCustomField ile sara_cevap güncellenir
// 4. sendFlow ile ManyChat akışı tetiklenir → kullanıcıya mesaj gider
//
// Bu sayede ManyChat'in 10 saniye timeout sınırını aşıyoruz.

export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runAgent } from '@/lib/agent';
import { setCustomField, sendFlow } from '@/lib/manychat';

// GET — Health check
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant');

  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    tenant: tenantId || 'not specified',
  });
}

// POST — ManyChat webhook
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant');

  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'tenant parametresi gerekli' },
      { status: 200 } // ManyChat'e her zaman 200 dön
    );
  }

  let body: { contact_id?: string; last_text_input?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Geçersiz JSON' },
      { status: 200 }
    );
  }

  const contactId = body.contact_id || 'unknown';
  const userMessage = body.last_text_input || '';

  if (!userMessage.trim()) {
    return NextResponse.json(
      { success: false, error: 'Boş mesaj' },
      { status: 200 }
    );
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
    return NextResponse.json(
      { success: false, error: 'Tenant bulunamadı' },
      { status: 200 }
    );
  }

  // ── AI cevap üret ──
  console.log(`[SARA-CHAT] Mesaj alındı: "${userMessage}" (contact: ${contactId})`);

  try {
    const aiResponse = await runAgent({
      tenantId: tenant.id,
      systemPrompt: tenant.system_prompt || '',
      contactId,
      platform: 'manychat',
      userMessage,
    });

    console.log(`[SARA-CHAT] AI cevap: "${aiResponse.substring(0, 100)}..."`);

    // ── ManyChat API ile cevabı gönder ──
    if (tenant.manychat_field_id && tenant.manychat_flow_ns) {
      try {
        // 1. sara_cevap field'ını güncelle
        const fieldResult = await setCustomField(
          contactId,
          tenant.manychat_field_id,
          aiResponse
        );
        console.log(`[SARA-CHAT] setCustomField:`, JSON.stringify(fieldResult));

        // 2. Flow'u tetikle (Send Message bloğu cevabı iletir)
        const flowResult = await sendFlow(contactId, tenant.manychat_flow_ns);
        console.log(`[SARA-CHAT] sendFlow:`, JSON.stringify(flowResult));
      } catch (mcError) {
        console.error(`[SARA-CHAT] ManyChat API hatası:`, mcError);
      }
    }

    // ManyChat'in Response Mapping'i için de ai_response'u dön (yedek yol)
    return NextResponse.json({
      success: true,
      ai_response: aiResponse,
    });

  } catch (error) {
    console.error(`[SARA-CHAT] Agent hatası:`, error);
    const fallback = 'Şu an teknik bir sorun yaşıyoruz. Lütfen biraz sonra tekrar deneyin.';
    return NextResponse.json({
      success: true,
      ai_response: fallback,
    });
  }
}
