// client/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import VehicleCalendar from '../components/VehicleCalendar';

export default function Dashboard() {
  const [stats, setStats] = useState({ upcoming: 0, vehiclesNeeded: 0, vehiclesAvailable: 0, conflicts: false, lowStock: [], cowsAssigned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    fetch(`${API_URL}/api/dashboard`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-red-800 text-center mb-8">Thusanang Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded shadow"><h3>Upcoming</h3><p className="text-3xl">{stats.upcoming}</p></div>
        <div className="bg-white p-6 rounded shadow"><h3>Vehicles Needed</h3><p className="text-3xl">{stats.vehiclesNeeded}</p></div>
        <div className="bg-white p-6 rounded shadow"><h3>Low Stock</h3><p className="text-3xl">{stats.lowStock.length}</p></div>
        <div className="bg-white p-6 rounded shadow"><h3>Cows</h3><p className="text-3xl">{stats.cowsAssigned}/8</p></div>
      </div>
      <VehicleCalendar />
    </div>
  );
}