// ── ManyChat API Yardımcıları ────────────────────────────
// n8n'in eski workflow'undaki setCustomField + sendFlow mantığının aynısı.

const MANYCHAT_API = 'https://api.manychat.com/fb';

function getApiKey(): string {
  return process.env.MANYCHAT_API_KEY || '';
}

async function mcFetch(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${MANYCHAT_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * sara_cevap custom field'ını güncelle
 */
export async function setCustomField(subscriberId: string, fieldId: number, value: string) {
  return mcFetch('/subscriber/setCustomField', {
    subscriber_id: subscriberId,
    field_id: fieldId,
    field_value: value,
  });
}

/**
 * Belirli bir flow'u tetikle (Send Message bloğu içeren)
 */
export async function sendFlow(subscriberId: string, flowNs: string) {
  return mcFetch('/sending/sendFlow', {
    subscriber_id: subscriberId,
    flow_ns: flowNs,
  });
}

/**
 * Doğrudan mesaj gönderme (24 saat penceresi açıksa çalışır)
 */
export async function sendContent(subscriberId: string, text: string) {
  return mcFetch('/sending/sendContent', {
    subscriber_id: subscriberId,
    data: {
      version: 'v2',
      content: {
        messages: [{ type: 'text', text }],
      },
    },
  });
}
