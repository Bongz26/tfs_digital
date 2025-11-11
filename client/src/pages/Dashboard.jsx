// client/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import VehicleCalendar from '../components/VehicleCalendar';

export default function Dashboard() {
  const [stats, setStats] = useState({
    upcoming: 0,
    vehiclesNeeded: 0,
    vehiclesAvailable: 0,
    conflicts: false,
    lowStock: [],          // ← DEFAULT ARRAY
    cowsAssigned: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard')
      .then(r => r.json())
      .then(data => {
        setStats({
          upcoming: data.upcoming || 0,
          vehiclesNeeded: data.vehiclesNeeded || 0,
          vehiclesAvailable: data.vehiclesAvailable || 0,
          conflicts: data.conflicts || false,
          lowStock: Array.isArray(data.lowStock) ? data.lowStock : [], // ← SAFE
          cowsAssigned: data.cowsAssigned || 0
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Dashboard fetch error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-tfs-red">Loading Live Data...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto bg-tfs-light min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-tfs-red mb-2">Central Dashboard</h1>
        <p className="text-tfs-gold text-lg">Live from Supabase • QwaQwa</p>
      </div>

      {stats.conflicts && (
        <div className="bg-red-50 border-l-4 border-tfs-red p-6 mb-8 card">
          <p className="font-bold text-tfs-red text-xl">VEHICLE CONFLICT</p>
          <p>{stats.vehiclesNeeded} needed • {stats.vehiclesAvailable} available</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="card border-tfs-gold border-2 bg-gradient-to-br from-white to-tfs-light">
          <h3 className="text-lg font-semibold text-tfs-dark">Upcoming</h3>
          <p className="text-4xl font-bold text-tfs-red mt-2">{stats.upcoming}</p>
        </div>
        <div className="card border-tfs-gold border-2 bg-gradient-to-br from-white to-tfs-light">
          <h3 className="text-lg font-semibold text-tfs-dark">Vehicles Needed</h3>
          <p className="text-4xl font-bold text-red-600 mt-2">{stats.vehiclesNeeded}</p>
        </div>
        <div className="card border-tfs-gold border-2 bg-gradient-to-br from-white to-tfs-light">
          <h3 className="text-lg font-semibold text-tfs-dark">Low Stock</h3>
          <p className="text-4xl font-bold text-orange-600 mt-2">{stats.lowStock.length}</p>
        </div>
        <div className="card border-tfs-gold border-2 bg-gradient-to-br from-white to-tfs-light">
          <h3 className="text-lg font-semibold text-tfs-dark">Cows Assigned</h3>
          <p className="text-4xl font-bold text-tfs-gold mt-2">{stats.cowsAssigned}/8</p>
        </div>
      </div>

      <div className="card border-tfs-gold border-2">
        <h2 className="text-2xl font-bold text-tfs-red mb-6">
          Saturday 15 Nov - Live Roster
        </h2>
        <VehicleCalendar />
      </div>

      <div className="mt-12 text-center text-sm text-gray-600">
        <p>Toll Free: 0800 01 4574 | Re tšotella lechaba la rona</p>
      </div>
    </div>
  );
}