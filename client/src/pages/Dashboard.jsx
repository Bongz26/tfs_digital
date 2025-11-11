// client/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import VehicleCalendar from '../components/VehicleCalendar';

export default function Dashboard() {
  const [stats, setStats] = useState({
    upcoming: 0,
    vehiclesNeeded: 0,
    vehiclesAvailable: 0,
    conflicts: false,
    lowStock: [],
    cowsAssigned: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    fetch(`${API_URL}/api/dashboard`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(data => {
        // ✅ Ensure all expected fields exist (in case backend changes)
        setStats({
          upcoming: data.upcoming ?? 0,
          vehiclesNeeded: data.vehiclesNeeded ?? 0,
          vehiclesAvailable: data.vehiclesAvailable ?? 0,
          conflicts: !!data.conflicts,
          lowStock: Array.isArray(data.lowStock) ? data.lowStock : [], // ✅
          cowsAssigned: data.cowsAssigned ?? 0
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Dashboard error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-red-600">
        Loading Live Data...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-red-800 mb-2">
          THUSANANG FUNERAL SERVICES
        </h1>
        <p className="text-yellow-600 text-xl font-semibold">
          Live from QwaQwa • Re tšotella lechaba la rona
        </p>
      </div>

      {/* VEHICLE CONFLICT NOTICE */}
      {stats.conflicts && (
        <div className="bg-red-100 border-l-4 border-red-600 p-6 mb-8 rounded-r-lg shadow">
          <p className="font-bold text-red-800 text-xl">VEHICLE CONFLICT</p>
          <p>{stats.vehiclesNeeded} needed • {stats.vehiclesAvailable} available</p>
        </div>
      )}

      {/* MAIN DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
          <h3 className="text-lg font-semibold text-gray-700">Upcoming Funerals</h3>
          <p className="text-5xl font-bold text-red-600 mt-2">{stats.upcoming}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
          <h3 className="text-lg font-semibold text-gray-700">Vehicles Needed</h3>
          <p className="text-5xl font-bold text-orange-600 mt-2">{stats.vehiclesNeeded}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          {/* ✅ Added optional chaining just in case */}
          <p className="text-5xl font-bold text-yellow-600 mt-2">
            {stats.lowStock?.length ?? 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-600">
          <h3 className="text-lg font-semibold text-gray-700">Cows Assigned</h3>
          <p className="text-5xl font-bold text-green-600 mt-2">{stats.cowsAssigned}/8</p>
        </div>
      </div>

      {/* VEHICLE CALENDAR SECTION */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600">
        <h2 className="text-2xl font-bold text-red-800 mb-6 text-center">
          Saturday 15 Nov — Live Roster
        </h2>
        <VehicleCalendar />
      </div>

      {/* FOOTER */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>
          Toll Free: <span className="font-bold text-red-600">0800 01 4574</span> | Serving with Dignity
        </p>
      </div>
    </div>
  );
}
