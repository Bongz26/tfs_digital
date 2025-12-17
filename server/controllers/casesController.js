const { query, getClient } = require('../config/db');

// --- LOOKUP CASE BY IDENTIFIERS ---
exports.lookupCase = async (req, res) => {
    try {
        const { deceased_id, case_number, policy_number, deceased_name, nok_contact } = req.query;

        const idVal = (deceased_id || '').trim();
        const caseNo = (case_number || '').trim();
        const policyNo = (policy_number || '').trim();
        const nameVal = (deceased_name || '').trim();
        const contactVal = (nok_contact || '').trim();

        if (!idVal && !caseNo && !policyNo && !(nameVal && contactVal)) {
            return res.status(400).json({
                success: false,
                error: 'Provide at least one identifier',
                hint: 'Use deceased_id, case_number, policy_number, or deceased_name + nok_contact'
            });
        }

        let found = null;

        if (!found && idVal) {
            const r = await query(
                `SELECT * FROM cases WHERE deceased_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [idVal]
            );
            found = r.rows[0] || null;
        }

        if (!found && caseNo) {
            const r = await query(
                `SELECT * FROM cases WHERE case_number = $1 ORDER BY created_at DESC LIMIT 1`,
                [caseNo]
            );
            found = r.rows[0] || null;
        }

        if (!found && policyNo) {
            const r = await query(
                `SELECT * FROM cases WHERE policy_number = $1 ORDER BY created_at DESC LIMIT 1`,
                [policyNo]
            );
            found = r.rows[0] || null;
        }

        if (!found && nameVal && contactVal) {
            const r = await query(
                `SELECT * FROM cases WHERE LOWER(deceased_name) = LOWER($1) AND nok_contact = $2 ORDER BY created_at DESC LIMIT 1`,
                [nameVal, contactVal]
            );
            found = r.rows[0] || null;
        }

        if (!found) {
            return res.status(404).json({ success: false, error: 'No matching case found' });
        }

        return res.json({ success: true, case: found });
    } catch (err) {
        console.error('Lookup case error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to lookup case', details: err.message });
    }
};

exports.searchCases = async (req, res) => {
    try {
        const term = (req.query.term || '').trim();
        const limit = parseInt(req.query.limit || '10', 10);

        if (!term) {
            return res.status(400).json({ success: false, error: 'Search term is required' });
        }

        const supabase = req.app?.locals?.supabase;
        if (supabase) {
            try {
                const like = `%${term}%`;
                const { data, error } = await supabase
                    .from('cases')
                    .select('id,case_number,deceased_name,deceased_id,policy_number,status,funeral_date,funeral_time')
                    .or(`deceased_id.ilike.${like},case_number.ilike.${like},policy_number.ilike.${like},deceased_name.ilike.${like}`)
                    .order('created_at', { ascending: false })
                    .limit(limit);
                if (error) throw error;
                return res.json({ success: true, cases: Array.isArray(data) ? data : [] });
            } catch (e) {
                console.warn('⚠️ Supabase search failed in searchCases, falling back to DB:', e.message);
            }
        }

        const like = `%${term}%`;
        const sql = `
            SELECT id, case_number, deceased_name, deceased_id, policy_number, status, funeral_date, funeral_time
            FROM cases
            WHERE deceased_id ILIKE $1
               OR case_number ILIKE $1
               OR policy_number ILIKE $1
               OR deceased_name ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
        `;
        const result = await query(sql, [like, limit]);
        return res.json({ success: true, cases: result.rows || [] });
    } catch (err) {
        console.error('Search cases error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to search cases', details: err.message });
    }
};

// --- GET ALL CASES ---
exports.getAllCases = async (req, res) => {
    try {
        const { status, exclude } = req.query;

        const supabase = req.app?.locals?.supabase;
        if (supabase) {
            try {
                let { data, error } = await supabase
                    .from('cases')
                    .select('*')
                    .order('funeral_date', { ascending: false });
                if (error) throw error;

                let rows = Array.isArray(data) ? data : [];
                if (status) {
                    rows = rows.filter(c => (c.status || '').toLowerCase() === String(status).toLowerCase());
                }
                if (exclude) {
                    const parts = String(exclude).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                    if (parts.length > 0) {
                        rows = rows.filter(c => !parts.includes((c.status || '').toLowerCase()));
                    }
                }
                const distinct = String(req.query.distinct || 'policy').toLowerCase();
                if (distinct !== 'none') {
                    const pickLatestByPolicy = new Map();
                    for (const c of rows) {
                        const key = String(c.policy_number || '').replace(/\s+/g, '').toUpperCase();
                        const prev = pickLatestByPolicy.get(key);
                        const currCreated = c.created_at ? new Date(c.created_at) : new Date(0);
                        const prevCreated = prev && prev.created_at ? new Date(prev.created_at) : new Date(0);
                        if (!prev || currCreated > prevCreated) {
                            pickLatestByPolicy.set(key, c);
                        }
                    }
                    rows = Array.from(pickLatestByPolicy.values());
                }
                return res.json({ success: true, cases: rows });
            } catch (e) {
                console.warn('⚠️ Supabase read failed in getAllCases, falling back to DB:', e.message);
            }
        }

        const { status: st, exclude: ex } = req.query;
        const params = [];
        const innerWhere = [];
        if (st) {
            params.push(st);
            innerWhere.push(`status = $${params.length}`);
        }
        if (ex) {
            const parts = String(ex).split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length > 0) {
                const placeholders = parts.map((_, i) => `$${params.length + i + 1}`).join(',');
                params.push(...parts);
                innerWhere.push(`status NOT IN (${placeholders})`);
            }
        }
        const distinct = String(req.query.distinct || 'policy').toLowerCase();
        let sql;
        if (distinct === 'none') {
            sql = `SELECT * FROM cases${innerWhere.length ? ' WHERE ' + innerWhere.join(' AND ') : ''} ORDER BY funeral_date DESC`;
        } else {
            sql = `
                SELECT * FROM (
                  SELECT *, ROW_NUMBER() OVER (
                    PARTITION BY UPPER(REGEXP_REPLACE(COALESCE(policy_number,''),'\\s+','', 'g'))
                    ORDER BY created_at DESC
                  ) rn
                  FROM cases
                  ${innerWhere.length ? ' WHERE ' + innerWhere.join(' AND ') : ''}
                ) t
                WHERE rn = 1
                ORDER BY funeral_date DESC
            `;
        }
        const result = await query(sql, params);
        res.json({ success: true, cases: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to fetch cases', details: err.message });
    }
};

// --- CREATE NEW CASE ---
exports.createCase = async (req, res) => {
    console.log('📥 [POST /api/cases] Request received at', new Date().toISOString());
    console.log('📦 [POST /api/cases] Request body keys:', Object.keys(req.body));
    console.log('📦 [POST /api/cases] Date fields:', {
        delivery_date: req.body.delivery_date,
        service_date: req.body.service_date,
        funeral_date: req.body.funeral_date,
        intake_day: req.body.intake_day
    });

    const {
        case_number,
        claim_date,
        policy_number,
        benefit_mode,
        deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
        plan_category, plan_name, plan_members, plan_age_bracket,
        service_date, service_time,
        funeral_date, funeral_time,
        church_date, church_time,
        cleansing_date, cleansing_time,
        venue_name, venue_address, venue_lat, venue_lng,
        requires_cow, requires_sheep, requires_tombstone, requires_catering, requires_grocery, requires_bus,
        service_type, total_price, casket_type,
        casket_colour, delivery_date, delivery_time, intake_day,
        programs, top_up_amount, airtime, airtime_network, airtime_number,
        cover_amount, cashback_amount, amount_to_bank,
        legacy_plan_name,
        status,
        burial_place,
        branch
    } = req.body;

    try {
        if (!intake_day) {
            return res.status(400).json({
                success: false,
                error: 'Intake day is required',
                details: 'Intake day must be provided and must be a Wednesday'
            });
        }

        const intakeDate = new Date(intake_day);
        const dayOfWeek = intakeDate.getDay(); // 0 = Sunday, 3 = Wednesday
        if (dayOfWeek !== 3) {
            return res.status(400).json({
                success: false,
                error: 'Intake day must be a Wednesday',
                details: `Selected date ${intake_day} is not a Wednesday`
            });
        }

        if (!delivery_date) {
            return res.status(400).json({
                success: false,
                error: 'Delivery date is required',
                details: 'Delivery date must be provided'
            });
        }

        if (!delivery_time) {
            return res.status(400).json({
                success: false,
                error: 'Delivery time is required',
                details: 'Delivery time must be provided'
            });
        }

        let finalCaseNumber = case_number;
        if (!finalCaseNumber) {
            const year = new Date().getFullYear();
            const maxCaseResult = await query(
                `SELECT case_number FROM cases 
         WHERE case_number LIKE $1 
         ORDER BY case_number DESC 
         LIMIT 1`,
                [`THS-${year}-%`]
            );

            let nextNumber = 1;
            if (maxCaseResult.rows.length > 0) {
                const lastCaseNumber = maxCaseResult.rows[0].case_number;
                const match = lastCaseNumber.match(/THS-\d{4}-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            finalCaseNumber = `THS-${year}-${String(nextNumber).padStart(3, '0')}`;
            console.log('🔢 [POST /api/cases] Generated case_number:', finalCaseNumber);
        }

        console.log('🔍 [POST /api/cases] Attempting to insert case with case_number:', finalCaseNumber);

        try {
            const idKey = String(deceased_id || '').trim();
            const polKey = String(policy_number || '').trim();
            const nameKey = String(deceased_name || '').trim();
            const contactKey = String(nok_contact || '').trim();

            let dup = null;
            if (idKey) {
                const r = await query(
                    `SELECT id, case_number, status, created_at FROM cases 
                     WHERE deceased_id = $1 AND status != 'cancelled' 
                     ORDER BY created_at DESC LIMIT 1`,
                    [idKey]
                );
                dup = r.rows[0] || null;
            }
            if (!dup && polKey) {
                const r = await query(
                    `SELECT id, case_number, status, created_at FROM cases 
                     WHERE UPPER(REGEXP_REPLACE(COALESCE(policy_number,''),'\\s+','', 'g')) = UPPER(REGEXP_REPLACE($1,'\\s+','', 'g'))
                       AND status != 'cancelled'
                     ORDER BY created_at DESC LIMIT 1`,
                    [polKey]
                );
                dup = r.rows[0] || null;
            }
            if (!dup && nameKey && contactKey) {
                const r = await query(
                    `SELECT id, case_number, status, created_at FROM cases 
                     WHERE LOWER(deceased_name) = LOWER($1) AND nok_contact = $2
                       AND status != 'cancelled'
                       AND created_at >= NOW() - INTERVAL '60 days'
                     ORDER BY created_at DESC LIMIT 1`,
                    [nameKey, contactKey]
                );
                dup = r.rows[0] || null;
            }
            if (dup) {
                return res.status(409).json({
                    success: false,
                    error: 'Duplicate case detected',
                    details: 'A case with the same identifiers already exists',
                    existing_case: dup
                });
            }
        } catch (e) {
            console.warn('⚠️ Duplicate-prevention check failed, proceeding with insert:', e.message);
        }

        const finalFuneralDate = service_date || funeral_date; // align with frontend service_date
        const finalFuneralTime = service_time || funeral_time;

        const result = await query(
            `INSERT INTO cases 
       (case_number, claim_date, policy_number,
        deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
        plan_category, plan_name, plan_members, plan_age_bracket,
        funeral_date, funeral_time, service_date, service_time,
        church_date, church_time, cleansing_date, cleansing_time,
        venue_name, venue_address, venue_lat, venue_lng,
        requires_cow, requires_sheep, requires_tombstone, requires_catering, requires_grocery, requires_bus,
        service_type, total_price,
        casket_type, casket_colour, delivery_date, delivery_time, intake_day,
        programs, top_up_amount, airtime, airtime_network, airtime_number,
        cover_amount, cashback_amount, amount_to_bank,
        legacy_plan_name, benefit_mode, status, burial_place)
       VALUES (
        $1,$2,$3,
        $4,$5,$6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,$19,$20,
        $21,$22,$23,$24,
        $25,$26,$27,$28,$29,$30,
        $31,$32,
        $33,$34,$35,$36,$37,
        $38,$39,$40,$41,$42,
        $43,$44,$45,
        $46,$47,$48,$49)
       RETURNING *`,
            [
                finalCaseNumber, claim_date || null, policy_number || null,
                deceased_name, deceased_id || null, nok_name, nok_contact, nok_relation || null,
                plan_category || null, plan_name || null, plan_members || null, plan_age_bracket || null,
                finalFuneralDate, finalFuneralTime || null, service_date || null, service_time || null,
                church_date || null, church_time || null, cleansing_date || null, cleansing_time || null,
                venue_name || null, venue_address || null, venue_lat || null, venue_lng || null,
                !!requires_cow, !!requires_sheep, !!requires_tombstone, !!requires_catering, !!requires_grocery, !!requires_bus,
                service_type || null, total_price != null ? total_price : 0,
                casket_type || null, casket_colour || null, delivery_date || null, delivery_time || null, intake_day,
                programs != null ? programs : 0, top_up_amount != null ? top_up_amount : 0, !!airtime, airtime_network || null, airtime_number || null,
                cover_amount != null ? cover_amount : 0, cashback_amount != null ? cashback_amount : 0, amount_to_bank != null ? amount_to_bank : 0,
                legacy_plan_name || null, benefit_mode || null, status || 'confirmed', burial_place || null
            ]
        );

        console.log('✅ [POST /api/cases] Case created successfully:', result.rows[0]?.id, result.rows[0]?.case_number);
        const created = result.rows[0];
        try {
            const nameStr = String(casket_type || '').trim();
            const colorStr = String(casket_colour || '').trim();
            if (nameStr) {
                // Determine branch to check
                const selectedBranch = (branch || 'Head Office').trim();

                // Map 'Head Office' to its sub-locations for search priority
                let locationsToCheck = [selectedBranch];
                if (selectedBranch === 'Head Office') {
                    locationsToCheck = ['HQ Storeroom & showroom', 'Manekeng', 'Manekeng Showroom'];
                }

                let inv = { rows: [] };
                let targetBranch = selectedBranch;

                // Try finding item in each potential location (in order)
                for (const loc of locationsToCheck) {
                    targetBranch = loc;
                    // Query matching Name/Color AND Location
                    if (colorStr) {
                        inv = await query(
                            "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(name) = UPPER($1) AND (color IS NULL OR UPPER(color) = UPPER($2)) AND location = $3 LIMIT 1",
                            [nameStr, colorStr, loc]
                        );
                    } else {
                        inv = await query(
                            "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(name) = UPPER($1) AND location = $2 LIMIT 1",
                            [nameStr, loc]
                        );
                    }

                    if (inv.rows.length === 0) {
                        // Fallback: Try Model Name matches in same branch
                        if (colorStr) {
                            inv = await query(
                                "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(model) = UPPER($1) AND (color IS NULL OR UPPER(color) = UPPER($2)) AND location = $3 LIMIT 1",
                                [nameStr, colorStr, loc]
                            );
                        } else {
                            inv = await query(
                                "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(model) = UPPER($1) AND location = $2 LIMIT 1",
                                [nameStr, loc]
                            );
                        }
                    }

                    if (inv.rows.length > 0) break; // Found it!
                }

                if (inv.rows.length > 0) {
                    const item = inv.rows[0];
                    const previous = item.stock_quantity || 0;
                    const nextQty = previous - 1; // Allow negative stock as per system behavior

                    await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [nextQty, item.id]);

                    // Alert if stock goes negative or was already low
                    if (nextQty < 0) {
                        created.stock_warning = `Stock for ${nameStr} at ${targetBranch} is now negative (${nextQty}).`;
                    }

                    try {
                        await query(
                            `INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                            [item.id, created.id, 'sale', -1, previous, nextQty, 'Case consumption', (req.user?.email) || 'system']
                        );
                    } catch (_) { }
                } else {
                    // Item not found in any valid location
                    created.stock_warning = `Stock item '${nameStr}' not found in inventory for ${selectedBranch}. Please add it to stock.`;
                    console.warn(`⚠️ Stock item '${nameStr}' not found at ${selectedBranch} for case ${created.case_number}`);
                }
            }
        } catch (e) {
            console.warn('Error handling stock deduction:', e);
            created.stock_warning = 'Failed to process stock deduction.';
        }
        try {
            const to = process.env.INVENTORY_ALERTS_TO || process.env.ALERTS_TO || process.env.AIRTIME_OPERATOR_EMAIL;
            const host = process.env.SMTP_HOST;
            const port = parseInt(process.env.SMTP_PORT || '587', 10);
            const user = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASS;
            if (to && host && user && pass) {
                const low = await query(`
                                SELECT id, name, category, sku, stock_quantity, COALESCE(reserved_quantity,0) AS reserved_quantity,
                                       low_stock_threshold, location, model, color
                                FROM inventory
                                ORDER BY category, name
                            `);
                const items = (low.rows || []).map(r => ({
                    ...r,
                    available_quantity: (r.stock_quantity || 0) - (r.reserved_quantity || 0)
                })).filter(r => r.available_quantity <= 1);
                if (items.length) {
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
                    const from = process.env.ALERTS_FROM || user;
                    const subject = `Low Stock Alert: ${items.length} item(s) at qty ≤ 1`;
                    const htmlRows = items.map(i => `
                                    <tr>
                                      <td style="padding:6px;border:1px solid #ddd;">${i.name}${i.color ? ' • ' + i.color : ''}</td>
                                      <td style="padding:6px;border:1px solid #ddd;">${i.category}</td>
                                      <td style="padding:6px;border:1px solid #ddd;">${i.stock_quantity}</td>
                                      <td style="padding:6px;border:1px solid #ddd;">${i.reserved_quantity}</td>
                                      <td style="padding:6px;border:1px solid #ddd;">${i.available_quantity}</td>
                                      <td style="padding:6px;border:1px solid #ddd;">Threshold ${i.low_stock_threshold}</td>
                                    </tr>
                                `).join('');
                    const html = `
                                  <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;">
                                    <p>Low stock items at or below 1 available:</p>
                                    <table style="border-collapse:collapse;min-width:520px;">
                                      <thead>
                                        <tr>
                                          <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Item</th>
                                          <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Category</th>
                                          <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Stock</th>
                                          <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Reserved</th>
                                          <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Available</th>
                                          <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${htmlRows}
                                      </tbody>
                                    </table>
                                  </div>
                                `;
                    const text = items.map(i => `${i.name} ${i.color || ''} | ${i.category} | stock=${i.stock_quantity} reserved=${i.reserved_quantity} available=${i.available_quantity} threshold=${i.low_stock_threshold}`).join('\n');
                    await transporter.sendMail({ from, to, subject, text, html });
                }
            }
        } catch (_) { }
    }
            }
        } catch (_) { }

try {
    if (policy_number) {
        await query('DELETE FROM claim_drafts WHERE policy_number = $1', [policy_number]);
    }
} catch (_) { }
res.json({ success: true, case: created });
    } catch (err) {
    console.error('❌ [POST /api/cases] Error creating case:', err);
    res.status(500).json({
        success: false,
        error: 'Failed to create case',
        details: err.message,
        code: err.code,
        hint: err.code === '42703'
            ? 'Missing column in database. Run migration: ALTER TABLE cases ADD COLUMN delivery_date DATE; ALTER TABLE cases ADD COLUMN delivery_time TIME;'
            : err.code === '23502'
                ? 'Missing required field value'
                : undefined
    });
}
};

// --- ASSIGN VEHICLE TO CASE ---
exports.assignVehicle = async (req, res) => {
    const { caseId } = req.params;
    const { vehicle_id, driver_name, pickup_time, assignment_role } = req.body;

    if (!vehicle_id) {
        return res.status(400).json({ success: false, error: 'vehicle_id is required' });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Ensure roster has assignment_role column
        try {
            const colCheck = await client.query(
                `SELECT 1 FROM information_schema.columns WHERE table_name = 'roster' AND column_name = 'assignment_role'`
            );
            if (colCheck.rows.length === 0) {
                await client.query(`ALTER TABLE roster ADD COLUMN assignment_role VARCHAR(20)`);
            }
        } catch (e) {
            // Continue even if check fails; insert will work if column exists
            console.warn('assignment_role column check failed:', e.message);
        }

        const caseResult = await client.query(
            'SELECT id, case_number, funeral_date, funeral_time, delivery_date, delivery_time FROM cases WHERE id = $1',
            [caseId]
        );
        if (caseResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const currentCase = caseResult.rows[0];
        const currentFuneralDate = currentCase.funeral_date;
        const currentFuneralTime = currentCase.funeral_time;
        const deliveryDate = currentCase.delivery_date;
        const deliveryTime = currentCase.delivery_time;

        let calculatedPickupTime = pickup_time;

        if (deliveryDate && deliveryTime) {
            try {
                calculatedPickupTime = new Date(`${deliveryDate}T${deliveryTime}`).toISOString();
                console.log(`📅 Using delivery_time from case: ${calculatedPickupTime} (${deliveryDate} ${deliveryTime})`);
            } catch (err) {
                console.warn('⚠️  Could not parse delivery_time, falling back to calculation');
                calculatedPickupTime = null;
            }
        }

        if (!calculatedPickupTime && currentFuneralDate && currentFuneralTime) {
            try {
                const funeralDateTime = new Date(`${currentFuneralDate}T${currentFuneralTime}`);
                calculatedPickupTime = new Date(funeralDateTime.getTime() - (1.5 * 60 * 60 * 1000)).toISOString();
                console.log(`📅 Calculated pickup_time: ${calculatedPickupTime} (1.5 hours before funeral at ${currentFuneralTime})`);
            } catch (err) {
                console.warn('⚠️  Could not calculate pickup_time from funeral time, using provided or current time');
                calculatedPickupTime = pickup_time || new Date().toISOString();
            }
        } else if (!calculatedPickupTime) {
            calculatedPickupTime = pickup_time || new Date().toISOString();
        }

        const vehicleResult = await client.query(
            'SELECT id, reg_number, type FROM vehicles WHERE id = $1',
            [vehicle_id]
        );
        if (vehicleResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        // Prevent duplicate vehicle assignment to the same case
        const dupVehicle = await client.query(
            `SELECT 1 FROM roster WHERE case_id = $1 AND vehicle_id = $2 AND status != 'completed'`,
            [caseId, vehicle_id]
        );
        if (dupVehicle.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'This vehicle is already assigned to this case' });
        }

        if (currentFuneralDate) {
            const conflictingAssignments = await client.query(`
        SELECT 
          r.case_id,
          c.funeral_date,
          c.funeral_time,
          c.case_number,
          c.deceased_name
        FROM roster r
        JOIN cases c ON r.case_id = c.id
        WHERE r.vehicle_id = $1 
          AND r.case_id != $2
          AND r.status != 'completed'
          AND c.funeral_date = $3
      `, [vehicle_id, caseId, currentFuneralDate]);

            if (conflictingAssignments.rows.length > 0) {
                const isAdmin = req.user && String(req.user.role).toLowerCase() === 'admin';
                const BUFFER_HOURS = 2;

                if (currentFuneralTime) {
                    const currentTime = new Date(`${currentFuneralDate}T${currentFuneralTime}`);
                    const currentEndTime = new Date(currentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

                    for (const assignment of conflictingAssignments.rows) {
                        if (assignment.funeral_time) {
                            const assignmentTime = new Date(`${assignment.funeral_date}T${assignment.funeral_time}`);
                            const assignmentEndTime = new Date(assignmentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

                            if (
                                (currentTime >= assignmentTime && currentTime < assignmentEndTime) ||
                                (currentEndTime > assignmentTime && currentEndTime <= assignmentEndTime) ||
                                (currentTime <= assignmentTime && currentEndTime >= assignmentEndTime)
                            ) {
                                if (!isAdmin) {
                                    await client.query('ROLLBACK');
                                    return res.status(400).json({
                                        success: false,
                                        error: `Time conflict: Vehicle is already assigned to ${assignment.case_number} (${assignment.deceased_name}) at ${assignment.funeral_time || 'TBA'} on the same day.`,
                                        conflict: {
                                            case_number: assignment.case_number,
                                            deceased_name: assignment.deceased_name,
                                            time: assignment.funeral_time
                                        }
                                    });
                                }
                            }
                        } else {
                            if (!isAdmin) {
                                await client.query('ROLLBACK');
                                return res.status(400).json({
                                    success: false,
                                    error: `Vehicle is assigned to ${assignment.case_number} (${assignment.deceased_name}) on the same day without a specific time.`,
                                    conflict: {
                                        case_number: assignment.case_number,
                                        deceased_name: assignment.deceased_name
                                    }
                                });
                            }
                        }
                    }
                } else {
                    const hasTimedAssignment = conflictingAssignments.rows.some(a => a.funeral_time);
                    if (hasTimedAssignment && !isAdmin) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({
                            success: false,
                            error: `Vehicle is assigned to other case(s) on the same day with specific times. Please set a funeral time for this case first.`,
                            conflicts: conflictingAssignments.rows.map(a => ({
                                case_number: a.case_number,
                                deceased_name: a.deceased_name,
                                time: a.funeral_time
                            }))
                        });
                    }
                }
            }
        }

        if (driver_name && driver_name !== 'TBD' && driver_name.trim() !== '') {
            const driverResult = await client.query(
                'SELECT id, name FROM drivers WHERE name = $1 AND active = true',
                [driver_name.trim()]
            );
            if (driverResult.rows.length === 0) {
                console.log(`⚠️  Driver "${driver_name}" not found in drivers table, but allowing assignment`);
            }
            // Prevent duplicate driver assignment to the same case
            const dupDriver = await client.query(
                `SELECT 1 FROM roster WHERE case_id = $1 AND LOWER(driver_name) = LOWER($2) AND status != 'completed'`,
                [caseId, driver_name.trim()]
            );
            if (dupDriver.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, error: 'This driver is already assigned to this case' });
            }
        }

        const assignedDriver = driver_name && driver_name.trim() !== ''
            ? driver_name.trim()
            : 'TBD';

        const rosterEntry = await client.query(
            `INSERT INTO roster (case_id, vehicle_id, driver_name, pickup_time, status, assignment_role)
             VALUES ($1, $2, $3, $4, 'scheduled', $5)
             RETURNING *`,
            [caseId, vehicle_id, assignedDriver, calculatedPickupTime, (assignment_role || null)]
        );

        await client.query(
            'UPDATE vehicles SET available = false WHERE id = $1',
            [vehicle_id]
        );
        console.log(`🚗 Vehicle ${vehicle_id} marked as unavailable`);

        await client.query('COMMIT');

        console.log(`✅ Vehicle ${vehicle_id} assigned to case ${caseId}`);

        res.json({
            success: true,
            message: 'Vehicle assigned successfully',
            roster: rosterEntry.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error assigning vehicle:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to assign vehicle',
            details: err.message
        });
    } finally {
        client.release();
    }
};

// --- UPDATE CASE STATUS ---
exports.updateCaseStatus = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['intake', 'confirmed', 'preparation', 'scheduled', 'in_progress', 'completed', 'archived', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Enforce minimum vehicles for operational statuses
    try {
        if (['scheduled', 'in_progress'].includes(status)) {
            const caseRes = await query('SELECT plan_name FROM cases WHERE id = $1', [id]);
            const planName = (caseRes.rows[0] && caseRes.rows[0].plan_name) || '';
            const minVehicles = (planName && /premium/i.test(planName)) ? 3 : 2;
            const rosterRes = await query('SELECT COUNT(*)::int AS cnt FROM roster WHERE case_id = $1', [id]);
            const assigned = (rosterRes.rows[0] && rosterRes.rows[0].cnt) || 0;
            if (assigned < minVehicles) {
                return res.status(400).json({
                    success: false,
                    error: `Assign at least ${minVehicles} vehicle(s) before setting status to ${status}`,
                    required_min_vehicles: minVehicles,
                    assigned_vehicles: assigned
                });
            }
        }
    } catch (e) {
        console.warn('Status update precheck failed:', e.message);
    }

    try {
        if (status === 'cancelled') {
            const reason = (notes || '').trim();
            if (!reason) {
                return res.status(400).json({ success: false, error: 'Cancellation reason is required' });
            }
        }
        const caseCheck = await query('SELECT id, status, funeral_time, burial_place FROM cases WHERE id = $1', [id]);
        if (caseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const oldStatus = caseCheck.rows[0].status;
        const existingFuneralTime = caseCheck.rows[0].funeral_time;
        const existingBurialPlace = caseCheck.rows[0].burial_place;

        if (oldStatus === 'intake' && status !== 'intake') {
            const missingTime = !existingFuneralTime || String(existingFuneralTime).trim() === '';
            const missingBurial = !existingBurialPlace || String(existingBurialPlace).trim() === '';
            if (missingTime || missingBurial) {
                return res.status(400).json({
                    success: false,
                    error: 'Set funeral time and cemetery venue before changing status from intake'
                });
            }
        }

        const result = await query(
            `UPDATE cases 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *`,
            [status, id]
        );

        console.log(`✅ Case ${id} status changed: ${oldStatus} → ${status}`);

        try {
            if (oldStatus === 'intake' && status !== 'intake') {
                const already = await query(
                    "SELECT 1 FROM stock_movements WHERE case_id = $1 AND movement_type = 'sale' LIMIT 1",
                    [id]
                );
                if (already.rows.length === 0) {
                    const nameStr = String(result.rows[0]?.casket_type || '').trim();
                    const colorStr = String(result.rows[0]?.casket_colour || '').trim();
                    if (nameStr) {
                        let inv;
                        if (colorStr) {
                            inv = await query(
                                "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(name) = UPPER($1) AND (color IS NULL OR UPPER(color) = UPPER($2)) ORDER BY stock_quantity DESC LIMIT 1",
                                [nameStr, colorStr]
                            );
                        } else {
                            inv = await query(
                                "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(name) = UPPER($1) ORDER BY stock_quantity DESC LIMIT 1",
                                [nameStr]
                            );
                        }
                        if (inv.rows.length === 0) {
                            let fallback;
                            if (colorStr) {
                                fallback = await query(
                                    "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(model) = UPPER($1) AND (color IS NULL OR UPPER(color) = UPPER($2)) ORDER BY stock_quantity DESC LIMIT 1",
                                    [nameStr, colorStr]
                                );
                            } else {
                                fallback = await query(
                                    "SELECT id, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(model) = UPPER($1) ORDER BY stock_quantity DESC LIMIT 1",
                                    [nameStr]
                                );
                            }
                            inv = fallback;
                        }
                        if (inv.rows.length) {
                            const item = inv.rows[0];
                            const previous = item.stock_quantity || 0;
                            const nextQty = previous > 0 ? previous - 1 : 0;
                            await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [nextQty, item.id]);
                            try {
                                await query(
                                    `INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                                    [item.id, id, 'sale', -1, previous, nextQty, 'Auto-logged on intake exit', (req.user?.email) || 'system']
                                );
                            } catch (_) { }
                        }
                    }
                }
            }
        } catch (_) { }

        try {
            await query(
                `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    req.user?.id || null,
                    req.user?.email || null,
                    'case_status_change',
                    'case',
                    id,
                    JSON.stringify({ status: oldStatus }),
                    JSON.stringify({ status, notes: notes || null }),
                    req.ip,
                    req.headers['user-agent']
                ]
            );
        } catch (e) {
            console.warn('Audit log failed (case status):', e.message);
        }

        res.json({
            success: true,
            message: `Status updated from ${oldStatus} to ${status}`,
            case: result.rows[0]
        });

    } catch (err) {
        console.error('❌ Error updating case status:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update case status',
            details: err.message
        });
    }
};

// --- UPDATE FUNERAL TIME ---
exports.updateFuneralTime = async (req, res) => {
    const { id } = req.params;
    const { funeral_time, funeral_date } = req.body;

    if (!funeral_time) {
        return res.status(400).json({
            success: false,
            error: 'funeral_time is required'
        });
    }

    try {
        const caseCheck = await query('SELECT id, status FROM cases WHERE id = $1', [id]);
        if (caseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const currentStatus = caseCheck.rows[0].status;
        const isAdmin = req.user && String(req.user.role).toLowerCase() === 'admin';
        if (currentStatus !== 'intake' && !isAdmin) {
            return res.status(400).json({
                success: false,
                error: `Cannot update funeral time. Case status is "${currentStatus}". Funeral time can only be changed when status is "intake".`
            });
        }

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (funeral_date) {
            updateFields.push(`funeral_date = $${paramIndex++}`);
            updateValues.push(funeral_date);
        }

        updateFields.push(`funeral_time = $${paramIndex++}`);
        updateValues.push(funeral_time);

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        const result = await query(
            `UPDATE cases 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            updateValues
        );

        console.log(`✅ Case ${id} funeral time updated: ${funeral_time}`);

        res.json({
            success: true,
            message: 'Funeral time updated successfully',
            case: result.rows[0]
        });

    } catch (err) {
        console.error('❌ Error updating funeral time:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update funeral time',
            details: err.message
        });
    }
};

exports.updateCaseVenue = async (req, res) => {
    const { id } = req.params;
    const { venue_name, venue_address, venue_lat, venue_lng, burial_place } = req.body || {};

    try {
        const caseCheck = await query('SELECT id, venue_name, venue_address, venue_lat, venue_lng, burial_place FROM cases WHERE id = $1', [id]);
        if (caseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const oldValues = caseCheck.rows[0];

        const fields = [];
        const values = [];
        let idx = 1;
        if (venue_name != null) { fields.push(`venue_name = $${idx++}`); values.push(String(venue_name)); }
        if (venue_address != null) { fields.push(`venue_address = $${idx++}`); values.push(String(venue_address)); }
        if (venue_lat != null) { fields.push(`venue_lat = $${idx++}`); values.push(String(venue_lat)); }
        if (venue_lng != null) { fields.push(`venue_lng = $${idx++}`); values.push(String(venue_lng)); }
        if (burial_place != null) { fields.push(`burial_place = $${idx++}`); values.push(String(burial_place)); }
        fields.push('updated_at = NOW()');
        values.push(id);

        if (values.length <= 1) {
            return res.status(400).json({ success: false, error: 'No valid fields to update' });
        }

        const result = await query(
            `UPDATE cases SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        try {
            await query(
                `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    req.user?.id || null,
                    req.user?.email || null,
                    'case_venue_update',
                    'case',
                    id,
                    JSON.stringify(oldValues),
                    JSON.stringify({ venue_name, venue_address, venue_lat, venue_lng, burial_place }),
                    req.ip,
                    req.headers['user-agent']
                ]
            );
        } catch (e) { }

        res.json({ success: true, case: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDuplicateCases = async (req, res) => {
    try {
        const dupByDeceasedId = await query(`
            SELECT deceased_id AS key, ARRAY_AGG(id ORDER BY created_at DESC) AS case_ids
            FROM cases
            WHERE deceased_id IS NOT NULL AND deceased_id <> ''
            GROUP BY deceased_id
            HAVING COUNT(*) > 1
        `);
        const dupByPolicy = await query(`
            SELECT UPPER(REGEXP_REPLACE(COALESCE(policy_number,''),'\\s+','', 'g')) AS key, ARRAY_AGG(id ORDER BY created_at DESC) AS case_ids
            FROM cases
            WHERE COALESCE(policy_number,'') <> ''
            GROUP BY UPPER(REGEXP_REPLACE(COALESCE(policy_number,''),'\\s+','', 'g'))
            HAVING COUNT(*) > 1
        `);
        const dupByNameContact = await query(`
            SELECT LOWER(deceased_name) AS name_key, nok_contact AS contact_key, ARRAY_AGG(id ORDER BY created_at DESC) AS case_ids
            FROM cases
            WHERE deceased_name IS NOT NULL AND nok_contact IS NOT NULL AND nok_contact <> ''
            GROUP BY LOWER(deceased_name), nok_contact
            HAVING COUNT(*) > 1
        `);

        const groups = [];
        for (const row of dupByDeceasedId.rows || []) {
            const ids = row.case_ids || [];
            const cases = await query('SELECT * FROM cases WHERE id = ANY($1) ORDER BY created_at DESC', [ids]);
            groups.push({ type: 'deceased_id', key: row.key, cases: cases.rows || [] });
        }
        for (const row of dupByPolicy.rows || []) {
            const ids = row.case_ids || [];
            const cases = await query('SELECT * FROM cases WHERE id = ANY($1) ORDER BY created_at DESC', [ids]);
            groups.push({ type: 'policy_number', key: row.key, cases: cases.rows || [] });
        }
        for (const row of dupByNameContact.rows || []) {
            const ids = row.case_ids || [];
            const cases = await query('SELECT * FROM cases WHERE id = ANY($1) ORDER BY created_at DESC', [ids]);
            groups.push({ type: 'name_contact', key: `${row.name_key}|${row.contact_key}`, cases: cases.rows || [] });
        }

        res.json({ success: true, groups });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch duplicate cases', details: err.message });
    }
};

exports.mergeCases = async (req, res) => {
    const { survivor_id, duplicate_ids } = req.body || {};
    if (!survivor_id || !Array.isArray(duplicate_ids) || duplicate_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'survivor_id and duplicate_ids are required' });
    }
    const dedupIds = Array.from(new Set(duplicate_ids.map(id => parseInt(id, 10)).filter(id => Number.isInteger(id)))).filter(id => id !== parseInt(survivor_id, 10));
    if (dedupIds.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid duplicate ids provided' });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const survivor = await client.query('SELECT * FROM cases WHERE id = $1', [survivor_id]);
        if (survivor.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Survivor case not found' });
        }

        const dups = await client.query('SELECT id FROM cases WHERE id = ANY($1)', [dedupIds]);
        if (dups.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Duplicate cases not found' });
        }

        await client.query('UPDATE roster SET case_id = $1 WHERE case_id = ANY($2)', [survivor_id, dedupIds]);
        await client.query('UPDATE stock_movements SET case_id = $1 WHERE case_id = ANY($2)', [survivor_id, dedupIds]);
        await client.query("UPDATE audit_log SET resource_id = $1 WHERE resource_type = 'case' AND resource_id = ANY($2)", [survivor_id, dedupIds]);

        await client.query('UPDATE cases SET status = $1, updated_at = NOW() WHERE id = ANY($2)', ['archived', dedupIds]);

        try {
            await client.query(
                `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    req.user?.id || null,
                    req.user?.email || null,
                    'merge_cases',
                    'case',
                    survivor_id,
                    JSON.stringify({ merged_from: dedupIds }),
                    JSON.stringify({ survivor_id }),
                    req.ip,
                    req.headers['user-agent']
                ]
            );
        } catch (_) { }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cases merged', survivor_id, archived_ids: dedupIds });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: 'Failed to merge cases', details: err.message });
    } finally {
        client.release();
    }
};

exports.autoMergeDuplicates = async (req, res) => {
    try {
        const dupByDeceasedId = await query(`
            SELECT deceased_id AS key, ARRAY_AGG(id ORDER BY created_at DESC) AS case_ids
            FROM cases
            WHERE deceased_id IS NOT NULL AND deceased_id <> ''
            GROUP BY deceased_id
            HAVING COUNT(*) > 1
        `);
        const dupByPolicy = await query(`
            SELECT UPPER(REGEXP_REPLACE(COALESCE(policy_number,''),'\\s+','', 'g')) AS key, ARRAY_AGG(id ORDER BY created_at DESC) AS case_ids
            FROM cases
            WHERE COALESCE(policy_number,'') <> ''
            GROUP BY UPPER(REGEXP_REPLACE(COALESCE(policy_number,''),'\\s+','', 'g'))
            HAVING COUNT(*) > 1
        `);
        const dupByNameContact = await query(`
            SELECT LOWER(deceased_name) AS name_key, nok_contact AS contact_key, ARRAY_AGG(id ORDER BY created_at DESC) AS case_ids
            FROM cases
            WHERE deceased_name IS NOT NULL AND nok_contact IS NOT NULL AND nok_contact <> ''
            GROUP BY LOWER(deceased_name), nok_contact
            HAVING COUNT(*) > 1
        `);

        const groups = [];
        const all = [];
        for (const row of dupByDeceasedId.rows || []) { all.push({ type: 'deceased_id', key: row.key, ids: row.case_ids || [] }); }
        for (const row of dupByPolicy.rows || []) { all.push({ type: 'policy_number', key: row.key, ids: row.case_ids || [] }); }
        for (const row of dupByNameContact.rows || []) { all.push({ type: 'name_contact', key: `${row.name_key}|${row.contact_key}`, ids: row.case_ids || [] }); }

        const client = await getClient();
        try {
            for (const g of all) {
                const resCases = await client.query('SELECT * FROM cases WHERE id = ANY($1) ORDER BY created_at DESC', [g.ids]);
                const rows = resCases.rows || [];
                if (rows.length < 2) continue;

                const present = v => {
                    if (v == null) return false;
                    if (typeof v === 'string') return String(v).trim() !== '';
                    return true;
                };
                const score = c => {
                    let s = 0;
                    const base = [
                        c.deceased_id, c.case_number, c.policy_number, c.deceased_name,
                        c.nok_name, c.nok_contact, c.plan_category, c.plan_name, c.plan_members, c.plan_age_bracket,
                        c.funeral_date, c.service_date, c.service_time, c.church_date, c.church_time,
                        c.cleansing_date, c.cleansing_time, c.venue_name, c.venue_address, c.venue_lat, c.venue_lng,
                        c.service_type, c.total_price, c.casket_type, c.casket_colour, c.delivery_date, c.delivery_time,
                        c.intake_day, c.programs, c.top_up_amount, c.airtime, c.airtime_network, c.airtime_number,
                        c.cover_amount, c.cashback_amount, c.amount_to_bank, c.legacy_plan_name, c.benefit_mode, c.burial_place
                    ];
                    for (const f of base) { if (present(f)) s += 1; }
                    if (present(c.funeral_time)) s += 2;
                    if (present(c.burial_place)) s += 2;
                    if (present(c.delivery_date)) s += 2;
                    if (present(c.delivery_time)) s += 2;
                    if (present(c.venue_name)) s += 2;
                    if (present(c.casket_type)) s += 2;
                    return s;
                };

                const notCancelled = rows.filter(r => String(r.status || '').toLowerCase() !== 'cancelled');
                const pool = notCancelled.length ? notCancelled : rows;
                let survivor = pool[0];
                let best = score(survivor);
                for (const r of pool.slice(1)) {
                    const sc = score(r);
                    const survCreated = survivor.created_at ? new Date(survivor.created_at) : new Date(0);
                    const rCreated = r.created_at ? new Date(r.created_at) : new Date(0);
                    if (sc > best || (sc === best && rCreated > survCreated)) {
                        survivor = r; best = sc;
                    }
                }

                const survivor_id = survivor.id;
                const duplicate_ids = rows.map(r => r.id).filter(id => id !== survivor_id);
                if (duplicate_ids.length === 0) continue;

                await client.query('BEGIN');
                await client.query('UPDATE roster SET case_id = $1 WHERE case_id = ANY($2)', [survivor_id, duplicate_ids]);
                await client.query('UPDATE stock_movements SET case_id = $1 WHERE case_id = ANY($2)', [survivor_id, duplicate_ids]);
                await client.query("UPDATE audit_log SET resource_id = $1 WHERE resource_type = 'case' AND resource_id = ANY($2)", [survivor_id, duplicate_ids]);
                await client.query('UPDATE cases SET status = $1, updated_at = NOW() WHERE id = ANY($2)', ['archived', duplicate_ids]);
                try {
                    await client.query(
                        `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            req.user?.id || null,
                            req.user?.email || null,
                            'auto_merge_cases',
                            'case',
                            survivor_id,
                            JSON.stringify({ merged_from: duplicate_ids, group_type: g.type, group_key: g.key }),
                            JSON.stringify({ survivor_id }),
                            req.ip,
                            req.headers['user-agent']
                        ]
                    );
                } catch (_) { }
                await client.query('COMMIT');

                groups.push({ type: g.type, key: g.key, survivor_id, archived_ids: duplicate_ids });
            }

            res.json({ success: true, merged: groups });
        } catch (err) {
            try { await client.query('ROLLBACK'); } catch (_) { }
            res.status(500).json({ success: false, error: 'Failed auto-merge', details: err.message });
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to prepare auto-merge', details: err.message });
    }
};

// --- GET SINGLE CASE ---
exports.getCaseById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query('SELECT * FROM cases WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Case not found'
            });
        }

        res.json({ success: true, case: result.rows[0] });
    } catch (err) {
        console.error('Error fetching case:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch case',
            details: err.message
        });
    }
};

exports.getCaseAuditLog = async (req, res) => {
    const { id } = req.params;
    try {
        const caseCheck = await query('SELECT id FROM cases WHERE id = $1', [id]);
        if (caseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }
        const result = await query(
            `SELECT id, user_id, user_email, action, old_values, new_values, ip_address, user_agent
       FROM audit_log
       WHERE resource_type = 'case' AND resource_id = $1 AND action = 'case_status_change'
       ORDER BY id DESC`,
            [id]
        );
        const logs = result.rows.map(row => {
            let notes = null;
            try {
                const nv = typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values;
                notes = nv?.notes || null;
            } catch (e) { }
            return { id: row.id, user_id: row.user_id, user_email: row.user_email, action: row.action, old_values: row.old_values, new_values: row.new_values, notes };
        });
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
    }
};

exports.getCancelledCases = async (req, res) => {
    try {
        const supabase = req.app?.locals?.supabase;
        if (supabase) {
            const { data, error } = await supabase
                .from('cases')
                .select('*')
                .eq('status', 'cancelled')
                .order('updated_at', { ascending: false });
            if (error) {
                console.warn('⚠️ Supabase read failed in getCancelledCases, falling back to DB:', error.message);
            } else {
                return res.json({ success: true, cases: Array.isArray(data) ? data : [] });
            }
        }
        const result = await query(
            `SELECT * FROM cases WHERE status = 'cancelled' ORDER BY updated_at DESC`
        );
        res.json({ success: true, cases: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch cancelled cases' });
    }
};
