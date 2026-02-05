// locationsController.js

exports.getAllLocations = async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        // Fetch distinct locations from inventory
        const { data, error } = await supabase
            .from('inventory')
            .select('location');

        if (error) throw error;

        // Extract unique locations and filter out nulls/empty strings
        const uniqueLocations = [...new Set(data.map(item => item.location).filter(Boolean))];

        // Map to format expected by frontend { id, name }
        // Using name as ID since we are deriving from distinct strings
        const locations = uniqueLocations.map(loc => ({
            id: loc,
            name: loc
        })).sort((a, b) => a.name.localeCompare(b.name));

        res.json({ success: true, locations });
    } catch (err) {
        console.error('❌ Error fetching locations:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch locations' });
    }
};
