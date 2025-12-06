const { query } = require('../config/db');

async function run() {
  try {
    await query("CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)");
    await query("CREATE INDEX IF NOT EXISTS idx_cases_funeral_date ON cases(funeral_date)");
    await query("CREATE INDEX IF NOT EXISTS idx_checklist_case_completed ON checklist(case_id, completed)");
    console.log('✅ Created indexes for performance');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create indexes:', err.message);
    process.exit(1);
  }
}

run();
