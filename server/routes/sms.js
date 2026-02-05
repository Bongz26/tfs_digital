// server/routes/sms.js
const express = require('express');
const router = express.Router();
// Use Supabase Client instead of direct DB connection
const supabase = require('../config/supabaseClient');
const { requireMinRole } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// --- Helper: Email Transporter ---
let emailTransporter = null;
function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '0', 10) || 0;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  emailTransporter = nodemailer.createTransport({ host, port: port || 587, secure, auth: { user, pass } });
  return emailTransporter;
}

// --- Helper: Calculate Plan Amount ---
function getPlanAmount(planName) {
  const m = {
    'plan a': 100, 'plan b': 100, 'plan c': 100,
    'plan d': 200, 'plan e': 200, 'plan f': 200,
    'silver': 100, 'gold': 200, 'platinum': 200,
    'black': 200, 'pearl': 200, 'ivory': 200,
    'spring a': 100, 'spring b': 100
  };
  return m[String(planName || '').trim().toLowerCase()] || 0;
}

// --- Airtime Generation Logic (Supabase JS) ---

async function generateAirtimeRequestsFromCases() {
  try {
    // 1. Fetch active cases with airtime=true
    // FIX: Use chained .neq() for filter instead of .not('status', 'in', [...]) which can be flaky in some client versions
    const { data: cases, error: caseError } = await supabase
      .from('cases')
      .select('id, policy_number, nok_name, airtime_network, airtime_number, plan_name, airtime')
      .eq('airtime', true)
      .neq('airtime_number', null)
      .neq('airtime_number', '')
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .neq('status', 'archived');

    if (caseError) throw caseError;
    if (!cases || cases.length === 0) return;

    // 2. Fetch existing requests to check for duplicates
    const { data: activeReqs } = await supabase
      .from('airtime_requests')
      .select('policy_number, phone_number, network');

    const existingSet = new Set();
    const normalize = (p, n, num) =>
      `${String(p).replace(/\s+/g, '').toUpperCase()}|${String(n).trim().toUpperCase()}|${String(num).replace(/\s+/g, '')}`;

    if (activeReqs) {
      activeReqs.forEach(r => existingSet.add(normalize(r.policy_number, r.network, r.phone_number)));
    }

    const newRequests = [];

    for (const c of cases) {
      if (!c.airtime_network || !c.airtime_number) continue;

      const normKey = normalize(c.policy_number, c.airtime_network, c.airtime_number);

      if (existingSet.has(normKey)) continue;

      newRequests.push({
        case_id: c.id,
        policy_number: c.policy_number,
        beneficiary_name: c.nok_name,
        network: String(c.airtime_network).trim(),
        phone_number: String(c.airtime_number).trim(),
        amount: getPlanAmount(c.plan_name),
        status: 'pending',
        operator_notes: 'Auto from case scan',
        requested_at: new Date().toISOString()
      });

      // Add to set to prevent duplicate adds in same run
      existingSet.add(normKey);
    }

    if (newRequests.length > 0) {
      const { error: insertError } = await supabase
        .from('airtime_requests')
        .insert(newRequests);
      if (insertError) console.error('Error batch inserting airtime requests:', insertError);
    }

  } catch (err) {
    console.error('generateAirtimeRequestsFromCases error:', err.message);
  }
}

async function generateAirtimeRequestsFromDrafts() {
  try {
    const { data: drafts, error: draftError } = await supabase
      .from('claim_drafts')
      .select('*');

    if (draftError) throw draftError;
    if (!drafts) return;

    const { data: activeReqs } = await supabase
      .from('airtime_requests')
      .select('policy_number, phone_number, network');

    const existingSet = new Set();
    const normalize = (p, n, num) =>
      `${String(p).replace(/\s+/g, '').toUpperCase()}|${String(n).trim().toUpperCase()}|${String(num).replace(/\s+/g, '')}`;

    if (activeReqs) {
      activeReqs.forEach(r => existingSet.add(normalize(r.policy_number, r.network, r.phone_number)));
    }

    const newRequests = [];

    for (const d of drafts) {
      const json = d.data || {};
      if (json.status !== 'claim_draft') continue;
      if (json.airtime !== true && json.airtime !== 'true') continue;
      if (!json.airtime_network || !json.airtime_number) continue;

      const normKey = normalize(d.policy_number, json.airtime_network, json.airtime_number);
      if (existingSet.has(normKey)) continue;

      let caseId = null;
      const { data: foundCase } = await supabase
        .from('cases')
        .select('id')
        .eq('policy_number', d.policy_number)
        .limit(1)
        .maybeSingle();

      if (foundCase) caseId = foundCase.id;

      newRequests.push({
        case_id: caseId,
        policy_number: d.policy_number,
        beneficiary_name: json.nok_name,
        network: String(json.airtime_network).trim(),
        phone_number: String(json.airtime_number).trim(),
        amount: getPlanAmount(json.plan_name),
        status: 'pending',
        operator_notes: 'Auto from claim draft',
        requested_at: d.created_at || new Date().toISOString()
      });

      existingSet.add(normKey);
    }

    if (newRequests.length > 0) {
      const { error: insertError } = await supabase
        .from('airtime_requests')
        .insert(newRequests);
      if (insertError) console.error('Error batch inserting draft airtime requests:', insertError);
    }

  } catch (err) {
    console.error('generateAirtimeRequestsFromDrafts error:', err.message);
  }
}

async function archiveOldAirtimeRequests() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 12);
    const cutoffISO = cutoffDate.toISOString();

    const { data: toArchive, error: fetchError } = await supabase
      .from('airtime_requests')
      .select('*')
      .lt('requested_at', cutoffISO);

    if (fetchError) throw fetchError;
    if (!toArchive || toArchive.length === 0) return { deleted: 0 };

    const archiveEntries = toArchive.map(r => ({
      original_id: r.id,
      case_id: r.case_id,
      policy_number: r.policy_number,
      beneficiary_name: r.beneficiary_name,
      network: r.network,
      phone_number: r.phone_number,
      amount: r.amount,
      status: r.status,
      requested_by: r.requested_by,
      requested_by_email: r.requested_by_email,
      requested_by_role: r.requested_by_role,
      requested_at: r.requested_at,
      sent_at: r.sent_at,
      handled_by: r.handled_by,
      operator_phone: r.operator_phone,
      operator_notes: r.operator_notes,
      archived_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('airtime_requests_archive')
      .upsert(archiveEntries, { onConflict: 'original_id', ignoreDuplicates: true });

    if (insertError) {
      console.error('Archive Insert Error:', insertError);
      return { deleted: 0 };
    }

    const idsToDelete = toArchive.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('airtime_requests')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Archive Delete Error:', deleteError);
      return { deleted: 0 };
    }

    return { deleted: idsToDelete.length };

  } catch (err) {
    console.error('archiveOldAirtimeRequests error:', err.message);
    return { deleted: 0 };
  }
}


// --- Routes ---

// List Active Airtime Requests
router.get('/airtime-requests', requireMinRole('staff'), async (req, res) => {
  try {
    await Promise.all([
      generateAirtimeRequestsFromCases(),
      generateAirtimeRequestsFromDrafts(),
      archiveOldAirtimeRequests()
    ]);

    // FIX: Manual Join. Foreign Key might be missing in DB, so we do it in code.
    const { data: requests, error: reqError } = await supabase
      .from('airtime_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (reqError) throw reqError;

    // Fetch related cases manually
    const caseIds = [...new Set(requests.map(r => r.case_id).filter(id => id != null))];
    let casesMap = {};

    if (caseIds.length > 0) {
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('id, case_number, deceased_name, status')
        .in('id', caseIds);

      if (!casesError && casesData) {
        casesData.forEach(c => casesMap[c.id] = c);
      }
    }

    const enrichedRequests = requests.map(r => {
      const c = casesMap[r.case_id] || {};
      return {
        ...r,
        case_number: c.case_number || null,
        deceased_name: c.deceased_name || null,
        case_status: c.status || null
      };
    });

    res.json({ success: true, requests: enrichedRequests });
  } catch (error) {
    console.error('Error listing airtime requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List Archived Requests
router.get('/airtime-requests/archived', requireMinRole('staff'), async (req, res) => {
  try {
    const { data: requests, error: reqError } = await supabase
      .from('airtime_requests_archive')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(500);

    if (reqError) throw reqError;

    const caseIds = [...new Set(requests.map(r => r.case_id).filter(id => id != null))];
    let casesMap = {};

    if (caseIds.length > 0) {
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('id, case_number, deceased_name, status')
        .in('id', caseIds);

      if (!casesError && casesData) {
        casesData.forEach(c => casesMap[c.id] = c);
      }
    }

    const enrichedRequests = requests.map(r => {
      const c = casesMap[r.case_id] || {};
      return {
        ...r,
        id: r.original_id, // Map for frontend
        case_number: c.case_number || null,
        deceased_name: c.deceased_name || null,
        case_status: c.status || null
      };
    });

    res.json({ success: true, requests: enrichedRequests });
  } catch (error) {
    console.error('Error listing archived airtime requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Status
router.patch('/airtime-requests/:id/status', requireMinRole('staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, operator_notes } = req.body;

    let updateData = {
      status,
      operator_notes
    };

    if (String(status).toLowerCase() === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('airtime_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, request: data });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Request Manually
router.post('/airtime-requests', requireMinRole('staff'), async (req, res) => {
  try {
    const { case_id, policy_number, beneficiary_name, network, phone_number, amount, notes } = req.body;

    if (!policy_number || !phone_number || !network) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const newReq = {
      case_id: case_id || null,
      policy_number,
      beneficiary_name,
      network,
      phone_number,
      amount: parseFloat(amount || 0),
      status: 'pending',
      operator_notes: notes,
      requested_by_email: req.user ? req.user.email : null,
      requested_by_role: req.user ? req.user.role : null,
      requested_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('airtime_requests')
      .insert(newReq)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, request: data });

  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  res.json({ success: true, messages: [] });
});

module.exports = router;
