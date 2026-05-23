export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🤖 SARA Chat</h1>
      <p>ManyChat tabanlı AI müşteri asistanı.</p>
      <p><strong>Webhook:</strong> <code>/api/webhook/manychat?tenant=TENANT_ID</code></p>
      <p style={{ color: '#888', fontSize: '14px' }}>© Karneyn Yazılım Hizmetleri Ltd. Şti.</p>
    </div>
  );
}
