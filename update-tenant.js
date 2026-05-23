// Tenant'a ManyChat bilgilerini kaydet
const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EmAxuC3jS7Le@ep-lucky-math-allbgllc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function update() {
  const sql = postgres(DATABASE_URL);

  const TENANT_ID = '2592aa43-2bcd-45a0-b7e0-9a483cd0c112';
  const FIELD_ID = 14620590;               // sara_cevap custom field ID
  const FLOW_NS = 'content20260420074755_789230'; // "insta cevap" flow NS

  await sql`
    UPDATE chat_tenants 
    SET manychat_field_id = ${FIELD_ID},
        manychat_flow_ns = ${FLOW_NS}
    WHERE id = ${TENANT_ID}
  `;

  const [tenant] = await sql`SELECT id, name, manychat_field_id, manychat_flow_ns FROM chat_tenants WHERE id = ${TENANT_ID}`;
  console.log('✅ Tenant güncellendi:');
  console.log(`   Ad: ${tenant.name}`);
  console.log(`   Field ID: ${tenant.manychat_field_id}`);
  console.log(`   Flow NS: ${tenant.manychat_flow_ns}`);

  await sql.end();
}

update().catch(e => { console.error('❌', e); process.exit(1); });
