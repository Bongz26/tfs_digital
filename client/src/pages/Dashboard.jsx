// client/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    // Fetch dashboard stats and cases
    Promise.all([
      fetch(`${API_URL}/api/dashboard`)
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .catch(err => {
          console.error('Dashboard error:', err);
          return {
            upcoming: 0,
            vehiclesNeeded: 0,
            vehiclesAvailable: 0,
            conflicts: false,
            lowStock: [],
            cowsAssigned: 0
          };
        }),
      fetch(`${API_URL}/api/cases`)
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .then(data => data.cases || [])
        .catch(err => {
          console.error('Cases error:', err);
          return [];
        })
    ])
    .then(([dashboardData, casesData]) => {
      // ✅ Ensure all expected fields exist (in case backend changes)
      setStats({
        upcoming: dashboardData.upcoming ?? 0,
        vehiclesNeeded: dashboardData.vehiclesNeeded ?? 0,
        vehiclesAvailable: dashboardData.vehiclesAvailable ?? 0,
        conflicts: !!dashboardData.conflicts,
        lowStock: Array.isArray(dashboardData.lowStock) ? dashboardData.lowStock : [],
        cowsAssigned: dashboardData.cowsAssigned ?? 0
      });
      setCases(Array.isArray(casesData) ? casesData : []);
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

      {/* CASES TABLE SECTION */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600 mb-6">
        <h2 className="text-2xl font-bold text-red-800 mb-6 text-center">
          Recent Cases
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-left font-semibold text-gray-700">Case Number</th>
                <th className="p-3 text-left font-semibold text-gray-700">Deceased Name</th>
                <th className="p-3 text-left font-semibold text-gray-700">Next of Kin</th>
                <th className="p-3 text-left font-semibold text-gray-700">Funeral Date</th>
                <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    No cases found
                  </td>
                </tr>
              ) : (
                cases.slice(0, 10).map((caseItem) => (
                  <tr key={caseItem.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-semibold text-gray-800">{caseItem.case_number || 'N/A'}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-800">{caseItem.deceased_name || 'N/A'}</div>
                      {caseItem.deceased_id && (
                        <div className="text-sm text-gray-600">ID: {caseItem.deceased_id}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-gray-800">{caseItem.nok_name || 'N/A'}</div>
                      {caseItem.nok_contact && (
                        <div className="text-sm text-gray-600">{caseItem.nok_contact}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-gray-800">
                        {caseItem.funeral_date ? new Date(caseItem.funeral_date).toLocaleDateString() : 'N/A'}
                      </div>
                      {caseItem.funeral_time && (
                        <div className="text-sm text-gray-600">{caseItem.funeral_time}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        caseItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                        caseItem.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        caseItem.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {caseItem.status || 'intake'}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link 
                        to={`/cases/${caseItem.id}`} 
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
