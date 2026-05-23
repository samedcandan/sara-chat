// sameddepo subscriber'ına mesaj gönder — 24h penceresi yeni açıldı
const MANYCHAT_API = 'https://api.manychat.com/fb';
const API_KEY = '4181844:c19ec556c3c7f0082ccb25beef03c380';
const SUBSCRIBER_ID = 648053613;

async function send() {
  // 1. setCustomField
  const r1 = await fetch(`${MANYCHAT_API}/subscriber/setCustomField`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriber_id: SUBSCRIBER_ID, field_id: 14620590, field_value: 'Merhabalar! Aysa Organik sıvı organik gübre üretmektedir. Size nasıl yardımcı olabilirim?' })
  });
  console.log('setCustomField:', (await r1.json()).status);

  // 2. sendFlow
  const r2 = await fetch(`${MANYCHAT_API}/sending/sendFlow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriber_id: SUBSCRIBER_ID, flow_ns: 'content20260420074755_789230' })
  });
  console.log('sendFlow:', JSON.stringify(await r2.json()));

  // 3. sendContent
  const r3 = await fetch(`${MANYCHAT_API}/sending/sendContent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscriber_id: SUBSCRIBER_ID,
      data: { version: 'v2', content: { messages: [{ type: 'text', text: 'Merhabalar! Aysa Organik gübre konusunda size yardımcı olabilirim.' }] } }
    })
  });
  console.log('sendContent:', JSON.stringify(await r3.json()));
}
send();
