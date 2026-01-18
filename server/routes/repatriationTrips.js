const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// List trips (optional filters)
router.get('/', async (req, res) => {
  try {
    const { caseId, vehicleId } = req.query;
    let sql = 'SELECT * FROM repatriation_trips';
    const params = [];
    const where = [];
    if (caseId) { where.push('case_id = $' + (params.push(parseInt(caseId)))); }
    if (vehicleId) { where.push('vehicle_id = $' + (params.push(parseInt(vehicleId)))); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, trips: result.rows });
  } catch (error) {
    console.error('Error listing repatriation trips:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get last closing odometer for a vehicle
router.get('/last-closing', async (req, res) => {
  try {
    const { vehicleId } = req.query;
    if (!vehicleId) {
      return res.status(400).json({ success: false, error: 'vehicleId is required' });
    }
    const result = await query(
      `SELECT odometer_closing 
       FROM repatriation_trips 
       WHERE vehicle_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [parseInt(vehicleId)]
    );
    const last = result.rows[0]?.odometer_closing || null;
    res.json({ success: true, last_closing: last });
  } catch (error) {
    console.error('Error fetching last closing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a repatriation trip
router.post('/', async (req, res) => {
  try {
    const {
      case_id,
      vehicle_id,
      driver_id,
      from_location,
      from_address,
      to_location,
      to_address,
      odometer_closing,
      time_out,
      time_in,
      notes,
      created_by,
      deceased_name,
      deceased_id,
      family_contact_name,
      family_contact_number,
      date_of_death,
      policy_number,
      collection_type,
      tag_number
    } = req.body;

    console.log('Received Repatriation Payload:', req.body); // DEBUG LOG

    // If collection_type is 'ems' or 'police' or 'family', vehicle and odometer are not required
    const isExternalTransport = ['ems', 'police', 'family'].includes((collection_type || '').toLowerCase());

    if (!isExternalTransport && (!vehicle_id || odometer_closing === undefined || odometer_closing === null)) {
      return res.status(400).json({ success: false, error: 'vehicle_id and odometer_closing are required for internal fleet trips' });
    }

    const idVal = (deceased_id || '').trim();
    if (idVal && !/^\d{13}$/.test(idVal)) {
      return res.status(400).json({ success: false, error: 'ID number must be exactly 13 digits' });
    }
    const policyCandidate = (policy_number || '').trim() || (idVal && /^\d{13}$/.test(idVal) ? idVal : '');

    let duplicateInfo = { by_id: { count: 0 }, by_policy: { count: 0 }, by_name_contact: { count: 0 } };
    try {
      if (idVal) {
        const c1 = await query(`SELECT COUNT(*)::int AS c FROM cases WHERE deceased_id = $1`, [idVal]);
        duplicateInfo.by_id.count = c1.rows[0]?.c || 0;
      }
      if (policyCandidate) {
        const c2 = await query(`SELECT COUNT(*)::int AS c FROM cases WHERE policy_number = $1`, [policyCandidate]);
        duplicateInfo.by_policy.count = c2.rows[0]?.c || 0;
      }
      if (deceased_name && family_contact_number) {
        const c3 = await query(
          `SELECT COUNT(*)::int AS c FROM cases WHERE LOWER(deceased_name) = LOWER($1) AND nok_contact = $2`,
          [deceased_name, family_contact_number]
        );
        duplicateInfo.by_name_contact.count = c3.rows[0]?.c || 0;
      }
    } catch (e) { }

    let finalCaseId = null;
    let finalCaseNumber = null;
    if (case_id) {
      const cid = parseInt(case_id);
      if (isNaN(cid)) {
        return res.status(400).json({ success: false, error: 'case_id must be a number' });
      }
      const caseRes = await query('SELECT id, case_number FROM cases WHERE id = $1', [cid]);
      if (caseRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }
      finalCaseId = cid;
      finalCaseNumber = caseRes.rows[0].case_number || null;
    } else {
      // Try to link to an existing case first to avoid duplicates
      let existingCase = null;
      if (deceased_id) {
        const resById = await query(
          `SELECT id, case_number FROM cases WHERE deceased_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [deceased_id]
        );
        existingCase = resById.rows[0] || null;
      }
      if (!existingCase && policyCandidate) {
        const resByPolicy = await query(
          `SELECT id, case_number FROM cases WHERE policy_number = $1 ORDER BY created_at DESC LIMIT 1`,
          [policyCandidate]
        );
        existingCase = resByPolicy.rows[0] || null;
      }
      if (!existingCase && deceased_name && family_contact_number) {
        const resByNameContact = await query(
          `SELECT id, case_number FROM cases 
           WHERE LOWER(deceased_name) = LOWER($1) AND nok_contact = $2 
           ORDER BY created_at DESC LIMIT 1`,
          [deceased_name, family_contact_number]
        );
        existingCase = resByNameContact.rows[0] || null;
      }

      if (existingCase) {
        finalCaseId = existingCase.id;
        finalCaseNumber = existingCase.case_number || null;
      } else {
        // Auto-create minimal case record for intake to complete later
        if (!deceased_name || !family_contact_name || !family_contact_number) {
          return res.status(400).json({ success: false, error: 'deceased_name, family_contact_name, and family_contact_number are required to create a case' });
        }

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
          const match = lastCaseNumber && lastCaseNumber.match(/THS-\d{4}-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }
        const generatedCaseNumber = `THS-${year}-${String(nextNumber).padStart(3, '0')}`;

        const insertCaseRes = await query(
          `INSERT INTO cases (case_number, deceased_name, deceased_id, nok_name, nok_contact, policy_number, funeral_date, date_of_death, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, case_number`,
          [
            generatedCaseNumber,
            deceased_name,
            idVal || null,
            family_contact_name,
            family_contact_number,
            policyCandidate || null,
            null, // funeral_date
            date_of_death || null, // Added date_of_death
            'intake'
          ]
        );
        finalCaseId = insertCaseRes.rows[0].id;
        finalCaseNumber = insertCaseRes.rows[0].case_number;
      }
    }

    // Fetch last closing for this vehicle
    let lastClosing = null;
    if (vehicle_id && !isNaN(parseInt(vehicle_id))) {
      const lastRes = await query(
        `SELECT odometer_closing 
         FROM repatriation_trips 
         WHERE vehicle_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [parseInt(vehicle_id)]
      );
      lastClosing = lastRes.rows[0]?.odometer_closing || null;
    }

    let kmTraveled = null;
    const closingVal = odometer_closing ? parseInt(odometer_closing) : null;

    if (vehicle_id && !isNaN(closingVal)) {
      if (lastClosing !== null && closingVal >= lastClosing) {
        kmTraveled = closingVal - lastClosing;
      } else if (lastClosing === null) {
        kmTraveled = 0;
      }
    }

    const finalNotes = notes || null;

    const insertRes = await query(
      `INSERT INTO repatriation_trips 
       (case_id, vehicle_id, driver_id, from_location, from_address, to_location, to_address, odometer_closing, km_traveled, time_out, time_in, notes, created_by, tag_number, collection_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        finalCaseId,
        vehicle_id ? parseInt(vehicle_id) : null,
        driver_id ? parseInt(driver_id) : null,
        from_location || null,
        from_address || null,
        to_location || null,
        to_address || null,
        closingVal,
        kmTraveled,
        time_out || null,
        time_in,
        finalNotes,
        created_by || null,
        tag_number || null,
        collection_type || null
      ]
    );

    const duplicatesFound = (duplicateInfo.by_id.count > 0) || (duplicateInfo.by_policy.count > 0) || (duplicateInfo.by_name_contact.count > 0);
    if (duplicatesFound) {
      console.warn('Duplicate case detection:', duplicateInfo);
    }
    res.status(201).json({ success: true, trip: insertRes.rows[0], last_closing: lastClosing, case_id: finalCaseId, case_number: finalCaseNumber, duplicates_found: duplicatesFound, duplicate_info: duplicateInfo });
  } catch (error) {
    console.error('Error creating repatriation trip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
