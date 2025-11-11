// server/routes/dashboard.js
const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    console.log("📊 [Dashboard API] Fetching dashboard data...");

    // Example query — adjust table name if different
    const { data, error } = await supabase.from("cases").select("*");

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Dashboard fetched ${data?.length || 0} records`);
    res.json({ totalCases: data?.length || 0, cases: data });
  } catch (err) {
    console.error("🔥 Unexpected error in /api/dashboard:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
