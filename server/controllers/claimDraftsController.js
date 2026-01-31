// Using Supabase SDK instead of direct PostgreSQL for DNS compatibility

exports.saveDraft = async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { policy_number, data, department } = req.body;
    if (!policy_number || !data) return res.status(400).json({ success: false, error: 'policy_number and data are required' });

    // Upsert the draft
    const { data: draft, error } = await supabase
      .from('claim_drafts')
      .upsert({
        policy_number,
        data,
        department: department || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'policy_number'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving draft:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Handle airtime requests if applicable
    try {
      const d = draft?.data || {};
      const hasAirtime = !!d.airtime;
      const network = (d.airtime_network || '').trim();
      const phone = (d.airtime_number || '').trim();

      if (hasAirtime && network && phone) {
        const { data: existing } = await supabase
          .from('airtime_requests')
          .select('id, status')
          .eq('policy_number', policy_number)
          .limit(1)
          .single();

        const planAmounts = {
          'Plan A': 100, 'Plan B': 100, 'Plan C': 100, 'Plan D': 200, 'Plan E': 200, 'Plan F': 200,
          Silver: 100, Gold: 200, Platinum: 200, Black: 200, Pearl: 200, Ivory: 200
        };
        const planKey = String(d.plan_name || '').trim();
        const amount = planAmounts[planKey] || 0;

        if (existing) {
          if (existing.status === 'pending') {
            await supabase
              .from('airtime_requests')
              .update({
                phone_number: phone,
                network,
                beneficiary_name: d.nok_name || null,
                amount: parseFloat(amount || 0) || 0
              })
              .eq('id', existing.id);
          }
        } else {
          await supabase
            .from('airtime_requests')
            .insert({
              policy_number,
              beneficiary_name: d.nok_name || null,
              network,
              phone_number: phone,
              amount: parseFloat(amount || 0) || 0,
              status: 'pending',
              operator_notes: 'Auto from claim draft'
            });
        }
      }
    } catch (_) { }

    res.status(201).json({ success: true, draft });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDraft = async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { policy } = req.params;
    const { data, error } = await supabase
      .from('claim_drafts')
      .select('*')
      .eq('policy_number', policy)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    res.json({ success: true, draft: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLastDraft = async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('claim_drafts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'No drafts' });
    }

    res.json({ success: true, draft: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listDrafts = async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { department } = req.query;

    let query = supabase
      .from('claim_drafts')
      .select('policy_number, updated_at, department, data');

    if (department) {
      query = query.eq('department', department);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error listing drafts:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, drafts: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDraftHistory = async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('claim_draft_deletions')
      .select('policy_number, department, deleted_at, reason, data')
      .order('deleted_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error getting draft history:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, history: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteDraft = async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { policy } = req.params;
    const reason = (req.body && req.body.reason) ? String(req.body.reason).trim() : '';

    // First get the draft to log it
    const { data: deletedRow, error: selectError } = await supabase
      .from('claim_drafts')
      .select('*')
      .eq('policy_number', policy)
      .single();

    if (selectError || !deletedRow) {
      // Draft not found - treat as success (idempotent)
      return res.json({ success: true, message: 'Draft not found or already deleted' });
    }

    // Delete the draft
    const { error: deleteError } = await supabase
      .from('claim_drafts')
      .delete()
      .eq('policy_number', policy);

    if (deleteError) {
      console.error('Error deleting draft:', deleteError);
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    // Log the deletion
    const user = req.user || {};
    await supabase
      .from('claim_draft_deletions')
      .insert({
        policy_number: deletedRow.policy_number,
        department: deletedRow.department || null,
        data: deletedRow.data || null,
        deleted_by: user.id || null,
        deleted_by_email: user.email || null,
        deleted_by_role: user.role || null,
        reason: reason || null
      });

    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
