// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/dashboard`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Set stats from dashboard response
        setStats({
          upcoming: data.upcoming || 0,
          vehiclesAvailable: data.vehiclesAvailable || 0,
          conflicts: data.conflicts || false,
          lowStock: data.lowStock || [],
          cowsAssigned: data.cowsAssigned || 0
        });
        
        // Set recent cases from dashboard response
        setRecentCases(data.recentCases || []);
        
      } catch (err) {
        console.error('Dashboard error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-red-800 mb-8">
        TFS Digital Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-gray-700">Upcoming Funerals</h3>
          <p className="text-3xl font-bold text-red-600">{stats.upcoming}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-gray-700">Vehicles Available</h3>
          <p className="text-3xl font-bold text-green-600">{stats.vehiclesAvailable}</p>
          {stats.conflicts && (
            <p className="text-sm text-red-500 mt-2">Vehicle shortage!</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-gray-700">Cows Assigned</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.cowsAssigned}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.lowStock?.length || 0}</p>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Cases</h2>
          <Link to="/active-cases" className="text-blue-600 hover:underline">
            View All Active Cases →
          </Link>
        </div>
        
        {recentCases.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent cases found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Case Number</th>
                  <th className="px-4 py-2 text-left">Deceased Name</th>
                  <th className="px-4 py-2 text-left">Funeral Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCases.map((caseItem) => (
                  <tr key={caseItem.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{caseItem.case_number}</td>
                    <td className="px-4 py-2">{caseItem.deceased_name}</td>
                    <td className="px-4 py-2">
                      {new Date(caseItem.funeral_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        caseItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                        caseItem.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {caseItem.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link 
                        to={`/cases/${caseItem.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link 
            to="/active-cases" 
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
          >
            Manage Active Cases
          </Link>
          <Link 
            to="/roster" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            View Vehicle Roster
          </Link>
          <Link 
            to="/inventory" 
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Check Inventory
          </Link>
        </div>
      </div>
    </div>
  );
}