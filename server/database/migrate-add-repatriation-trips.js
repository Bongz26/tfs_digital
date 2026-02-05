// Migration script to add repatriation_trips table and indexes
// Usage: node database/migrate-add-repatriation-trips.js

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
    console.log('🔄 Running repatriation_trips migration...');

    const exists = await tableExists('repatriation_trips');
    if (!exists) {
      await query(`
        CREATE TABLE repatriation_trips (
          id SERIAL PRIMARY KEY,
          case_id INT REFERENCES cases(id),
          vehicle_id INT REFERENCES vehicles(id),
          driver_id INT REFERENCES drivers(id),
          from_location VARCHAR(120),
          from_address TEXT,
          to_location VARCHAR(120),
          to_address TEXT,
          odometer_closing INT,
          km_traveled INT,
          time_out VARCHAR(20),
          time_in VARCHAR(20),
          notes TEXT,
          created_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Created repatriation_trips table');
    } else {
      console.log('✅ repatriation_trips table already exists');
    }

    await query('CREATE INDEX IF NOT EXISTS idx_repatriation_trips_case_id ON repatriation_trips(case_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_repatriation_trips_vehicle_id ON repatriation_trips(vehicle_id)');
    console.log('✅ Created indexes');

    console.log('\n✅ Migration completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

run();

