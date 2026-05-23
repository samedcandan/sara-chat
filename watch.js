const pg = require('postgres');
const sql = pg('postgresql://neondb_owner:npg_EmAxuC3jS7Le@ep-lucky-math-allbgllc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function watch() {
  let lastId = '';
  for (let i = 0; i < 24; i++) {
    const r = await sql`SELECT id, content, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 1`;
    const now = new Date().toLocaleTimeString('tr-TR', {timeZone:'Europe/Istanbul'});
    if (r[0] && r[0].id !== lastId) {
      console.log(`${now} ✅ YENİ: ${r[0].content.substring(0,80)}`);
      lastId = r[0].id;
    } else {
      console.log(`${now} ⏳ bekliyor...`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  await sql.end();
}
watch();
