// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VehicleCalendar from '../components/VehicleCalendar';
import { searchCases } from '../api/cases';
import { fetchDashboardData as apiFetchDashboardData } from '../api/dashboard';

function getUpcomingSaturday() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday

  // How many days until Saturday
  const daysUntilSaturday = (6 - day + 7) % 7;

  const saturday = new Date();
  saturday.setDate(today.getDate() + daysUntilSaturday);

  return saturday;
}

function formatRosterDate(date) {
  return date.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "short"
  });
}


export default function Dashboard() {
  const [stats, setStats] = useState({
    upcoming: 0,
    vehiclesNeeded: 0,
    vehiclesAvailable: 0,
    conflicts: false,
    lowStock: [],
    cowsAssigned: 0
  });
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const data = await apiFetchDashboardData({ recentLimit: 5 });

        // Set stats from dashboard response
        setStats({
          upcoming: data.upcoming || 0,
          vehiclesNeeded: data.upcoming || 0, // vehicles needed = upcoming funerals
          vehiclesAvailable: data.vehiclesAvailable || 0,
          conflicts: data.conflicts || false,
          lowStock: data.lowStock || [],
          groceriesTotal: data.groceriesTotal || 0,
          groceriesSubmitted: data.groceriesSubmitted || 0,
          outstandingDrafts: data.outstandingDrafts || 0,
          outstandingIntakes: data.outstandingIntakes || 0
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

    loadDashboardData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    try {
      setSearchLoading(true);
      setSearchError('');
      const results = await searchCases(term, 10);
      setSearchResults(results);
    } catch (err) {
      setSearchError('Failed to search cases');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-red-800 mb-2">
            THUSANANG FUNERAL SERVICES
          </h1>
          <p className="text-yellow-600 text-xl font-semibold">
            Live from QwaQwa • Re tšotella sechaba sa rona
          </p>
        </div>
        <div className="p-8 text-center text-red-600">
          Loading Live Data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-red-800 mb-2">
            THUSANANG FUNERAL SERVICES
          </h1>
          <p className="text-yellow-600 text-xl font-semibold">
            Live from QwaQwa • Re tšotella sechaba sa rona
          </p>
        </div>
        <div className="p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="text-center mb-10">
        {/*<h1 className="text-5xl font-bold text-red-800 mb-2">
          THUSANANG FUNERAL SERVICES
        </h1>*/}
        <p className="text-yellow-600 text-xl font-semibold">
          Live from QwaQwa • Re tšotella sechaba sa rona
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

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-600">
          <h3 className="text-lg font-semibold text-gray-700">Outstanding Tasks</h3>
          <div className="mt-2 flex gap-6">
            <Link to="/?openDrafts=true" className="group block">
              <p className="text-2xl font-bold text-purple-800 group-hover:text-purple-600 transition">
                {stats.outstandingDrafts || 0}
              </p>
              <span className="text-sm font-normal text-gray-500 group-hover:text-purple-600 transition underline">Drafts</span>
            </Link>
            <div className="w-px bg-gray-200"></div>
            <Link to="/active-cases?status=intake" className="group block">
              <p className="text-2xl font-bold text-purple-600 group-hover:text-purple-800 transition">
                {stats.outstandingIntakes || 0}
              </p>
              <span className="text-sm font-normal text-gray-500 group-hover:text-purple-800 transition underline">Intakes</span>
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-600">
          <h3 className="text-lg font-semibold text-gray-700">Grocery Assigned</h3>
          <p className="text-5xl font-bold text-green-600 mt-2">{stats.groceriesSubmitted || 0}/{stats.groceriesTotal || 0}</p>
        </div>
      </div>

      {/* FIND CASE SECTION */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-red-800">Find Case</h2>
          <form className="flex gap-2" onSubmit={handleSearch}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, ID, Policy or Case No"
              className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />
            <button
              type="submit"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold text-sm"
            >
              Search
            </button>
            <Link
              to="/active-cases"
              className="inline-flex items-center bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition font-semibold text-sm"
            >
              View All
            </Link>
          </form>
        </div>

        {(searchLoading || searchError || searchResults.length > 0) && (
          <div>
            {searchLoading && (
              <div className="text-sm text-gray-600">Searching…</div>
            )}
            {searchError && (
              <div className="text-sm text-red-600">{searchError}</div>
            )}
            {!searchLoading && !searchError && searchResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-2 text-left font-semibold text-gray-700 text-sm">Case</th>
                      <th className="p-2 text-left font-semibold text-gray-700 text-sm">Name</th>
                      <th className="p-2 text-left font-semibold text-gray-700 text-sm">Policy</th>
                      <th className="p-2 text-left font-semibold text-gray-700 text-sm">ID</th>
                      <th className="p-2 text-left font-semibold text-gray-700 text-sm">Funeral</th>
                      <th className="p-2 text-left font-semibold text-gray-700 text-sm">Status</th>
                      <th className="p-2 text-left font-semibold text-gray-700 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-sm">{item.case_number || 'N/A'}</td>
                        <td className="p-2 text-sm">{item.deceased_name || 'N/A'}</td>
                        <td className="p-2 text-sm">{item.policy_number || '—'}</td>
                        <td className="p-2 text-sm">{item.deceased_id || '—'}</td>
                        <td className="p-2 text-sm">{item.funeral_date ? new Date(item.funeral_date).toLocaleDateString() : '—'}{item.funeral_time ? ` ${item.funeral_time}` : ''}</td>
                        <td className="p-2 text-sm">{item.status || '—'}</td>
                        <td className="p-2 text-sm">
                          <Link to={`/cases/${item.id}`} className="text-blue-600 hover:text-blue-800 underline font-medium">View Details</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECENT CASES TABLE SECTION */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-red-800">
            Recent Cases
          </h2>
          <Link
            to="/active-cases"
            className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold text-sm"
          >
            View All Active Cases
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 text-left font-semibold text-gray-700 text-sm">Case</th>
                <th className="p-2 text-left font-semibold text-gray-700 text-sm">Name</th>
                <th className="p-2 text-left font-semibold text-gray-700 text-sm">Funeral</th>
                <th className="p-2 text-left font-semibold text-gray-700 text-sm">Status</th>
                <th className="p-2 text-left font-semibold text-gray-700 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">
                    No recent cases found
                  </td>
                </tr>
              ) : (
                recentCases.map((caseItem) => (
                  <tr key={caseItem.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="font-semibold text-gray-800 text-sm">{caseItem.case_number || 'N/A'}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-gray-800 text-sm">{caseItem.deceased_name || 'N/A'}</div>
                      {caseItem.deceased_id && (
                        <div className="text-xs text-gray-600">ID: {caseItem.deceased_id}</div>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="text-gray-800 text-sm">
                        {caseItem.funeral_date ? new Date(caseItem.funeral_date).toLocaleDateString() : 'N/A'}
                      </div>
                      {caseItem.funeral_time && (
                        <div className="text-xs text-gray-600">{caseItem.funeral_time}</div>
                      )}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${caseItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                        caseItem.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          caseItem.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {caseItem.status || 'intake'}
                      </span>
                    </td>
                    <td className="p-2">
                      <Link
                        to={`/cases/${caseItem.id}`}
                        className="text-blue-600 hover:text-blue-800 underline font-medium text-sm"
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

      {/* QUICK ACTIONS SECTION */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600 mb-6">
        <h2 className="text-2xl font-bold text-red-800 mb-6 text-center">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/active-cases"
            className="bg-red-600 text-white p-6 rounded-xl hover:bg-red-700 transition text-center font-semibold text-lg shadow-lg"
          >
            Manage Active Cases
          </Link>
          <Link
            to="/roster"
            className="bg-blue-600 text-white p-6 rounded-xl hover:bg-blue-700 transition text-center font-semibold text-lg shadow-lg"
          >
            View Vehicle Roster
          </Link>
          <Link
            to="/stock"  // ✅ CHANGED FROM "/inventory" to "/stock"
            className="bg-green-600 text-white p-6 rounded-xl hover:bg-green-700 transition text-center font-semibold text-lg shadow-lg"
          >
            Check Inventory
          </Link>
        </div>
      </div>
      {/* VEHICLE CALENDAR SECTION */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600">
        <h2 className="text-2xl font-bold text-red-800 mb-6 text-center">
          {formatRosterDate(getUpcomingSaturday())} 🕊️ — Live Roster
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
