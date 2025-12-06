// client/src/components/VehicleCalendar.jsx
import React, { useEffect, useState } from 'react';
import { API_HOST } from '../api/config';

export default function VehicleCalendar() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('upcoming');

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

  const filteredRoster = roster.filter(item => {
    if (!item.funeral_date) return viewMode !== 'past';
    const funeralDate = new Date(item.funeral_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (viewMode === 'past') return funeralDate < today;
    return funeralDate >= today;
  });

  const sortedRoster = [...filteredRoster].sort((a, b) => {
    if (!a.funeral_date || !b.funeral_date) return 0;
    const dateA = new Date(a.funeral_date);
    const dateB = new Date(b.funeral_date);
    if (viewMode === 'past') return dateB - dateA;
    return dateA - dateB;
  });

  const groupByCase = items => {
    const map = new Map();
    items.forEach(i => {
      const key = i.case_id || i.id;
      const existing = map.get(key) || {
        case_id: i.case_id || i.id,
        case_number: i.case_number || null,
        deceased_name: i.deceased_name || null,
        funeral_date: i.funeral_date || null,
        funeral_time: i.funeral_time || null,
        delivery_date: i.delivery_date || null,
        delivery_time: i.delivery_time || null,
        venue_name: i.venue_name || null,
        assignments: []
      };
      existing.assignments.push({
        id: i.id,
        driver_name: i.driver_name || i.vehicle_driver_name || null,
        vehicle_type: i.vehicle_type || null,
        reg_number: i.reg_number || null,
        pickup_time: i.pickup_time || null,
        status: i.status || null
      });
      map.set(key, existing);
    });
    return Array.from(map.values());
  };

  const groupByDriver = items => {
    const map = new Map();
    items.forEach(i => {
      const name = (i.driver_name || i.vehicle_driver_name || '').trim();
      if (!name) return;
      const existing = map.get(name) || { driver_name: name, assignments: [] };
      existing.assignments.push({
        case_id: i.case_id || i.id,
        case_number: i.case_number || null,
        deceased_name: i.deceased_name || null,
        funeral_date: i.funeral_date || null,
        funeral_time: i.funeral_time || null,
        venue_name: i.venue_name || null,
        vehicle_type: i.vehicle_type || null,
        reg_number: i.reg_number || null,
        status: i.status || null
      });
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.driver_name.localeCompare(b.driver_name));
  };

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
          <button
            onClick={() => setViewMode('drivers')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              viewMode === 'drivers'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            👤 Driver Groups
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
          <div className="mb-4 text-center">
            <p className="text-gray-600">
              {viewMode === 'drivers' ? (
                <>Showing <span className="font-bold text-red-600">{groupByDriver(sortedRoster).length}</span> driver group{groupByDriver(sortedRoster).length !== 1 ? 's' : ''}</>
              ) : (
                <>Showing <span className="font-bold text-red-600">{groupByCase(sortedRoster).length}</span> case{groupByCase(sortedRoster).length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>

          {viewMode === 'drivers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupByDriver(sortedRoster).map(group => (
                <div key={group.driver_name} className="bg-white border-l-4 border-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-red-700">{group.driver_name}</h3>
                    <span className="text-sm text-gray-500">{group.assignments.length} assignment{group.assignments.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-3">
                    {group.assignments.map((a, idx) => (
                      <div key={idx} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-yellow-700 text-sm">
                          🚗 {a.vehicle_type ? a.vehicle_type.toUpperCase().replace('_', ' ') : '—'} — {a.reg_number || '—'}
                        </p>
                        <p className="text-gray-800 text-sm font-semibold mt-1">
                          {a.case_number || `CASE-${a.case_id}`}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {a.deceased_name || '—'} • {a.venue_name || '—'}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            a.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : a.status === 'en_route'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {a.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupByCase(sortedRoster).map(group => (
                <div key={group.case_id} className="bg-white border-l-4 border-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-red-700">{group.case_number || `CASE-${group.case_id}`}</h3>
                    <span className="text-sm text-gray-500">
                      {group.funeral_date
                        ? new Date(group.funeral_date).toLocaleDateString('en-ZA', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'Date TBA'}
                    </span>
                  </div>
                  <p className="text-gray-800 font-semibold text-xl mb-2">{group.deceased_name || 'Deceased Name Not Available'}</p>
                  <p className="text-gray-600 text-sm mb-1">📍 <span className="font-medium">{group.venue_name || 'Venue To Be Announced'}</span></p>
                  <p className="text-gray-600 text-sm mb-1">⏰ Funeral Time: <span className="font-medium">{group.funeral_time || 'Time To Be Announced'}</span></p>
                  {group.delivery_date && group.delivery_time && (
                    <p className="text-gray-600 text-sm mb-1">🚚 Delivery: <span className="font-medium">{new Date(group.delivery_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} at {group.delivery_time}</span></p>
                  )}
                  <div className="mt-3 space-y-3">
                    {group.assignments.map((a, idx) => (
                      <div key={idx} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 font-semibold flex items-center">👤 {a.driver_name || 'Driver not assigned'}</p>
                        <p className="text-yellow-700 text-sm">🚗 {a.vehicle_type ? a.vehicle_type.toUpperCase().replace('_', ' ') : '—'} — {a.reg_number || '—'}</p>
                        <div className="mt-2 flex justify-end">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            a.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : a.status === 'en_route'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {a.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
