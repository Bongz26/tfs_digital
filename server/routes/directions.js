// server/routes/directions.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * GET /api/directions
 * Get directions from origin to destination using Google Maps Directions API
 * 
 * Query params:
 * - origin: Starting location (address or lat,lng)
 * - destination: Ending location (address or lat,lng)
 * - waypoints: Optional intermediate points (pipe-separated: "point1|point2|point3")
 */
router.get('/', async (req, res) => {
    try {
        const { origin, destination, waypoints } = req.query;

        if (!origin || !destination) {
            return res.status(400).json({
                success: false,
                error: 'Origin and destination are required'
            });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn('⚠️  GOOGLE_MAPS_API_KEY not set - directions will not work');
            return res.status(500).json({
                success: false,
                error: 'Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY in .env'
            });
        }

        // Build Google Maps Directions API URL
        let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;
        
        // Add waypoints if provided
        if (waypoints) {
            url += `&waypoints=${encodeURIComponent(waypoints)}`;
        }

        // Add South Africa language preference
        url += '&language=en&region=za';

        console.log(`🗺️  Fetching directions from "${origin}" to "${destination}"`);

        const response = await axios.get(url);

        if (response.data.status === 'OK' && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            const leg = route.legs[0]; // Get first leg (for simple routes)

            const directionsData = {
                success: true,
                distance: leg.distance.text,
                distanceMeters: leg.distance.value,
                duration: leg.duration.text,
                durationSeconds: leg.duration.value,
                startAddress: leg.start_address,
                endAddress: leg.end_address,
                steps: leg.steps.map(step => ({
                    instruction: step.html_instructions,
                    distance: step.distance.text,
                    duration: step.duration.text,
                    startLocation: {
                        lat: step.start_location.lat,
                        lng: step.start_location.lng
                    },
                    endLocation: {
                        lat: step.end_location.lat,
                        lng: step.end_location.lng
                    }
                })),
                polyline: route.overview_polyline.points,
                bounds: route.bounds,
                fullResponse: response.data // Include full response for advanced use cases
            };

            res.json(directionsData);
        } else {
            console.error('❌ Directions API error:', response.data.status, response.data.error_message);
            res.status(400).json({
                success: false,
                error: response.data.error_message || 'Unable to get directions',
                status: response.data.status
            });
        }
    } catch (err) {
        console.error('❌ Error fetching directions:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch directions',
            details: err.message
        });
    }
});

/**
 * POST /api/directions/route
 * Get route for a case (from vehicle location to venue)
 * 
 * Body:
 * - caseId: Case ID
 * - vehicleLocation: Current vehicle location (optional, defaults to vehicle's current_location)
 */
router.post('/route', async (req, res) => {
    try {
        const { caseId, vehicleLocation } = req.body;

        if (!caseId) {
            return res.status(400).json({
                success: false,
                error: 'caseId is required'
            });
        }

        // Get case details with venue location
        const { query } = require('../config/db');
        const caseResult = await query(
            'SELECT venue_name, venue_address, venue_lat, venue_lng FROM cases WHERE id = $1',
            [caseId]
        );

        if (caseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Case not found'
            });
        }

        const caseData = caseResult.rows[0];

        if (!caseData.venue_lat || !caseData.venue_lng) {
            return res.status(400).json({
                success: false,
                error: 'Venue coordinates not set for this case. Please set venue location first.'
            });
        }

        // Determine origin (vehicle location or default location)
        const origin = vehicleLocation || 'Manekeng, Free State, South Africa';
        const destination = `${caseData.venue_lat},${caseData.venue_lng}`;

        // Fetch directions using the same logic
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: 'Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY in .env'
            });
        }

        let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}&language=en&region=za`;

        const response = await axios.get(url);

        if (response.data.status === 'OK' && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            const leg = route.legs[0];

            const directionsData = {
                success: true,
                distance: leg.distance.text,
                distanceMeters: leg.distance.value,
                duration: leg.duration.text,
                durationSeconds: leg.duration.value,
                startAddress: leg.start_address,
                endAddress: leg.end_address,
                venueName: caseData.venue_name,
                venueAddress: caseData.venue_address,
                steps: leg.steps.map(step => ({
                    instruction: step.html_instructions,
                    distance: step.distance.text,
                    duration: step.duration.text,
                    startLocation: {
                        lat: step.start_location.lat,
                        lng: step.start_location.lng
                    },
                    endLocation: {
                        lat: step.end_location.lat,
                        lng: step.end_location.lng
                    }
                })),
                polyline: route.overview_polyline.points,
                bounds: route.bounds
            };

            res.json(directionsData);
        } else {
            res.status(400).json({
                success: false,
                error: response.data.error_message || 'Unable to get directions',
                status: response.data.status
            });
        }
    } catch (err) {
        console.error('❌ Error getting route for case:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get route',
            details: err.message
        });
    }
});

module.exports = router;

