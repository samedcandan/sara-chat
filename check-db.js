const pg = require('postgres');
const sql = pg('postgresql://neondb_owner:npg_EmAxuC3jS7Le@ep-lucky-math-allbgllc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function check() {
  // Son mesajları kontrol et
  const msgs = await sql`SELECT id,role,content,created_at FROM chat_messages ORDER BY created_at DESC LIMIT 10`;
  console.log('=== SON MESAJLAR ===');
  for (const m of msgs) {
    console.log(`[${m.role}] ${m.content.substring(0,80)} (${m.created_at})`);
  }

  // Konuşmaları kontrol et
  const convs = await sql`SELECT id,contact_id,platform,created_at FROM chat_conversations ORDER BY created_at DESC LIMIT 5`;
  console.log('\n=== KONUŞMALAR ===');
  for (const c of convs) {
    console.log(`contact: ${c.contact_id}, platform: ${c.platform} (${c.created_at})`);
  }

  await sql.end();
}
check().catch(e => { console.error(e); process.exit(1); });
