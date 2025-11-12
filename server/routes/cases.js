// server/routes/cases.js
// --------------------------------------------------
// TFS Digital | Case Management Routes
// Connected directly to Supabase (PostgreSQL backend)
// --------------------------------------------------

const express = require("express");
const router = express.Router();

// 🔹 Utility: Generate case number like "THS-2025-001"
const generateCaseNumber = async (supabase) => {
  const year = new Date().getFullYear();
  const prefix = `THS-${year}-`;

  // Get highest case number for this year
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

    // Generate unique case number
    const case_number = await generateCaseNumber(supabase);

    // Intake day validation (must be Wednesday)
    if (body.intake_day) {
      const dow = new Date(body.intake_day).getDay(); // Sunday=0, Monday=1, ..., Wednesday=3
      if (dow !== 3) {
        return res.status(400).json({
          success: false,
          error: "Intake day must be a Wednesday",
        });
      }
    }

    // Insert into DB
    const { data, error } = await supabase
      .from("cases")
      .insert([
        {
          case_number,
          deceased_name: body.deceased_name,
          deceased_id: body.deceased_id || null,
          nok_name: body.nok_name,
          nok_contact: body.nok_contact,
          nok_relation: body.nok_relation,
          plan_category: body.plan_category,
          plan_name: body.plan_name,
          plan_members: body.plan_members || 1,
          plan_age_bracket: body.plan_age_bracket,
          funeral_date: body.funeral_date,
          funeral_time: body.funeral_time || null,
          venue_name: body.venue_name,
          venue_address: body.venue_address,
          venue_lat: body.venue_lat || null,
          venue_lng: body.venue_lng || null,
          requires_cow: body.requires_cow || false,
          requires_tombstone: body.requires_tombstone || false,
          status: body.status || "intake",
          intake_day: body.intake_day || null,
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, case: data });
  } catch (err) {
    console.error("❌ Error creating case:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to create case",
    });
  }
});

// --------------------------------------------------
// 🟢 PUT update existing case
// --------------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const updates = req.body;

    const { data, error } = await supabase
      .from("cases")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;

    res.json({ success: true, case: data });
  } catch (err) {
    console.error("❌ Error updating case:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to update case",
    });
  }
});

// --------------------------------------------------
// 🟢 DELETE case
// --------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { error } = await supabase
      .from("cases")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ success: true, message: "Case deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting case:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete case" });
  }
});

module.exports = router;
