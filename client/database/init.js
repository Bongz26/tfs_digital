// server/database/init.js
// Database initialization script
// Run this to set up the database schema and seed data

const fs = require('fs');
const path = require('path');
const { query, pool } = require('../config/db');

const initDatabase = async () => {
  try {
    console.log('🚀 Starting database initialization...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    console.log('📋 Creating database tables...');
    await query(schemaSQL);
    console.log('✅ Database tables created successfully');

    // Read seed file
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Seeding database with sample data...');
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      await query(seedSQL);
      console.log('✅ Database seeded successfully');
    } else {
      console.log('⚠️  Seed file not found, skipping seed data');
    }

    console.log('✅ Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };

