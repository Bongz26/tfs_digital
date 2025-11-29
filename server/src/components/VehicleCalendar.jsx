// client/src/components/VehicleCalendar.jsx
import React, { useEffect, useState } from 'react';
import { API_HOST } from '../api/config';

export default function VehicleCalendar() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming' or 'past'

  useEffect(() => {
    const API_URL = API_HOST;
    fetch(`${API_URL}/api/roster`)
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
      .then(data => setRoster(data.roster || []))
      .catch(err => {
        console.error('Roster fetch error:', err);
        setRoster([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter roster based on view mode
  const filteredRoster = roster.filter(item => {
    if (!item.funeral_date) return viewMode === 'upcoming'; // Include items without dates in upcoming
    
    const funeralDate = new Date(item.funeral_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (viewMode === 'upcoming') {
      return funeralDate >= today;
    } else {
      return funeralDate < today;
    }
  });

  // Sort: upcoming by date ascending, past by date descending
  const sortedRoster = [...filteredRoster].sort((a, b) => {
    if (!a.funeral_date || !b.funeral_date) return 0;
    const dateA = new Date(a.funeral_date);
    const dateB = new Date(b.funeral_date);
    
    if (viewMode === 'upcoming') {
      return dateA - dateB; // Ascending (earliest first)
    } else {
      return dateB - dateA; // Descending (most recent first)
    }
  });

  if (loading) {
    return (
      <div className="text-center py-8 text-red-600 font-semibold">
        Loading Live Roster...
      </div>
    );
  }

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-lg border-2 border-red-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode('upcoming')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              viewMode === 'upcoming'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📅 Upcoming Services
          </button>
          <button
            onClick={() => setViewMode('past')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              viewMode === 'past'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📜 Past Services
          </button>
        </div>
      </div>

      {/* Empty State */}
      {sortedRoster.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed border-red-300 rounded-xl">
          <p className="text-gray-700 text-lg font-medium">
            {viewMode === 'upcoming' 
              ? 'No upcoming services scheduled.'
              : 'No past services found.'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {viewMode === 'upcoming'
              ? 'Once services are scheduled, they will appear here.'
              : 'Past services will appear here once they are completed.'}
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-4 text-center">
            <p className="text-gray-600">
              Showing <span className="font-bold text-red-600">{sortedRoster.length}</span> {viewMode === 'upcoming' ? 'upcoming' : 'past'} service{sortedRoster.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Roster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRoster.map((item) => (
        <div
          key={item.id}
          className="bg-white border-l-4 border-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-red-700">
              {item.case_number || `CASE-${item.case_id || item.id}`}
            </h3>
            <span className="text-sm text-gray-500">
              {item.funeral_date
                ? new Date(item.funeral_date).toLocaleDateString('en-ZA', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Date TBA'}
            </span>
          </div>

          {/* Deceased Name */}
          <p className="text-gray-800 font-semibold text-xl mb-2">
            {item.deceased_name || 'Deceased Name Not Available'}
          </p>

          {/* Venue */}
          <p className="text-gray-600 text-sm mb-1">
            📍 <span className="font-medium">{item.venue_name || 'Venue To Be Announced'}</span>
          </p>

          {/* Time */}
          <p className="text-gray-600 text-sm mb-1">
            ⏰ Funeral Time: <span className="font-medium">{item.funeral_time || 'Time To Be Announced'}</span>
          </p>

          {/* Delivery Time */}
          {item.delivery_date && item.delivery_time && (
            <p className="text-gray-600 text-sm mb-1">
              🚚 Delivery: <span className="font-medium">
                {new Date(item.delivery_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} at {item.delivery_time}
              </span>
            </p>
          )}

          {/* Driver Info */}
          <div className="bg-yellow-50 p-3 rounded-lg mt-3 border border-yellow-200">
            <p className="text-yellow-800 font-semibold flex items-center">
              👤 {item.driver_name || item.vehicle_driver_name || 'Driver not assigned'}
            </p>
            <p className="text-yellow-700 text-sm">
              🚗 {item.vehicle_type ? item.vehicle_type.toUpperCase().replace('_', ' ') : '—'} — {item.reg_number || '—'}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Funeral: {item.funeral_date 
                ? `${new Date(item.funeral_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}${item.funeral_time ? ` at ${item.funeral_time}` : ''}`
                : 'Date not set'}
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
        </>
      )}
    </div>
  );
}
