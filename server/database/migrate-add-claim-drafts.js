const { query } = require('../config/db');

async function tableExists(name) {
  try {
    const r = await query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
           AND table_name = $1
       )`,
      [name]
    );
    return r.rows[0].exists;
  } catch (_) {
    return false;
  }
}

async function run() {
  try {
    const exists = await tableExists('claim_drafts');
    if (!exists) {
      await query(`
        CREATE TABLE claim_drafts (
          id SERIAL PRIMARY KEY,
          policy_number VARCHAR(100) UNIQUE NOT NULL,
          data JSONB NOT NULL,
          department VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }
    await query('CREATE INDEX IF NOT EXISTS idx_claim_drafts_updated_at ON claim_drafts(updated_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_claim_drafts_department ON claim_drafts(department)');
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

run();
