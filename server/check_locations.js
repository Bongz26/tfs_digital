const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listLocations() {
    const { data, error } = await supabase
        .from('inventory')
        .select('location');

    if (error) {
        console.error('Error fetching locations:', error);
        return;
    }

    const locations = [...new Set(data.map(i => i.location).filter(Boolean))];
    const nulls = data.filter(i => !i.location).length;

    console.log('--- RAW LOCATIONS DUMP ---');
    console.log(JSON.stringify(locations));
    console.log('---------------------------');
}


listLocations();
