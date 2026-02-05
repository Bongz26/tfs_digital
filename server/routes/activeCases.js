// server/routes/activeCases.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { getAvailableVehicles, checkVehicleConflict } = require('../utils/vehicleConflicts');

// Simple in-memory cache
let activeCasesCache = { data: null, time: 0 };
const ACTIVE_TTL_MS = 5000; // 5 seconds

// GET /api/activeCases - Optimized
router.get('/', async (req, res) => {
  try {
    // Prevent browser caching to ensure fresh data after updates
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const now = Date.now();
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const search = (req.query.search || '').trim();
    const statusFilter = (req.query.status || '').trim();
    const fromDate = (req.query.from_date || '').trim();
    const toDate = (req.query.to_date || '').trim();
    const ageFilter = (req.query.age_filter || '').trim(); // 'recent' (< 13 days) or 'older' (> 13 days)

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Disable server-side cache completely since we're updating data frequently
    const supabase = req.app.locals.supabase;
    const activeStatuses = ['intake', 'preparation', 'confirmed', 'in_progress'];

    let qb = supabase
      .from('cases')
      .select('id,case_number,deceased_name,status,funeral_date,funeral_time,venue_name,venue_address,burial_place,policy_number,requires_grocery,branch,is_yard_burial,created_at', { count: 'exact' })
      .order('funeral_date', { ascending: true, nullsFirst: false });

    // Apply Filters
    if (ageFilter === 'recent') {
      // Created within the last 13 days (strictly less than 13 days old)
      const thirteenDaysAgo = new Date();
      thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);
      qb = qb.gt('created_at', thirteenDaysAgo.toISOString());
    } else if (ageFilter === 'older') {
      // Created 13 days ago or more
      const thirteenDaysAgo = new Date();
      thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);
      qb = qb.lte('created_at', thirteenDaysAgo.toISOString());
    }

    if (fromDate) qb = qb.gte('funeral_date', fromDate);
    if (toDate) qb = qb.lte('funeral_date', toDate);

    if (fromDate || toDate) {
      // If searching a specific past date range, we might want to see completed/archived cases too?
      // For now, let's respect the status filter if explicitly set, otherwise if date range is set, show ALL statuses within that range (including past services).
      if (statusFilter && statusFilter.toLowerCase() !== 'all') {
        qb = qb.in('status', [statusFilter]);
      }
      // If NO status filter is set but DATE range IS set, do NOT filter by 'activeStatuses' by default, 
      // to allow seeing past completed services.
    } else {
      // Default behavior (no date filter): Show only active cases unless specific status requested
      if (statusFilter && statusFilter.toLowerCase() !== 'all') {
        qb = qb.in('status', [statusFilter]);
      } else {
        qb = qb.in('status', activeStatuses);
      }
    }

    if (search) {
      const term = `%${search}%`;
      qb = qb.or(`deceased_name.ilike.${term},case_number.ilike.${term},policy_number.ilike.${term}`);
    }
    qb = qb.range(from, to);

    const { data: cases, error: casesError, count: casesCount } = await qb;

    if (casesError) {
      console.error('Active cases query error:', casesError);
      throw casesError;
    }

    console.log(`Found ${cases?.length || 0} active cases`);

    // Get all vehicles (availability is now based on time conflicts, not a boolean)
    const { data: allVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id,type,reg_number')
      .order('type', { ascending: true });

    if (vehiclesError) {
      console.error('Vehicles query error:', vehiclesError);
      throw vehiclesError;
    }

    console.log(`Found ${allVehicles?.length || 0} total vehicles`);

    // Get all roster assignments with case details for conflict checking
    const { data: allRosterAssignments, error: rosterAssignmentsError } = await supabase
      .from('roster')
      .select(`
        vehicle_id,
        case_id,
        status,
        cases:case_id (
          funeral_date,
          funeral_time,
          case_number,
          deceased_name
        )
      `)
      .neq('status', 'completed');

    // Flatten roster assignments with case details
    const allVehicleAssignments = (allRosterAssignments || []).map(r => ({
      vehicle_id: r.vehicle_id,
      case_id: r.case_id,
      status: r.status,
      funeral_date: r.cases?.funeral_date || null,
      funeral_time: r.cases?.funeral_time || null,
      case_number: r.cases?.case_number || null,
      deceased_name: r.cases?.deceased_name || null
    }));

    const vehicles = allVehicles || [];

    // Get roster assignments for these cases
    const caseIds = cases.map(c => c.id);
    let rosterAssignments = [];

    if (caseIds.length > 0) {
      const { data: rosterData, error: rosterError } = await supabase
        .from('roster')
        .select('id, case_id, vehicle_id, driver_name, status, assignment_role, external_vehicle')
        .in('case_id', caseIds);

      if (!rosterError && rosterData) {
        // Enrich roster data with vehicle and driver objects
        const enrichedRoster = rosterData.map(r => {
          const vehicle = allVehicles.find(v => v.id === r.vehicle_id);
          return {
            ...r,
            vehicle: vehicle || null,
            driver: { name: r.driver_name || 'TBD' }
          };
        });

        // Group by case_id
        const rosterByCase = {};
        enrichedRoster.forEach(r => {
          if (!rosterByCase[r.case_id]) {
            rosterByCase[r.case_id] = [];
          }
          rosterByCase[r.case_id].push(r);
        });
        rosterAssignments = rosterByCase;
      }
    }

    // Attach roster data to cases and calculate available vehicles per case
    const activeCases = cases || [];
    console.log(`Active cases: ${activeCases.length}`);

    const casesWithRoster = activeCases.map(caseItem => {

      // Calculate availability and conflicts
      const availableVehicles = [];
      const unavailableVehicles = [];

      // Warning flags (Restored)
      const today = new Date();
      const dayStart = new Date(today.toISOString().split('T')[0]);
      let warningPastFuneral = false;
      let warningPrepRequired = false;

      if (caseItem.funeral_date) {
        const funeralDate = new Date(caseItem.funeral_date);
        if (funeralDate < dayStart && !['completed', 'archived', 'cancelled'].includes(caseItem.status)) {
          warningPastFuneral = true;
        }
        const diffMs = funeralDate.getTime() - dayStart.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays <= 1 && diffDays >= 0 && !['preparation', 'in_progress', 'completed', 'archived', 'cancelled'].includes(caseItem.status)) {
          warningPrepRequired = true;
        }
      }

      vehicles.forEach(vehicle => {
        const assignments = (allVehicleAssignments || []).filter(a => a.vehicle_id === vehicle.id);
        // Use 1.5 buffer as requested
        const conflict = checkVehicleConflict(assignments, caseItem.funeral_date, caseItem.funeral_time, 1.5, caseItem.id);

        if (!conflict || !conflict.hasConflict) {
          availableVehicles.push(vehicle);
        } else {
          // Find the specific assignment causing the conflict to show details
          const conflictInfo = {
            id: vehicle.id,
            type: vehicle.type,
            reg_number: vehicle.reg_number,
            reason: conflict.reason,
            conflict_case: conflict.conflict ? {
              case_number: conflict.conflict.case_number,
              deceased_name: conflict.conflict.deceased_name,
              time: conflict.conflict.funeral_time
            } : null
          };
          unavailableVehicles.push(conflictInfo);
        }
      });

      const minVehicles = (caseItem.plan_name && /premium/i.test(caseItem.plan_name)) ? 3 : 2;
      const resultCase = {
        ...caseItem,
        roster: rosterAssignments[caseItem.id] || [],
        available_vehicles: availableVehicles,
        unavailable_vehicles: unavailableVehicles, // New field with conflict details
        required_min_vehicles: minVehicles,
        warning_past_funeral_date: warningPastFuneral,
        warning_prep_required: warningPrepRequired
      };

      // console.log(`Case ${caseItem.id} flags: past=${resultCase.warning_past_funeral_date} prep=${resultCase.warning_prep_required}`);
      return resultCase;
    });

    const payload = {
      success: true,
      cases: casesWithRoster || [],
      vehicles: vehicles || [],
      page,
      limit,
      total: casesCount || (casesWithRoster ? casesWithRoster.length : 0)
    };
    activeCasesCache = { data: payload, time: Date.now() };
    res.json(payload);

  } catch (err) {
    console.error('ActiveCases route error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      cases: [],
      vehicles: []
    });
  }
});

router.post('/alerts', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { data: cases } = await supabase.from('cases').select('*').order('funeral_date', { ascending: true });
    const activeCases = (cases || []).filter(c => !['completed', 'archived', 'cancelled'].includes(c.status));
    const today = new Date();
    const dayStart = new Date(today.toISOString().split('T')[0]);
    const flagged = activeCases.map(c => {
      let past = false;
      let prep = false;
      if (c.funeral_date) {
        const fd = new Date(c.funeral_date);
        if (fd < dayStart) past = true;
        const diffDays = Math.floor((fd.getTime() - dayStart.getTime()) / (24 * 60 * 60 * 1000));
        const ok = ['preparation', 'in_progress', 'completed', 'archived', 'cancelled'];
        if (diffDays <= 1 && diffDays >= 0 && !ok.includes(c.status)) prep = true;
      }
      return { id: c.id, case_number: c.case_number, status: c.status, funeral_date: c.funeral_date, warning_past_funeral_date: past, warning_prep_required: prep };
    }).filter(x => x.warning_past_funeral_date || x.warning_prep_required);
    const to = (req.body && req.body.to) || process.env.ALERTS_TO;

    // If no recipients configured, return summary only
    if (!to) {
      return res.json({ success: true, sent: false, reason: 'No recipients configured', flagged_count: flagged.length, cases: flagged });
    }

    // If nothing to alert, skip sending
    if (flagged.length === 0) {
      return res.json({ success: true, sent: false, reason: 'No flagged cases', flagged_count: 0 });
    }

    // Configure transporter
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return res.json({ success: true, sent: false, reason: 'SMTP not configured', flagged_count: flagged.length, cases: flagged });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const from = process.env.ALERTS_FROM || user;
    const subject = `TFS Alerts: ${flagged.length} case(s) need attention`;
    const htmlRows = flagged.map(f => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;">${f.case_number}</td>
        <td style="padding:6px;border:1px solid #ddd;">${f.status}</td>
        <td style="padding:6px;border:1px solid #ddd;">${f.funeral_date || ''}</td>
        <td style="padding:6px;border:1px solid #ddd;">${f.warning_past_funeral_date ? 'Past' : ''}</td>
        <td style="padding:6px;border:1px solid #ddd;">${f.warning_prep_required ? 'Prep Required' : ''}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;">
        <p>Hi,</p>
        <p>The following case(s) require attention:</p>
        <table style="border-collapse:collapse;min-width:480px;">
          <thead>
            <tr>
              <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Case</th>
              <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Status</th>
              <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Funeral Date</th>
              <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Past Funeral</th>
              <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Prep Warning</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
        <p style="margin-top:12px;">Open Active Cases to update statuses: http://localhost:3000/active-cases</p>
      </div>
    `;

    const text = flagged.map(f => `${f.case_number} | ${f.status} | ${f.funeral_date || ''} | past=${f.warning_past_funeral_date} prep=${f.warning_prep_required}`).join('\n');

    const info = await transporter.sendMail({ from, to, subject, text, html });
    res.json({ success: true, sent: true, messageId: info.messageId, flagged_count: flagged.length });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process alerts', details: err.message });
  }
});

module.exports = router;
