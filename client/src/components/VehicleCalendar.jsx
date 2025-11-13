// client/src/components/VehicleCalendar.jsx
import React, { useEffect, useState } from 'react';

export default function VehicleCalendar() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    fetch(`${API_URL}/api/roster`)
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
      .then(data => setRoster(data.roster || []))
      .catch(err => {
        console.error('Roster fetch error:', err);
        setRoster([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-red-600 font-semibold">
        Loading Live Roster...
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 border border-dashed border-red-300 rounded-xl">
        <p className="text-gray-700 text-lg font-medium">
          No assigned vehicles or drivers yet.
        </p>
        <p className="text-sm text-gray-500">Once a driver is assigned, they’ll appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roster.map((item) => (
        <div
          key={item.id}
          className="bg-white border-l-4 border-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-red-700">
              {item.case_number || `CASE-${item.id}`}
            </h3>
            <span className="text-sm text-gray-500">
              {item.funeral_date
                ? new Date(item.funeral_date).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>

          {/* Deceased Name */}
          <p className="text-gray-800 font-semibold text-xl mb-2">
            {item.deceased_name || 'Unknown Deceased'}
          </p>

          {/* Venue */}
          <p className="text-gray-600 text-sm mb-1">
            📍 <span className="font-medium">{item.venue_name || 'TBD Venue'}</span>
          </p>

          {/* Time */}
          <p className="text-gray-600 text-sm mb-1">
            ⏰ Funeral Time: <span className="font-medium">{item.funeral_time || 'TBA'}</span>
          </p>

          {/* Driver Info */}
          <div className="bg-yellow-50 p-3 rounded-lg mt-3 border border-yellow-200">
            <p className="text-yellow-800 font-semibold flex items-center">
              👤 {item.driver_name || 'Driver not assigned'}
            </p>
            <p className="text-yellow-700 text-sm">
              🚗 {item.vehicle_type || '—'} — {item.reg_number || '—'}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Pickup: {item.pickup_time || '—'}
            </p>
          </div>

          {/* Status */}
          <div className="mt-3 flex justify-end">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold ${
                item.status === 'scheduled'
                  ? 'bg-blue-100 text-blue-700'
                  : item.status === 'en_route'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {item.status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
