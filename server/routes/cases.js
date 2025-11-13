// server/routes/cases.js
// --------------------------------------------------
// TFS Digital | Case Management Routes (Supabase)
// --------------------------------------------------

const express = require("express");
const router = express.Router();

// 🔹 Generate unique case number (THS-YYYY-XXX)
const generateCaseNumber = async (supabase) => {
  const year = new Date().getFullYear();
  const prefix = `THS-${year}-`;

  const { data: cases, error } = await supabase
    .from("cases")
    .select("case_number")
    .like("case_number", `${prefix}%`)
    .order("case_number", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  if (!cases || cases.length === 0) return `${prefix}001`;

  const lastNumber = parseInt(cases[0].case_number.split("-")[2]);
  const nextNumber = (lastNumber + 1).toString().padStart(3, "0");
  return `${prefix}${nextNumber}`;
};

// --------------------------------------------------
// 🟢 GET all cases
// --------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, cases: data });
  } catch (err) {
    console.error("❌ Error fetching cases:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch cases" });
  }
});

// --------------------------------------------------
// 🟢 GET single case by ID
// --------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;

    res.json({ success: true, case: data });
  } catch (err) {
    console.error("❌ Error fetching case:", err.message);
    res.status(404).json({ success: false, error: "Case not found" });
  }
});

// --------------------------------------------------
// 🟢 POST create new case
// --------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const body = req.body;

    console.log("Incoming case data:", JSON.stringify(body, null, 2));

    // Validate intake day (must be Wednesday)
    if (body.intake_day) {
      const dow = new Date(body.intake_day).getDay();
      if (dow !== 3) {
        return res.status(400).json({
          success: false,
          error: "Intake day must be a Wednesday",
        });
      }
    }

    // Generate case number
    const case_number = await generateCaseNumber(supabase);

    // Ensure correct types
    const plan_members = body.plan_members ? parseInt(body.plan_members) : null;
    const total_price =
      body.service_type === "book"
        ? parseFloat(body.total_price || 0)
        : parseFloat(body.total_price || 0);

    // Insert into Supabase
    const { data, error } = await supabase
      .from("cases")
      .insert([
        {
          case_number,
          deceased_name: body.deceased_name,
          deceased_id: body.deceased_id || null,
          nok_name: body.nok_name,
          nok_contact: body.nok_contact,
          nok_relation: body.nok_relation || null,
          plan_category: body.plan_category,
          plan_name: body.plan_name,
          plan_members,
          plan_age_bracket: body.plan_age_bracket,
          funeral_date: body.funeral_date,
          funeral_time: body.funeral_time || null,
          venue_name: body.venue_name || null,
          venue_address: body.venue_address || null,
          venue_lat: body.venue_lat || null,
          venue_lng: body.venue_lng || null,
          requires_cow: body.requires_cow || false,
          requires_tombstone: body.requires_tombstone || false,
          intake_day: body.intake_day || null,
          service_type: body.service_type || "book",
          total_price: total_price,
          status: body.status || "intake",
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, case: data });
  } catch (err) {
    console.error("❌ Error creating case:", err.message);
    res.status(500).json({ success: false, error: err.message || "Failed to create case" });
  }
});

// Assign driver and vehicle to a case
router.put('/assign/:id', async (req, res) => {
  try {
    const { driver_name, vehicle_type, reg_number, pickup_time } = req.body;
    const caseId = req.params.id;

    const [result] = await db.query(
      `UPDATE cases
       SET driver_name = ?, vehicle_type = ?, reg_number = ?, pickup_time = ?, status = 'scheduled'
       WHERE id = ?`,
      [driver_name, vehicle_type, reg_number, pickup_time, caseId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Case not found' });

    res.json({ message: 'Driver assigned successfully' });
  } catch (err) {
    console.error('Assign driver error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --------------------------------------------------
// 🟢 PUT update existing case
// --------------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const updates = req.body;

    if (updates.plan_members) updates.plan_members = parseInt(updates.plan_members);
    if (updates.total_price) updates.total_price = parseFloat(updates.total_price);

    const { data, error } = await supabase
      .from("cases")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;

    res.json({ success: true, case: data });
  } catch (err) {
    console.error("❌ Error updating case:", err.message);
    res.status(500).json({ success: false, error: err.message || "Failed to update case" });
  }
});

// --------------------------------------------------
// 🟢 DELETE case
// --------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { error } = await supabase.from("cases").delete().eq("id", req.params.id);

    if (error) throw error;

    res.json({ success: true, message: "Case deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting case:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete case" });
  }
});

module.exports = router;
