import React, { useState, useEffect } from "react";
import { getRouteForCase } from "../api/directions";
import RouteMap from "./RouteMap";

/**
 * RouteDirections Component
 * Shows directions and optional map for a case
 * 
 * @param {number} caseId - Case ID
 * @param {string} vehicleLocation - Optional current vehicle location
 * @param {boolean} showMap - Whether to show map (default: true)
 */
const RouteDirections = ({ caseId, vehicleLocation = null, showMap = true }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState(null);

  useEffect(() => {
    if (caseId) {
      fetchRoute();
    }
  }, [caseId, vehicleLocation]);

  const fetchRoute = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getRouteForCase(caseId, vehicleLocation);
      
      if (data.success) {
        setRouteData(data);
      } else {
        setError(data.error || "Failed to get route");
      }
    } catch (err) {
      console.error("Error fetching route:", err);
      setError(err.response?.data?.error || "Failed to fetch route");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800 mr-3"></div>
          <span className="text-gray-600">Loading route...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">⚠️ {error}</p>
        <button
          onClick={fetchRoute}
          className="mt-2 text-sm text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!routeData) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
        No route data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Route Summary */}
      <div className="mb-4 pb-4 border-b">
        <h3 className="text-lg font-bold text-gray-800 mb-2">📍 Route Information</h3>
        
        {routeData.venueName && (
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">Destination:</span> {routeData.venueName}
          </p>
        )}
        
        {routeData.venueAddress && (
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold">Address:</span> {routeData.venueAddress}
          </p>
        )}

        <div className="flex gap-4 mt-3">
          <div className="flex-1 bg-blue-50 p-2 rounded">
            <p className="text-xs text-gray-600">Distance</p>
            <p className="text-lg font-bold text-blue-800">{routeData.distance}</p>
          </div>
          <div className="flex-1 bg-green-50 p-2 rounded">
            <p className="text-xs text-gray-600">Duration</p>
            <p className="text-lg font-bold text-green-800">{routeData.duration}</p>
          </div>
        </div>
      </div>

      {/* Map */}
      {showMap && routeData.startAddress && routeData.endAddress && (
        <div className="mb-4">
          <RouteMap
            origin={routeData.startAddress}
            destination={routeData.endAddress}
            routeData={routeData}
            height="300px"
          />
        </div>
      )}

      {/* Turn-by-Turn Directions */}
      {routeData.steps && routeData.steps.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-2">Turn-by-Turn Directions</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {routeData.steps.map((step, index) => (
              <div
                key={index}
                className="flex gap-3 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-red-800 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div
                    className="text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ __html: step.instruction }}
                  />
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>📍 {step.distance}</span>
                    <span>⏱️ {step.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routeData.startAddress || '')}&destination=${encodeURIComponent(routeData.endAddress || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center text-sm font-semibold transition-colors"
        >
          🗺️ Open in Google Maps
        </a>
      </div>
    </div>
  );
};

export default RouteDirections;

