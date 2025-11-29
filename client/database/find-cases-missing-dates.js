// Script to find cases that are missing required dates
// Run with: node server/database/find-cases-missing-dates.js

const { query } = require('../config/db');

async function findCasesMissingDates() {
  try {
    console.log('🔍 Searching for cases with missing dates...\n');

    // Find cases missing delivery_date or delivery_time
    const missingDelivery = await query(`
      SELECT 
        id,
        case_number,
        deceased_name,
        funeral_date,
        funeral_time,
        delivery_date,
        delivery_time,
        intake_day,
        status,
        created_at
      FROM cases
      WHERE delivery_date IS NULL 
         OR delivery_time IS NULL
      ORDER BY created_at DESC
    `);

    // Find cases missing funeral_date or funeral_time
    const missingFuneral = await query(`
      SELECT 
        id,
        case_number,
        deceased_name,
        funeral_date,
        funeral_time,
        delivery_date,
        delivery_time,
        intake_day,
        status,
        created_at
      FROM cases
      WHERE funeral_date IS NULL 
         OR funeral_time IS NULL
      ORDER BY created_at DESC
    `);

    // Find cases missing intake_day
    const missingIntake = await query(`
      SELECT 
        id,
        case_number,
        deceased_name,
        funeral_date,
        funeral_time,
        delivery_date,
        delivery_time,
        intake_day,
        status,
        created_at
      FROM cases
      WHERE intake_day IS NULL
      ORDER BY created_at DESC
    `);

    // Find cases missing all dates
    const missingAll = await query(`
      SELECT 
        id,
        case_number,
        deceased_name,
        funeral_date,
        funeral_time,
        delivery_date,
        delivery_time,
        intake_day,
        status,
        created_at
      FROM cases
      WHERE (delivery_date IS NULL OR delivery_time IS NULL)
         OR (funeral_date IS NULL OR funeral_time IS NULL)
         OR intake_day IS NULL
      ORDER BY created_at DESC
    `);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 CASES WITH MISSING DATES REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Missing Delivery Date/Time
    if (missingDelivery.rows.length > 0) {
      console.log(`❌ CASES MISSING DELIVERY DATE/TIME (${missingDelivery.rows.length}):`);
      console.log('───────────────────────────────────────────────────────────');
      missingDelivery.rows.forEach((caseItem, index) => {
        console.log(`\n${index + 1}. Case #${caseItem.case_number || 'N/A'} (ID: ${caseItem.id})`);
        console.log(`   Deceased: ${caseItem.deceased_name || 'N/A'}`);
        console.log(`   Status: ${caseItem.status || 'N/A'}`);
        console.log(`   Created: ${caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString('en-ZA') : 'N/A'}`);
        console.log(`   Missing:`);
        if (!caseItem.delivery_date) console.log(`     - Delivery Date`);
        if (!caseItem.delivery_time) console.log(`     - Delivery Time`);
        console.log(`   Funeral Date: ${caseItem.funeral_date || '❌ Missing'}`);
        console.log(`   Funeral Time: ${caseItem.funeral_time || '❌ Missing'}`);
        console.log(`   Intake Day: ${caseItem.intake_day || '❌ Missing'}`);
      });
      console.log('\n');
    } else {
      console.log('✅ All cases have delivery date and time\n');
    }

    // Missing Funeral Date/Time
    if (missingFuneral.rows.length > 0) {
      console.log(`❌ CASES MISSING FUNERAL DATE/TIME (${missingFuneral.rows.length}):`);
      console.log('───────────────────────────────────────────────────────────');
      missingFuneral.rows.forEach((caseItem, index) => {
        console.log(`\n${index + 1}. Case #${caseItem.case_number || 'N/A'} (ID: ${caseItem.id})`);
        console.log(`   Deceased: ${caseItem.deceased_name || 'N/A'}`);
        console.log(`   Status: ${caseItem.status || 'N/A'}`);
        console.log(`   Created: ${caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString('en-ZA') : 'N/A'}`);
        console.log(`   Missing:`);
        if (!caseItem.funeral_date) console.log(`     - Funeral Date`);
        if (!caseItem.funeral_time) console.log(`     - Funeral Time`);
        console.log(`   Delivery Date: ${caseItem.delivery_date || '❌ Missing'}`);
        console.log(`   Delivery Time: ${caseItem.delivery_time || '❌ Missing'}`);
        console.log(`   Intake Day: ${caseItem.intake_day || '❌ Missing'}`);
      });
      console.log('\n');
    } else {
      console.log('✅ All cases have funeral date and time\n');
    }

    // Missing Intake Day
    if (missingIntake.rows.length > 0) {
      console.log(`❌ CASES MISSING INTAKE DAY (${missingIntake.rows.length}):`);
      console.log('───────────────────────────────────────────────────────────');
      missingIntake.rows.forEach((caseItem, index) => {
        console.log(`\n${index + 1}. Case #${caseItem.case_number || 'N/A'} (ID: ${caseItem.id})`);
        console.log(`   Deceased: ${caseItem.deceased_name || 'N/A'}`);
        console.log(`   Status: ${caseItem.status || 'N/A'}`);
        console.log(`   Created: ${caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString('en-ZA') : 'N/A'}`);
        console.log(`   Missing: Intake Day`);
        console.log(`   Funeral Date: ${caseItem.funeral_date || '❌ Missing'}`);
        console.log(`   Funeral Time: ${caseItem.funeral_time || '❌ Missing'}`);
        console.log(`   Delivery Date: ${caseItem.delivery_date || '❌ Missing'}`);
        console.log(`   Delivery Time: ${caseItem.delivery_time || '❌ Missing'}`);
      });
      console.log('\n');
    } else {
      console.log('✅ All cases have intake day\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Cases missing delivery date/time: ${missingDelivery.rows.length}`);
    console.log(`   Cases missing funeral date/time: ${missingFuneral.rows.length}`);
    console.log(`   Cases missing intake day: ${missingIntake.rows.length}`);
    console.log(`   Total cases with missing dates: ${missingAll.rows.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Export SQL for fixing (optional)
    if (missingAll.rows.length > 0) {
      console.log('💡 To fix these cases, you can:');
      console.log('   1. Update them manually through the admin interface');
      console.log('   2. Use SQL UPDATE statements (see below)\n');
      
      console.log('📝 Example SQL to update a case:');
      console.log('   UPDATE cases SET');
      console.log('     delivery_date = \'2025-01-15\',');
      console.log('     delivery_time = \'09:00:00\',');
      console.log('     intake_day = \'2025-01-15\'  -- Must be a Wednesday');
      console.log('   WHERE id = <case_id>;\n');
    }

  } catch (error) {
    console.error('❌ Error finding cases with missing dates:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
findCasesMissingDates();

