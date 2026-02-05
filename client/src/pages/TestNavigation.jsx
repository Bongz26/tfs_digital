import React, { useState } from "react";
import RouteMap from "../components/RouteMap";
import RouteDirections from "../components/RouteDirections";
import { getDirections, getRouteForCase } from "../api/directions";

/**
 * Test Page for Navigation Components
 * Use this page to test the routing and navigation features
 */
const TestNavigation = () => {
  const [testMode, setTestMode] = useState("map"); // "map" or "case"
  const [origin, setOrigin] = useState("Manekeng, Free State, South Africa");
  const [destination, setDestination] = useState("");
  const [caseId, setCaseId] = useState("");
  const [vehicleLocation, setVehicleLocation] = useState("Manekeng, Free State");
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Test with a simple route
  const testSimpleRoute = async () => {
    if (!origin || !destination) {
      alert("Please enter both origin and destination");
      return;
    }

    setLoading(true);
    setError(null);
    setRouteData(null);

    try {
      const data = await getDirections(origin, destination);
      if (data.success) {
        setRouteData(data);
      } else {
        setError(data.error || "Failed to get directions");
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.response?.data?.error || "Failed to fetch directions");
    } finally {
      setLoading(false);
    }
  };

  // Quick test locations (South Africa)
  const quickLocations = [
    { name: "Manekeng", value: "Manekeng, Free State, South Africa" },
    { name: "QwaQwa", value: "QwaQwa, Free State, South Africa" },
    { name: "Bloemfontein", value: "Bloemfontein, Free State, South Africa" },
    { name: "Welkom", value: "Welkom, Free State, South Africa" },
    { name: "Bethlehem", value: "Bethlehem, Free State, South Africa" }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🗺️ Navigation & Routing Test Page
        </h1>
        <p className="text-gray-600 mb-6">
          Test the vehicle navigation and routing features. You can test either a simple route map
          or get directions for a specific case.
        </p>

        {/* Mode Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTestMode("map")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              testMode === "map"
                ? "bg-red-800 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Test Simple Route Map
          </button>
          <button
            onClick={() => setTestMode("case")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              testMode === "case"
                ? "bg-red-800 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Test Case Route
          </button>
        </div>

        {/* Simple Route Map Test */}
        {testMode === "map" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h2 className="font-bold text-blue-800 mb-2">📍 Test Simple Route Map</h2>
              <p className="text-sm text-blue-700">
                Enter two locations and see the route displayed on a map.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Origin (Starting Point)
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Manekeng, Free State"
                />
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Quick select:</p>
                  <div className="flex flex-wrap gap-1">
                    {quickLocations.map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => setOrigin(loc.value)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination (Ending Point)
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="QwaQwa, Free State"
                />
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Quick select:</p>
                  <div className="flex flex-wrap gap-1">
                    {quickLocations.map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => setDestination(loc.value)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={testSimpleRoute}
              disabled={loading || !origin || !destination}
              className="bg-red-800 text-white px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? "Loading Route..." : "🗺️ Get Route"}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-600">⚠️ {error}</p>
              </div>
            )}

            {routeData && !error && (
              <div className="mt-4">
                <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                  <h3 className="font-bold text-green-800 mb-2">✅ Route Found!</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Distance:</p>
                      <p className="text-lg font-bold text-green-800">{routeData.distance}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration:</p>
                      <p className="text-lg font-bold text-green-800">{routeData.duration}</p>
                    </div>
                  </div>
                </div>

                {routeData && (
                  <div className="bg-white border border-gray-200 rounded p-4">
                    <h3 className="font-bold mb-3">Map:</h3>
                    <RouteMap
                      origin={origin}
                      destination={destination}
                      routeData={routeData}
                      height="500px"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Case Route Test */}
        {testMode === "case" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h2 className="font-bold text-green-800 mb-2">📋 Test Case Route</h2>
              <p className="text-sm text-green-700">
                Enter a case ID to get directions from vehicle location to the case venue.
                The case must have venue coordinates (venue_lat, venue_lng) set.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case ID
                </label>
                <input
                  type="number"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="123"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the ID of a case that has venue coordinates
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Location (Optional)
                </label>
                <input
                  type="text"
                  value={vehicleLocation}
                  onChange={(e) => setVehicleLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Manekeng, Free State"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Defaults to "Manekeng, Free State" if not provided
                </p>
              </div>
            </div>

            {caseId && (
              <div className="bg-white border border-gray-200 rounded p-4">
                <RouteDirections
                  caseId={parseInt(caseId)}
                  vehicleLocation={vehicleLocation || null}
                  showMap={true}
                />
              </div>
            )}
          </div>
        )}

        {/* API Key Status Check */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ Setup Checklist</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>
              ☐ Google Maps API key set in <code className="bg-yellow-100 px-1 rounded">server/.env</code> (GOOGLE_MAPS_API_KEY)
            </li>
            <li>
              ☐ Google Maps API key set in <code className="bg-yellow-100 px-1 rounded">client/.env</code> (REACT_APP_GOOGLE_MAPS_API_KEY)
            </li>
            <li>
              ☐ Maps JavaScript API enabled in Google Cloud Console
            </li>
            <li>
              ☐ Directions API enabled in Google Cloud Console
            </li>
            <li>
              ☐ Servers restarted after adding API keys
            </li>
          </ul>
          {(() => {
            try {
              if (window.google && window.google.maps) {
                return <p className="text-xs text-green-600 mt-2">✅ Google Maps API loaded successfully!</p>;
              } else {
                const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
                if (existingScript) {
                  return <p className="text-xs text-yellow-600 mt-2">⏳ Google Maps API is loading...</p>;
                } else {
                  return <p className="text-xs text-red-600 mt-2">⚠️ Google Maps API not loaded. Check your REACT_APP_GOOGLE_MAPS_API_KEY in client/.env</p>;
                }
              }
            } catch (e) {
              return <p className="text-xs text-red-600 mt-2">⚠️ Error checking Google Maps API status</p>;
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default TestNavigation;

