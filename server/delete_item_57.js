const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uucjdcbtpunfsyuixsmc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Y2pkY2J0cHVuZnN5dWl4c21jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4MTQzMiwiZXhwIjoyMDc4MzU3NDMyfQ.kUNeI3l0NiIJQEJNr1xu9nmQLDkywWReUywjYdOuDVQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DELETE_ID = 57;

async function deleteItem() {
    console.log(`🗑️ Starting manual deletion of Inventory ID: ${DELETE_ID}`);

    try {
        // 1. Delete Stock Take Items
        const { error: stiErr } = await supabase
            .from('stock_take_items')
            .delete()
            .eq('inventory_id', DELETE_ID);

        if (stiErr) throw stiErr;
        console.log('✅ Deleted related Stock Take Items');

        // 2. Delete Stock Movements
        const { error: smErr } = await supabase
            .from('stock_movements')
            .delete()
            .eq('inventory_id', DELETE_ID);

        if (smErr) throw smErr;
        console.log('✅ Deleted related Stock Movements');

        // 3. Delete Inactive Reservations
        const { error: resErr } = await supabase
            .from('reservations')
            .delete()
            .eq('inventory_id', DELETE_ID);

        if (resErr) throw resErr;
        console.log('✅ Deleted related Reservations');

        // 4. Delete Inventory Item
        const { error: invErr } = await supabase
            .from('inventory')
            .delete()
            .eq('id', DELETE_ID);

        if (invErr) throw invErr;
        console.log('✅ Deleted Inventory Item');

        console.log('🎉 Operations completed successfully.');

    } catch (err) {
        console.error('❌ Error during deletion:', err);
    }
}

deleteItem();
