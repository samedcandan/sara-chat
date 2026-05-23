// ── SARA Chat — Veritabanı Tabloları ────────────────────
// chat_ prefix'li tablolar oluşturur. SARA (assistant_) ile karışmaz.
// Kullanım: node setup-db.js

const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EmAxuC3jS7Le@ep-lucky-math-allbgllc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function setup() {
  const sql = postgres(DATABASE_URL);

  console.log('chat_tenants oluşturuluyor...');
  await sql`
    CREATE TABLE IF NOT EXISTS chat_tenants (
      id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name            TEXT NOT NULL,
      email           TEXT,
      password_hash   TEXT,
      system_prompt   TEXT NOT NULL DEFAULT '',
      manychat_field_id INTEGER,
      manychat_flow_ns TEXT,
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('chat_knowledge_files oluşturuluyor...');
  await sql`
    CREATE TABLE IF NOT EXISTS chat_knowledge_files (
      id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id   UUID REFERENCES chat_tenants(id) ON DELETE CASCADE,
      file_type   TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, file_type)
    )
  `;

  console.log('chat_conversations oluşturuluyor...');
  await sql`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id   UUID REFERENCES chat_tenants(id) ON DELETE CASCADE,
      contact_id  TEXT NOT NULL,
      platform    TEXT NOT NULL DEFAULT 'manychat',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, contact_id)
    )
  `;

  console.log('chat_messages oluşturuluyor...');
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content         TEXT NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('İndeksler oluşturuluyor...');
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_conv ON chat_conversations(tenant_id, contact_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_msg ON chat_messages(conversation_id, created_at)`;

  console.log('✅ Tüm tablolar hazır!');
  await sql.end();
}

setup().catch(e => { console.error('❌ Hata:', e); process.exit(1); });
