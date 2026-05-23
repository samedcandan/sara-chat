// chat_tenants'a ManyChat alanlarını ekle
const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EmAxuC3jS7Le@ep-lucky-math-allbgllc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function migrate() {
  const sql = postgres(DATABASE_URL);

  try {
    await sql`ALTER TABLE chat_tenants ADD COLUMN IF NOT EXISTS manychat_field_id INTEGER`;
    console.log('✅ manychat_field_id eklendi');
  } catch(e) { console.log('manychat_field_id zaten var'); }

  try {
    await sql`ALTER TABLE chat_tenants ADD COLUMN IF NOT EXISTS manychat_flow_ns TEXT`;
    console.log('✅ manychat_flow_ns eklendi');
  } catch(e) { console.log('manychat_flow_ns zaten var'); }

  // Mevcut tenant varsa göster
  const tenants = await sql`SELECT id, name, manychat_field_id, manychat_flow_ns FROM chat_tenants`;
  console.log('\n📋 Mevcut tenantlar:');
  for (const t of tenants) {
    console.log(`  - ${t.name} (${t.id}) | field_id: ${t.manychat_field_id} | flow_ns: ${t.manychat_flow_ns}`);
  }

  await sql.end();
}

migrate().catch(e => { console.error('❌', e); process.exit(1); });
