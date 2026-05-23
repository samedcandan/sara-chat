// ── ManyChat API Yardımcıları ────────────────────────────
// Tüm ManyChat işlemlerini API üzerinden yapıyoruz.
// Otomasyonların aktif/pasif olmasına bağımlı DEĞİLİZ.

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
  const data = await res.json();
  return data;
}

async function mcGet(endpoint: string) {
  const res = await fetch(`${MANYCHAT_API}${endpoint}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

/**
 * sara_cevap custom field'ını güncelle
 */
export async function setCustomField(subscriberId: string, fieldId: number, value: string) {
  return mcFetch('/subscriber/setCustomField', {
    subscriber_id: Number(subscriberId),
    field_id: fieldId,
    field_value: value,
  });
}

/**
 * Belirli bir flow'u tetikle — "insta cevap" otomasyonunu çalıştırır
 */
export async function sendFlow(subscriberId: string, flowNs: string) {
  return mcFetch('/sending/sendFlow', {
    subscriber_id: Number(subscriberId),
    flow_ns: flowNs,
  });
}

/**
 * Doğrudan mesaj gönder — 24 saat penceresi açıksa çalışır
 * Otomasyon gerektirmez, API ile direkt gönderir
 */
export async function sendContent(subscriberId: string, text: string) {
  return mcFetch('/sending/sendContent', {
    subscriber_id: Number(subscriberId),
    data: {
      version: 'v2',
      content: {
        messages: [{ type: 'text', text }],
      },
    },
  });
}

/**
 * Subscriber bilgilerini al
 */
export async function getSubscriberInfo(subscriberId: string) {
  return mcGet(`/subscriber/getInfo?subscriber_id=${subscriberId}`);
}

/**
 * Sayfa bilgilerini al
 */
export async function getPageInfo() {
  return mcGet('/page/getInfo');
}
