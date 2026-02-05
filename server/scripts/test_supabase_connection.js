// server/scripts/test_supabase_connection.js
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('--- Supabase Connection Test ---');
console.log('URL:', supabaseUrl);
console.log('Key Length:', supabaseServiceKey ? supabaseServiceKey.length : 'MISSING');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
    try {
        console.log('Attempting to fetch cases (limit 1)...');
        const { data, error } = await supabase
            .from('cases')
            .select('id, case_number')
            .limit(1);

        if (error) {
            console.error('❌ Supabase Error:', error);
        } else {
            console.log('✅ Success! Data fetched:', data);
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    }
}

testConnection();
