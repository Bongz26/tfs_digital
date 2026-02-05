const { query, getClient } = require('../config/db');
const { notifyCasketUsage, maybeNotifyLowStock } = require('./inventoryController');

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

        const supabase = req.app.locals.supabase;
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        let found = null;

        if (!found && idVal) {
            const { data } = await supabase
                .from('cases')
                .select('*')
                .eq('deceased_id', idVal)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            found = data;
        }

        if (!found && caseNo) {
            const { data } = await supabase
                .from('cases')
                .select('*')
                .eq('case_number', caseNo)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            found = data;
        }

        if (!found && policyNo) {
            const { data } = await supabase
                .from('cases')
                .select('*')
                .eq('policy_number', policyNo)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            found = data;
        }

        if (!found && nameVal && contactVal) {
            const { data } = await supabase
                .from('cases')
                .select('*')
                .ilike('deceased_name', nameVal)
                .eq('nok_contact', contactVal)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            found = data;
        }

        if (!found) {
            return res.json({ success: true, case: null });
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
// --- CREATE NEW CASE ---
exports.createCase = async (req, res) => {
    console.log('📥 [POST /api/cases] Request received at', new Date().toISOString());

    const supabase = req.app.locals.supabase;
    if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured' });
    }

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
        programs, top_up_amount, top_up_type, top_up_reference, airtime, airtime_network, airtime_number,
        cover_amount, cashback_amount, amount_to_bank,
        legacy_plan_name,
        branch,
        tombstone_type,
        collection_type,
        collection_note,
        is_yard_burial
    } = req.body;

    let { status, burial_place } = req.body;

    try {
        if (!intake_day) {
            return res.status(400).json({ success: false, error: 'Intake day is required' });
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

        if (!delivery_date || !delivery_time) {
            return res.status(400).json({ success: false, error: 'Delivery date and time are required' });
        }

        let finalCaseNumber = case_number;
        if (!finalCaseNumber) {
            const year = new Date().getFullYear();
            const pattern = `THS-${year}-%`;

            const { data: maxCase } = await supabase
                .from('cases')
                .select('case_number')
                .like('case_number', pattern)
                .order('case_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            let nextNumber = 1;
            if (maxCase && maxCase.case_number) {
                const match = maxCase.case_number.match(/THS-\d{4}-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            finalCaseNumber = `THS-${year}-${String(nextNumber).padStart(3, '0')}`;
            console.log('🔢 [POST /api/cases] Generated case_number:', finalCaseNumber);
        }

        console.log('🔍 [POST /api/cases] Attempting to insert case with case_number:', finalCaseNumber);

        // DUPLICATE CHECK
        try {
            const idKey = String(deceased_id || '').trim();
            const polKey = String(policy_number || '').trim();
            const nameKey = String(deceased_name || '').trim();
            const contactKey = String(nok_contact || '').trim();

            let dup = null;

            if (idKey && polKey) {
                const { data: candidates } = await supabase
                    .from('cases')
                    .select('*')
                    .eq('deceased_id', idKey)
                    .neq('status', 'cancelled')
                    .order('created_at', { ascending: false });

                if (candidates && candidates.length > 0) {
                    const normPol = polKey.replace(/\s+/g, '').toUpperCase();
                    dup = candidates.find(c => (c.policy_number || '').replace(/\s+/g, '').toUpperCase() === normPol);
                }
            } else if (idKey) {
                const { data: d } = await supabase
                    .from('cases')
                    .select('*')
                    .eq('deceased_id', idKey)
                    .neq('status', 'cancelled')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                dup = d;
            }

            if (!dup && nameKey && contactKey) {
                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

                const { data: d } = await supabase
                    .from('cases')
                    .select('*')
                    .ilike('deceased_name', nameKey)
                    .eq('nok_contact', contactKey)
                    .neq('status', 'cancelled')
                    .gte('created_at', sixtyDaysAgo.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                dup = d;
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

        const finalFuneralDate = service_date || funeral_date;
        const finalFuneralTime = service_time || funeral_time;

        const newCase = {
            case_number: finalCaseNumber,
            claim_date: claim_date || null,
            policy_number: policy_number || null,
            deceased_name,
            deceased_id: deceased_id || null,
            nok_name,
            nok_contact,
            nok_relation: nok_relation || null,
            plan_category: plan_category || null,
            plan_name: plan_name || null,
            plan_members: plan_members || null,
            plan_age_bracket: plan_age_bracket || null,
            funeral_date: finalFuneralDate,
            funeral_time: finalFuneralTime || null,
            service_date: service_date || null,
            service_time: service_time || null,
            church_date: church_date || null,
            church_time: church_time || null,
            cleansing_date: cleansing_date || null,
            cleansing_time: cleansing_time || null,
            venue_name: venue_name || null,
            venue_address: venue_address || null,
            venue_lat: venue_lat || null,
            venue_lng: venue_lng || null,
            requires_cow: !!requires_cow,
            requires_sheep: !!requires_sheep,
            requires_tombstone: !!requires_tombstone,
            requires_catering: !!requires_catering,
            requires_grocery: !!requires_grocery,
            requires_bus: !!requires_bus,
            service_type: service_type || null,
            total_price: total_price != null ? total_price : 0,
            casket_type: casket_type || null,
            casket_colour: casket_colour || null,
            delivery_date: delivery_date || null,
            delivery_time: delivery_time || null,
            intake_day,
            programs: programs != null ? programs : 0,
            top_up_amount: top_up_amount != null ? top_up_amount : 0,
            top_up_type: top_up_type || 'cash',
            top_up_reference: top_up_reference || null,
            airtime: !!airtime,
            airtime_network: airtime_network || null,
            airtime_number: airtime_number || null,
            cover_amount: cover_amount != null ? cover_amount : 0,
            cashback_amount: cashback_amount != null ? cashback_amount : 0,
            amount_to_bank: amount_to_bank != null ? amount_to_bank : 0,
            legacy_plan_name: legacy_plan_name || null,
            benefit_mode: benefit_mode || null,
            status: status || 'confirmed',
            burial_place: burial_place || null,
            branch: branch || 'Head Office',
            tombstone_type: tombstone_type || null,
            collection_type: collection_type || 'vehicle',
            collection_note: collection_note || null,
            is_yard_burial: !!is_yard_burial
        };

        const { data: created, error: insertError } = await supabase
            .from('cases')
            .insert([newCase])
            .select()
            .single();

        if (insertError) throw insertError;

        console.log('✅ [POST /api/cases] Case created successfully:', created.id, created.case_number);

        // STOCK DEDUCTION LOGIC - Using atomic function to prevent race conditions
        try {
            const nameStr = String(casket_type || '').trim();
            const colorStr = String(casket_colour || '').trim();
            if (nameStr) {
                const selectedBranch = (branch || 'Head Office').trim();
                let locationsToCheck = [selectedBranch];
                if (selectedBranch === 'Head Office') {
                    locationsToCheck = ['HQ Storeroom & showroom', 'Manekeng', 'Manekeng Showroom'];
                }

                let invItem = null;
                let targetLoc = selectedBranch;

                // Try locations in preference order
                for (const loc of locationsToCheck) {
                    targetLoc = loc;
                    // Find by Name + Location
                    let query = supabase.from('inventory')
                        .select('id, stock_quantity, name, model, color, location')
                        .eq('category', 'coffin')
                        .eq('location', loc)
                        .ilike('name', nameStr)
                        .order('stock_quantity', { ascending: false });

                    const { data: matches } = await query;

                    if (matches && matches.length > 0) {
                        if (colorStr) {
                            invItem = matches.find(i => !i.color || i.color.toLowerCase() === colorStr.toLowerCase());
                        } else {
                            invItem = matches[0];
                        }
                    }

                    if (!invItem) {
                        // Fallback: Model + Location
                        const { data: modelMatches } = await supabase.from('inventory')
                            .select('id, stock_quantity, name, model, color, location')
                            .eq('category', 'coffin')
                            .eq('location', loc)
                            .ilike('model', nameStr)
                            .order('stock_quantity', { ascending: false });

                        if (modelMatches && modelMatches.length > 0) {
                            if (colorStr) {
                                invItem = modelMatches.find(i => !i.color || i.color.toLowerCase() === colorStr.toLowerCase());
                            } else {
                                invItem = modelMatches[0];
                            }
                        }
                    }

                    if (invItem) break;
                }

                if (invItem) {
                    // Use atomic RESERVE function
                    const { reserveStock } = require('../utils/dbUtils');

                    try {
                        const result = await reserveStock(
                            invItem.id,
                            1,
                            req.user?.email || 'system',
                            `Case reservation: ${created.case_number}`
                        );

                        if (!result.success) {
                            created.stock_warning = result.message;
                            console.warn(`⚠️ Reservation warning: ${result.message}`);
                        } else {
                            console.log(`✅ Stock RESERVED: ${nameStr} at ${targetLoc}, reserved: ${result.new_reserved}`);
                        }

                    } catch (stockErr) {
                        console.error('❌ Atomic stock reservation failed:', stockErr.message);
                        created.stock_warning = `Failed to reserve stock: ${stockErr.message}`;
                    }

                } else {
                    created.stock_warning = `Stock item '${nameStr}' not found in inventory for ${selectedBranch}. Please add it to stock.`;
                    console.warn(`⚠️ Stock item '${nameStr}' not found at ${selectedBranch} for case ${created.case_number}`);
                }
            }
        } catch (e) {
            console.warn('Error handling stock deduction:', e);
            created.stock_warning = 'Failed to process stock deduction.';
        }

        // Low stock alerts
        try {
            await maybeNotifyLowStock(1, supabase);
        } catch (_) { }

        // Delete draft
        try {
            if (policy_number) {
                await supabase.from('claim_drafts').delete().eq('policy_number', policy_number);
            }
        } catch (_) { }

        // Audit Log
        try {
            await supabase.from('audit_log').insert({
                user_id: req.user?.id || null,
                user_email: req.user?.email || null,
                action: 'case_create',
                resource_type: 'case',
                resource_id: created.id,
                old_values: null,
                new_values: req.body,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });
        } catch (e) { console.warn('Audit log create failed:', e.message); }

        res.json({ success: true, case: created });

    } catch (err) {
        console.error('❌ [POST /api/cases] Error creating case:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to create case',
            details: err.message,
            code: err.code
        });
    }
};

// --- ASSIGN VEHICLE TO CASE ---
// --- ASSIGN VEHICLE TO CASE ---
exports.assignVehicle = async (req, res) => {
    let { caseId } = req.params;
    const {
        vehicle_id, vehicle_name,
        driver_name, pickup_time,
        is_hired, external_vehicle, assignment_role
    } = req.body;

    // Fallback if caseId is not in params but in body
    if (!caseId && req.body.caseId) {
        caseId = req.body.caseId;
    }

    console.log(`📥 assignVehicle for case ${caseId}:`, req.body);

    if (!caseId) {
        return res.status(400).json({ success: false, error: 'Case ID is required' });
    }

    if (!is_hired && !vehicle_id) {
        return res.status(400).json({ success: false, error: 'Vehicle ID is required for fleet vehicles' });
    }
    if (is_hired && !external_vehicle) {
        return res.status(400).json({ success: false, error: 'Vehicle details required for hired transport' });
    }

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        // Fetch case details
        const { data: currentCase, error: caseErr } = await supabase
            .from('cases')
            .select('id, case_number, funeral_date, funeral_time, delivery_date, delivery_time')
            .eq('id', caseId)
            .single();

        if (caseErr || !currentCase) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const { funeral_date, funeral_time, delivery_date, delivery_time } = currentCase;
        const isAdmin = req.user && String(req.user.role).toLowerCase() === 'admin';

        // Prevent multiple hearses
        if (assignment_role && assignment_role.toLowerCase() === 'hearse') {
            const { count } = await supabase
                .from('roster')
                .select('*', { count: 'exact', head: true })
                .eq('case_id', caseId)
                .ilike('assignment_role', 'hearse')
                .neq('status', 'completed');

            if (count > 0) {
                return res.status(400).json({ success: false, error: 'A hearse is already assigned to this case. Please delete the existing hearse assignment if you wish to change it.' });
            }
        }

        let calculatedPickupTime = pickup_time;

        if (delivery_date && delivery_time) {
            try {
                calculatedPickupTime = new Date(`${delivery_date}T${delivery_time}`).toISOString();
                console.log(`📅 Using delivery_time from case: ${calculatedPickupTime}`);
            } catch (err) {
                calculatedPickupTime = null;
            }
        }

        if (!calculatedPickupTime && funeral_date && funeral_time) {
            try {
                const funeralDateTime = new Date(`${funeral_date}T${funeral_time}`);
                calculatedPickupTime = new Date(funeralDateTime.getTime() - (1.5 * 60 * 60 * 1000)).toISOString();
                console.log(`📅 Calculated pickup_time: ${calculatedPickupTime}`);
            } catch (err) {
                calculatedPickupTime = pickup_time || new Date().toISOString();
            }
        } else if (!calculatedPickupTime) {
            calculatedPickupTime = pickup_time || new Date().toISOString();
        }

        // Check for existing assignment for this vehicle on this case
        let existingRoster = null;
        if (!is_hired) {
            const { data: dup } = await supabase
                .from('roster')
                .select('id, driver_name')
                .eq('case_id', caseId)
                .eq('vehicle_id', vehicle_id)
                .neq('status', 'completed')
                .maybeSingle();
            existingRoster = dup;
        }

        if (existingRoster) {
            // Updating existing assignment
            if (driver_name && driver_name !== 'TBD') {
                // Check if this NEW driver is assigned to another vehicle on THIS case
                const { data: driverCheck } = await supabase
                    .from('roster')
                    .select('id')
                    .eq('case_id', caseId)
                    .ilike('driver_name', driver_name.trim())
                    .neq('id', existingRoster.id)
                    .neq('status', 'completed');

                if (driverCheck && driverCheck.length > 0) {
                    return res.status(400).json({ success: false, error: 'This driver is already assigned to another vehicle on this case' });
                }

                // Get driver ID
                let driverId = null;
                const { data: drv } = await supabase.from('drivers').select('id').ilike('name', driver_name.trim()).maybeSingle();
                if (drv) driverId = drv.id;

                const updates = {
                    driver_name,
                    driver_id: driverId,
                    updated_at: new Date()
                };
                if (assignment_role) updates.assignment_role = assignment_role;

                const { data: updatedRow, error: upErr } = await supabase
                    .from('roster')
                    .update(updates)
                    .eq('id', existingRoster.id)
                    .select()
                    .single();

                if (upErr) throw upErr;

                return res.json({
                    success: true,
                    message: 'Updated existing vehicle assignment with new driver',
                    roster: updatedRow
                });

            } else {
                return res.json({
                    success: true,
                    message: 'Vehicle already assigned',
                    roster: existingRoster
                });
            }
        }

        // New Assignment Checks
        if (driver_name && driver_name !== 'TBD') {
            // 1. Check if driver is already on this case
            const { count: dupDriver } = await supabase
                .from('roster')
                .select('*', { count: 'exact', head: true })
                .eq('case_id', caseId)
                .ilike('driver_name', driver_name.trim())
                .neq('status', 'completed');

            if (dupDriver > 0) {
                return res.status(400).json({ success: false, error: 'This driver is already assigned to this case' });
            }

            // 2. Cross-case time conflicts for Driver
            if (funeral_date && funeral_time) {
                // Fetch other assignments for this driver on the same day via join
                const { data: driverConflicts } = await supabase
                    .from('roster')
                    .select(`
                        case_id,
                        cases!inner (case_number, deceased_name, funeral_date, funeral_time)
                    `)
                    .ilike('driver_name', driver_name.trim())
                    .neq('case_id', caseId)
                    .neq('status', 'completed')
                    .eq('cases.funeral_date', funeral_date);

                if (driverConflicts && driverConflicts.length > 0) {
                    const MIN_GAP_HOURS = 1.5;
                    const currentTime = new Date(`${funeral_date}T${funeral_time}`);

                    for (const item of driverConflicts) {
                        const c = item.cases;
                        if (c && c.funeral_time) {
                            const conflictTime = new Date(`${c.funeral_date}T${c.funeral_time}`);
                            const diffHrs = Math.abs(currentTime - conflictTime) / (1000 * 60 * 60);

                            if (diffHrs < MIN_GAP_HOURS && !isAdmin) {
                                return res.status(400).json({
                                    success: false,
                                    error: `Driver time conflict: ${driver_name} is already assigned to ${c.case_number} (${c.deceased_name}) at ${c.funeral_time}. Services must be at least 1.5 hours apart.`
                                });
                            }
                        }
                    }
                }
            }
        }

        // Vehicle Cross-case Time Conflict
        if (funeral_date && !is_hired && vehicle_id) {
            const { data: vehicleConflicts } = await supabase
                .from('roster')
                .select(`
                    case_id,
                    cases!inner (case_number, deceased_name, funeral_date, funeral_time)
                `)
                .eq('vehicle_id', vehicle_id)
                .neq('case_id', caseId)
                .neq('status', 'completed')
                .eq('cases.funeral_date', funeral_date);

            if (vehicleConflicts && vehicleConflicts.length > 0) {
                const MIN_GAP_HOURS = 1.5;

                if (funeral_time) {
                    const currentTime = new Date(`${funeral_date}T${funeral_time}`);
                    for (const item of vehicleConflicts) {
                        const c = item.cases;
                        let isConflict = false;
                        if (c.funeral_time) {
                            const otherTime = new Date(`${c.funeral_date}T${c.funeral_time}`);
                            const diffHrs = Math.abs(currentTime - otherTime) / (1000 * 60 * 60);
                            if (diffHrs < MIN_GAP_HOURS) isConflict = true;
                        } else {
                            isConflict = true; // All day block
                        }

                        if (isConflict && !isAdmin) {
                            return res.status(400).json({
                                success: false,
                                error: `Time conflict: Vehicle is already assigned to ${c.case_number} (${c.deceased_name}).`,
                                conflict: {
                                    case_number: c.case_number,
                                    deceased_name: c.deceased_name,
                                    time: c.funeral_time
                                }
                            });
                        }
                    }
                } else {
                    // No time on current case -> conflict if any other assignment exists involving specific time or not
                    const hasTimed = vehicleConflicts.some(v => v.cases && v.cases.funeral_time);
                    if (hasTimed && !isAdmin) {
                        return res.status(400).json({
                            success: false,
                            error: `Vehicle is assigned to other case(s) on the same day. Please set a funeral time first.`
                        });
                    }
                }
            }
        }

        // Insert Roster Entry
        const assignedDriver = (driver_name && driver_name.trim()) || 'TBD';
        let driverId = null;
        if (!is_hired && assignedDriver !== 'TBD') {
            const { data: drv } = await supabase.from('drivers').select('id').ilike('name', assignedDriver).maybeSingle();
            if (drv) driverId = drv.id;
        }

        const newRoster = {
            case_id: caseId,
            vehicle_id: is_hired ? null : vehicle_id,
            driver_name: assignedDriver,
            driver_id: driverId,
            pickup_time: calculatedPickupTime,
            status: 'scheduled',
            assignment_role: assignment_role || null,
            external_vehicle: is_hired ? external_vehicle : null
        };

        const { data: rosterEntry, error: insertErr } = await supabase
            .from('roster')
            .insert(newRoster)
            .select()
            .single();

        if (insertErr) throw insertErr;

        if (!is_hired && vehicle_id) {
            try {
                await supabase.from('vehicles').update({ available: false }).eq('id', vehicle_id);
            } catch (_) { }
        }

        console.log(`✅ Vehicle ${vehicle_id || 'External'} assigned to case ${caseId}`);
        res.json({
            success: true,
            message: 'Vehicle assigned successfully',
            roster: rosterEntry
        });

    } catch (err) {
        console.error('❌ Error assigning vehicle:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to assign vehicle',
            details: err.message
        });
    }
};

// --- UPDATE CASE STATUS ---
exports.updateCaseStatus = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    console.log(`📥 updateCaseStatus for case ${id}: to ${status}`);
    const validStatuses = ['intake', 'confirmed', 'preparation', 'scheduled', 'in_progress', 'completed', 'archived', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const supabase = req.app.locals.supabase;
    if (!supabase) {
        return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Enforce minimum vehicles for operational statuses
    try {
        if (['scheduled', 'in_progress'].includes(status)) {
            const { data: caseRes } = await supabase
                .from('cases')
                .select('plan_name, is_yard_burial')
                .eq('id', id)
                .single();

            const planName = (caseRes && caseRes.plan_name) || '';
            const isYardBurial = (caseRes && caseRes.is_yard_burial) || false;

            // Logic: In-Yard Burial only needs 1 vehicle. Standard needs 2. Premium needs 3.
            let minVehicles = (planName && /premium/i.test(planName)) ? 3 : 2;
            if (isYardBurial) {
                minVehicles = 1;
            }

            const { count: assigned, error: countErr } = await supabase
                .from('roster')
                .select('*', { count: 'exact', head: true })
                .eq('case_id', id);

            console.log(`🔍 Vehicle Check: assigned=${assigned}, minNeeded=${minVehicles}, isYard=${isYardBurial}`);

            if (!countErr && assigned < minVehicles) {
                console.warn(`⚠️ Vehicle Check failed for case ${id}`);
                return res.status(400).json({
                    success: false,
                    error: `Assign at least ${minVehicles} vehicle(s) before setting status to ${status}${isYardBurial ? ' (Small Service/Yard Burial logic applied)' : ''}`,
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

        const { data: caseCheck, error: fetchErr } = await supabase
            .from('cases')
            .select('id, status, funeral_time, burial_place, is_yard_burial, casket_type, casket_colour')
            .eq('id', id)
            .single();

        if (fetchErr || !caseCheck) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const oldStatus = caseCheck.status;
        const existingFuneralTime = caseCheck.funeral_time;
        const existingBurialPlace = caseCheck.burial_place;
        const isYard = caseCheck.is_yard_burial;

        if (oldStatus === 'intake' && status !== 'intake') {
            // Relaxed check: Yard burials don't STRICTLY require these to move to 'confirmed'
            const missingTime = !isYard && (!existingFuneralTime || String(existingFuneralTime).trim() === '');
            const missingBurial = !isYard && (!existingBurialPlace || String(existingBurialPlace).trim() === '');

            if (missingTime || missingBurial) {
                const msg = missingTime && missingBurial
                    ? 'funeral time and burial place'
                    : missingTime ? 'funeral time' : 'burial place';

                console.warn(`⚠️ Status update rejected for case ${id}: Missing ${msg}`);
                return res.status(400).json({
                    success: false,
                    error: `Please set ${msg} before moving from intake. (Or toggle "Yard" burial type)`,
                    details: { missingTime, missingBurial, isYard }
                });
            }
        }

        const { data: updatedCase, error: updateErr } = await supabase
            .from('cases')
            .update({ status, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        console.log(`✅ Case ${id} status changed: ${oldStatus} → ${status}`);

        // NEW RESERVATION LOGIC
        try {
            const { commitStock, releaseStock } = require('../utils/dbUtils');
            const userEmail = req.user?.email || 'system';

            // 1. COMMIT STOCK (Finalized/Completed)
            if (status === 'completed' && oldStatus !== 'completed') {
                const nameStr = String(updatedCase.casket_type || '').trim();
                const colorStr = String(updatedCase.casket_colour || '').trim();

                if (nameStr) {
                    let invData = null;
                    // Try finding by name first
                    const { data: nameMatches } = await supabase
                        .from('inventory')
                        .select('id, stock_quantity, reserved_quantity, name, model, color')
                        .eq('category', 'coffin')
                        .ilike('name', nameStr)
                        .order('stock_quantity', { ascending: false });

                    if (nameMatches && nameMatches.length > 0) {
                        if (colorStr) {
                            invData = nameMatches.find(i => !i.color || i.color.toLowerCase() === colorStr.toLowerCase());
                        } else {
                            invData = nameMatches[0];
                        }
                    }

                    // Fallback to model if not found
                    if (!invData) {
                        const { data: modelMatches } = await supabase
                            .from('inventory')
                            .select('id, stock_quantity, reserved_quantity, name, model, color')
                            .eq('category', 'coffin')
                            .ilike('model', nameStr)
                            .order('stock_quantity', { ascending: false });

                        if (modelMatches && modelMatches.length > 0) {
                            if (colorStr) {
                                invData = modelMatches.find(i => !i.color || i.color.toLowerCase() === colorStr.toLowerCase());
                            } else {
                                invData = modelMatches[0];
                            }
                        }
                    }

                    if (invData) {
                        try {
                            const result = await commitStock(invData.id, 1, id, userEmail, `Case Completed: ${updatedCase.case_number}`);
                            console.log(`✅ Stock COMMITTED for case ${id}: ${result.message}`);
                        } catch (commitErr) {
                            console.error('❌ Stock commit failed:', commitErr.message);
                        }
                    } else {
                        console.warn(`⚠️ Could not find inventory item '${nameStr}' to commit for case ${id}`);
                    }
                }
            }

            // 2. RELEASE STOCK (Cancelled)
            else if (status === 'cancelled' && oldStatus !== 'cancelled') {
                const nameStr = String(updatedCase.casket_type || '').trim();
                const colorStr = String(updatedCase.casket_colour || '').trim();

                if (nameStr) {
                    let invData = null;
                    // Lookup logic (Identical to above - ideally refactored)
                    const { data: nameMatches } = await supabase
                        .from('inventory')
                        .select('id, stock_quantity, reserved_quantity, name, model, color')
                        .eq('category', 'coffin')
                        .ilike('name', nameStr)
                        .order('stock_quantity', { ascending: false });

                    if (nameMatches && nameMatches.length > 0) {
                        if (colorStr) {
                            invData = nameMatches.find(i => !i.color || i.color.toLowerCase() === colorStr.toLowerCase());
                        } else {
                            invData = nameMatches[0];
                        }
                    }

                    if (!invData) {
                        const { data: modelMatches } = await supabase
                            .from('inventory')
                            .select('id, stock_quantity, reserved_quantity, name, model, color')
                            .eq('category', 'coffin')
                            .ilike('model', nameStr)
                            .order('stock_quantity', { ascending: false });

                        if (modelMatches && modelMatches.length > 0) {
                            if (colorStr) {
                                invData = modelMatches.find(i => !i.color || i.color.toLowerCase() === colorStr.toLowerCase());
                            } else {
                                invData = modelMatches[0];
                            }
                        }
                    }

                    if (invData) {
                        try {
                            const result = await releaseStock(invData.id, 1, userEmail, `Case Cancelled: ${updatedCase.case_number}`);
                            console.log(`✅ Stock RELEASED for case ${id}: ${result.message}`);
                        } catch (releaseErr) {
                            console.error('❌ Stock release failed:', releaseErr.message);
                        }
                    }
                }
            }

        } catch (e) {
            console.error('Error in status update reservation logic:', e);
        }

        try {
            await supabase.from('audit_log').insert({
                user_id: req.user?.id || null,
                user_email: req.user?.email || null,
                action: 'case_status_change',
                resource_type: 'case',
                resource_id: id,
                old_values: { status: oldStatus },
                new_values: { status, notes: notes || null },
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });
        } catch (e) {
            console.warn('Audit log failed (case status):', e.message);
        }

        res.json({
            success: true,
            message: `Status updated from ${oldStatus} to ${status}`,
            case: updatedCase
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

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: caseCheck } = await supabase
            .from('cases')
            .select('id, status')
            .eq('id', id)
            .single();

        if (!caseCheck) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const currentStatus = caseCheck.status;
        const isAdmin = req.user && String(req.user.role).toLowerCase() === 'admin';
        if (currentStatus !== 'intake' && !isAdmin) {
            return res.status(400).json({
                success: false,
                error: `Cannot update funeral time. Case status is "${currentStatus}". Funeral time can only be changed when status is "intake".`
            });
        }

        const updateData = {
            funeral_time,
            updated_at: new Date()
        };

        if (funeral_date) {
            updateData.funeral_date = funeral_date;
        }

        const { data: updated, error } = await supabase
            .from('cases')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ Case ${id} funeral time updated: ${funeral_time}`);

        res.json({
            success: true,
            message: 'Funeral time updated successfully',
            case: updated
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
    const { venue_name, venue_address, venue_lat, venue_lng, burial_place, branch, is_yard_burial } = req.body || {};

    console.log(`📥 updateCaseVenue for case ${id}:`, req.body);

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: oldValues, error: fetchErr } = await supabase
            .from('cases')
            .select('venue_name, venue_address, venue_lat, venue_lng, burial_place, is_yard_burial')
            .eq('id', id)
            .single();

        if (fetchErr || !oldValues) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const updates = { updated_at: new Date() };
        if (venue_name !== undefined) updates.venue_name = String(venue_name);
        if (venue_address !== undefined) updates.venue_address = String(venue_address);
        if (venue_lat !== undefined) updates.venue_lat = String(venue_lat);
        if (venue_lng !== undefined) updates.venue_lng = String(venue_lng);
        if (burial_place !== undefined) updates.burial_place = String(burial_place);
        if (branch !== undefined) updates.branch = String(branch);
        if (is_yard_burial !== undefined) updates.is_yard_burial = is_yard_burial;

        if (Object.keys(updates).length <= 1) {
            console.warn('⚠️ updateCaseVenue: No fields to update', { body: req.body });
            return res.status(400).json({ success: false, error: 'No valid fields provided for update' });
        }

        const { data: updated, error: updateErr } = await supabase
            .from('cases')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        try {
            await supabase.from('audit_log').insert({
                user_id: req.user?.id || null,
                user_email: req.user?.email || null,
                action: 'case_venue_update',
                resource_type: 'case',
                resource_id: id,
                old_values: oldValues,
                new_values: updates,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });
        } catch (e) { }

        res.json({ success: true, case: updated });
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
// --- GET SINGLE CASE ---
exports.getCaseById = async (req, res) => {
    const { id } = req.params;

    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        const { data, error } = await supabase
            .from('cases')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.warn('Case lookup failed:', error?.message);
            return res.status(404).json({
                success: false,
                error: 'Case not found'
            });
        }

        res.json({ success: true, case: data });
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
        const supabase = req.app.locals.supabase;
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // First check if case exists
        const { data: caseCheck, error: caseError } = await supabase
            .from('cases')
            .select('id')
            .eq('id', id)
            .single();

        if (caseError || !caseCheck) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const { data: logs, error } = await supabase
            .from('audit_log')
            .select('id, user_id, user_email, action, old_values, new_values, ip_address, user_agent')
            .eq('resource_type', 'case')
            .eq('resource_id', id)
            .eq('action', 'case_status_change')
            .order('id', { ascending: false });

        if (error) {
            throw error;
        }

        const formattedLogs = (logs || []).map(row => {
            let notes = null;
            try {
                const nv = typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values;
                notes = nv?.notes || null;
            } catch (e) { }
            return { id: row.id, user_id: row.user_id, user_email: row.user_email, action: row.action, old_values: row.old_values, new_values: row.new_values, notes };
        });
        res.json({ success: true, logs: formattedLogs });
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
exports.updateCaseDetails = async (req, res) => {
    const { id } = req.params;
    const {
        case_number, claim_date, policy_number, benefit_mode,
        deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
        plan_category, plan_name, plan_members, plan_age_bracket,
        service_date, service_time, funeral_date, funeral_time,
        church_date, church_time, cleansing_date, cleansing_time,
        venue_name, venue_address, venue_lat, venue_lng,
        requires_cow, requires_sheep, requires_tombstone, requires_catering, requires_grocery, requires_bus,
        service_type, total_price, casket_type, casket_colour,
        delivery_date, delivery_time, intake_day,
        programs, top_up_amount, airtime, airtime_network, airtime_number,
        cover_amount, cashback_amount, amount_to_bank,
        legacy_plan_name, status, burial_place, tombstone_type, collection_type, collection_note, is_yard_burial
    } = req.body;

    // Basic validation
    if (!id) return res.status(400).json({ success: false, error: 'Case ID is required' });

    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        // 1. Get Old Values
        const { data: oldValues, error: checkError } = await supabase.from('cases').select('*').eq('id', id).single();
        if (checkError || !oldValues) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const finalFuneralDate = service_date || funeral_date;
        const finalFuneralTime = service_time || funeral_time;

        // 2. Prepare Update Object
        const updateData = {
            claim_date: claim_date || null,
            policy_number: policy_number || null,
            deceased_name,
            deceased_id: deceased_id || null,
            nok_name,
            nok_contact,
            nok_relation: nok_relation || null,
            plan_category: plan_category || null,
            plan_name: plan_name || null,
            plan_members: plan_members || null,
            plan_age_bracket: plan_age_bracket || null,
            funeral_date: finalFuneralDate || null,
            funeral_time: finalFuneralTime || null,
            service_date: service_date || null,
            service_time: service_time || null,
            church_date: church_date || null,
            church_time: church_time || null,
            cleansing_date: cleansing_date || null,
            cleansing_time: cleansing_time || null,
            venue_name: venue_name || null,
            venue_address: venue_address || null,
            venue_lat: venue_lat || null,
            venue_lng: venue_lng || null,
            requires_cow: !!requires_cow,
            requires_sheep: !!requires_sheep,
            requires_tombstone: !!requires_tombstone,
            requires_catering: !!requires_catering,
            requires_grocery: !!requires_grocery,
            requires_bus: !!requires_bus,
            service_type: service_type || null,
            total_price: total_price != null ? total_price : 0,
            casket_type: casket_type || null,
            casket_colour: casket_colour || null,
            delivery_date: delivery_date || null,
            delivery_time: delivery_time || null,
            intake_day: intake_day || null,
            programs: programs != null ? programs : 0,
            top_up_amount: top_up_amount != null ? top_up_amount : 0,
            airtime: !!airtime,
            airtime_network: airtime_network || null,
            airtime_number: airtime_number || null,
            cover_amount: cover_amount != null ? cover_amount : 0,
            cashback_amount: cashback_amount != null ? cashback_amount : 0,
            amount_to_bank: amount_to_bank != null ? amount_to_bank : 0,
            legacy_plan_name: legacy_plan_name || null,
            benefit_mode: benefit_mode || null,
            status: status || oldValues.status,
            burial_place: burial_place || null,
            branch: req.body.branch || oldValues.branch || 'Head Office',
            tombstone_type: tombstone_type || oldValues.tombstone_type || null,
            collection_type: collection_type || oldValues.collection_type || 'vehicle',
            collection_note: collection_note || oldValues.collection_note || null,
            is_yard_burial: !!is_yard_burial,
            updated_at: new Date().toISOString()
        };

        // 3. Perform Update
        const { data: updatedCase, error: updateError } = await supabase
            .from('cases')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // 4. Stock Reservation Logic (Handle Swaps & Status Changes)
        try {
            const { reserveStock, releaseStock, commitStock } = require('../utils/dbUtils');
            const userEmail = req.user?.email || 'system';

            const oldName = String(oldValues.casket_type || '').trim();
            const oldColor = String(oldValues.casket_colour || '').trim();
            const newName = String(updatedCase.casket_type || '').trim();
            const newColor = String(updatedCase.casket_colour || '').trim();

            const casketChanged = (oldName !== newName) || (oldColor !== newColor);
            const statusChanged = (oldValues.status !== updatedCase.status);

            // Helper to find item ID (could be refactored to shared function)
            const findItem = async (n, c) => {
                if (!n) return null;
                const { data: nameMatches } = await supabase.from('inventory').select('id, color').eq('category', 'coffin').ilike('name', n).order('stock_quantity', { ascending: false });
                if (nameMatches?.length) {
                    if (c) {
                        const exact = nameMatches.find(i => !i.color || i.color.toLowerCase() === c.toLowerCase());
                        if (exact) return exact;
                    }
                    return nameMatches[0];
                }
                const { data: modelMatches } = await supabase.from('inventory').select('id, color').eq('category', 'coffin').ilike('model', n).order('stock_quantity', { ascending: false });
                if (modelMatches?.length) {
                    if (c) {
                        const exact = modelMatches.find(i => !i.color || i.color.toLowerCase() === c.toLowerCase());
                        if (exact) return exact;
                    }
                    return modelMatches[0];
                }
                return null;
            };

            // A. Handle Casket Swap
            if (casketChanged) {
                // 1. Release Old Item (if it existed and case was not cancelled/completed already)
                if (oldName && !['cancelled', 'completed'].includes(oldValues.status)) {
                    const oldItem = await findItem(oldName, oldColor);
                    if (oldItem) {
                        try {
                            await releaseStock(oldItem.id, 1, userEmail, `Casket Changed: Releasing ${oldName}`);
                            console.log(`✅ Released old stock: ${oldName}`);
                        } catch (e) {
                            console.warn('Failed to release old stock:', e.message);
                        }
                    }
                }

                // 2. Reserve New Item (if status is active)
                if (newName && !['cancelled', 'completed'].includes(updatedCase.status)) {
                    const newItem = await findItem(newName, newColor);
                    if (newItem) {
                        try {
                            await reserveStock(newItem.id, 1, userEmail, `Casket Changed: Reserving ${newName}`);
                            console.log(`✅ Reserved new stock: ${newName}`);
                        } catch (e) {
                            console.warn('Failed to reserve new stock:', e.message);
                        }
                    } else {
                        console.warn(`⚠️ New casket '${newName}' not found in inventory.`);
                    }
                }
            }

            // B. Handle Status Change (Commit/Release on completion/cancel)
            if (statusChanged) {
                const targetItemName = newName || oldName; // Use current name
                const targetItemColor = newColor || oldColor;

                if (updatedCase.status === 'completed') {
                    // Commit the CURRENT item
                    const itemToCommit = await findItem(targetItemName, targetItemColor);
                    if (itemToCommit) {
                        await commitStock(itemToCommit.id, 1, id, userEmail, `Case Completed`);
                        console.log(`✅ Committed stock on completion`);
                    }
                } else if (updatedCase.status === 'cancelled') {
                    // Release the CURRENT item
                    const itemToRelease = await findItem(targetItemName, targetItemColor);
                    if (itemToRelease) {
                        await releaseStock(itemToRelease.id, 1, userEmail, `Case Cancelled`);
                        console.log(`✅ Released stock on cancellation`);
                    }
                }
            }

        } catch (stockLogicErr) {
            console.error('❌ Stock logic error in updateCaseDetails:', stockLogicErr);
        }

        // 5. Audit Log
        try {
            await supabase.from('audit_log').insert({
                user_id: req.user?.id || null,
                user_email: req.user?.email || null,
                action: 'case_full_update',
                resource_type: 'case',
                resource_id: id,
                old_values: oldValues,
                new_values: req.body,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });
        } catch (auditErr) { console.warn('Audit log failed:', auditErr.message); }

        res.json({ success: true, case: updatedCase });

    } catch (err) {
        console.error('Error updating case details:', err);
        res.status(500).json({ success: false, error: 'Failed to update case', details: err.message });
    }
};
