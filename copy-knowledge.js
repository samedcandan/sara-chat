// ── Aysa Organik Bilgi Tabanını SARA'dan Kopyala ────────
// assistant_* tablolarından chat_* tablolarına veri kopyalar.
// Kullanım: node copy-knowledge.js

const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EmAxuC3jS7Le@ep-lucky-math-allbgllc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function copy() {
  const sql = postgres(DATABASE_URL);

  // Aysa Organik'in tenant ID'si (assistant tarafı)
  const [aysaAssistant] = await sql`
    SELECT id, system_prompt FROM assistant_tenants
    WHERE name ILIKE '%aysa%' LIMIT 1
  `;

  if (!aysaAssistant) {
    console.log('❌ Aysa Organik assistant_tenants tablosunda bulunamadı');
    await sql.end();
    return;
  }

  console.log(`✅ Aysa Organik bulundu (assistant): ${aysaAssistant.id}`);
  console.log(`   System prompt: ${aysaAssistant.system_prompt?.length || 0} karakter`);

  // Chat tarafındaki tenant'ı bul
  const CHAT_TENANT_ID = process.argv[2];
  if (!CHAT_TENANT_ID) {
    console.log('❌ Kullanım: node copy-knowledge.js <CHAT_TENANT_ID>');
    await sql.end();
    return;
  }

  const [chatTenant] = await sql`
    SELECT id FROM chat_tenants WHERE id = ${CHAT_TENANT_ID}
  `;

  if (!chatTenant) {
    console.log(`❌ Chat tenant bulunamadı: ${CHAT_TENANT_ID}`);
    await sql.end();
    return;
  }

  // System prompt kopyala
  await sql`
    UPDATE chat_tenants SET system_prompt = ${aysaAssistant.system_prompt}
    WHERE id = ${CHAT_TENANT_ID}
  `;
  console.log('✅ System prompt kopyalandı');

  // Bilgi tabanını kopyala
  const knowledgeFiles = await sql`
    SELECT file_type, content FROM assistant_knowledge_files
    WHERE tenant_id = ${aysaAssistant.id} AND content IS NOT NULL AND content != ''
  `;

  for (const file of knowledgeFiles) {
    await sql`
      DELETE FROM chat_knowledge_files 
      WHERE tenant_id = ${CHAT_TENANT_ID} AND file_type = ${file.file_type}
    `;
    await sql`
      INSERT INTO chat_knowledge_files (tenant_id, file_type, content)
      VALUES (${CHAT_TENANT_ID}, ${file.file_type}, ${file.content})
    `;
    console.log(`✅ ${file.file_type}: ${file.content.length} karakter kopyalandı`);
  }

  console.log('\n🎉 Tüm veriler kopyalandı!');
  await sql.end();
}

copy().catch(e => { console.error('❌ Hata:', e); process.exit(1); });
