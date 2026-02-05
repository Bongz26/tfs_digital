/**
 * Database Utilities
 * Provides atomic database operations using PostgreSQL functions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

let supabaseClient = null;

/**
 * Get or create Supabase client
 */
function getSupabaseClient() {
    if (!supabaseClient && supabaseUrl && supabaseKey) {
        supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
    return supabaseClient;
}

/**
 * Atomic stock decrement
 * @param {number} itemId - Inventory item ID
 * @param {number} amount - Amount to decrement
 * @param {string} recordedBy - User email/name
 * @param {string} reason - Reason for decrement
 * @returns {Promise<{success: boolean, newQuantity: number, message: string}>}
 */
async function decrementStock(itemId, amount = 1, recordedBy = 'system', reason = 'Stock usage') {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('decrement_stock', {
        item_id: itemId,
        amount: amount,
        recorded_by_name: recordedBy,
        reason_text: reason
    });

    if (error) {
        throw new Error(`Stock decrement failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
        throw new Error('Stock decrement returned no data');
    }

    const result = data[0];
    return {
        success: result.success,
        newQuantity: result.new_quantity,
        message: result.message
    };
}

/**
 * Atomic stock increment
 * @param {number} itemId - Inventory item ID
 * @param {number} amount - Amount to increment
 * @param {string} recordedBy - User email/name
 * @param {string} reason - Reason for increment
 * @param {string} referenceNumber - Optional PO number or reference
 * @returns {Promise<{success: boolean, newQuantity: number, message: string}>}
 */
async function incrementStock(itemId, amount = 1, recordedBy = 'system', reason = 'Stock replenishment', referenceNumber = null) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('increment_stock', {
        item_id: itemId,
        amount: amount,
        recorded_by_name: recordedBy,
        reason_text: reason,
        reference_num: referenceNumber
    });

    if (error) {
        throw new Error(`Stock increment failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
        throw new Error('Stock increment returned no data');
    }

    const result = data[0];
    return {
        success: result.success,
        newQuantity: result.new_quantity,
        message: result.message
    };
}

/**
 * Atomic case creation
 * @param {object} caseData - Case data object
 * @param {number|null} inventoryItemId - Optional inventory item to decrement
 * @param {string|null} draftPolicyNumber - Optional draft to delete
 * @param {string} userEmail - User email
 * @param {string|null} userId - User UUID
 * @returns {Promise<object>} Created case with warnings
 */
async function createCaseAtomic(caseData, inventoryItemId = null, draftPolicyNumber = null, userEmail = 'system', userId = null) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('create_case_atomic', {
        case_data: caseData,
        inventory_item_id: inventoryItemId,
        draft_policy_number: draftPolicyNumber,
        user_email: userEmail,
        user_id_val: userId
    });

    if (error) {
        throw new Error(`Case creation failed: ${error.message}`);
    }

    return data;
}

/**
 * Execute a transaction by wrapping operations
 * Note: Supabase doesn't support explicit transactions in the client,
 * so we use RPC functions instead
 */
async function withTransaction(callback) {
    // For now, this is a wrapper for future implementation
    // Real transactions should use the RPC functions above
    const supabase = getSupabaseClient();
    return await callback(supabase);
}

/**
 * Atomic stock reservation
 */
async function reserveStock(itemId, amount = 1, recordedBy = 'system', reason = 'Case reservation') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('reserve_stock', {
        item_id: itemId,
        amount: amount,
        reason_text: reason
    });
    if (error) throw new Error(`Stock reservation failed: ${error.message}`);
    return data;
}

/**
 * Atomic stock release (cancel reservation)
 */
async function releaseStock(itemId, amount = 1, recordedBy = 'system', reason = 'Reservation cancelled') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('release_stock', {
        item_id: itemId,
        amount: amount,
        reason_text: reason
    });
    if (error) throw new Error(`Stock release failed: ${error.message}`);
    return data;
}

/**
 * Atomic stock commit (deduct from stock & reserved)
 */
async function commitStock(itemId, amount = 1, caseId = null, recordedBy = 'system', reason = 'Stock committed') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('commit_stock', {
        item_id: itemId,
        amount: amount,
        case_id_val: caseId,
        reason_text: reason
    });
    if (error) throw new Error(`Stock commit failed: ${error.message}`);
    return data;
}

module.exports = {
    getSupabaseClient,
    decrementStock,
    incrementStock,
    createCaseAtomic,
    withTransaction,
    reserveStock,
    releaseStock,
    commitStock
};
