// client/src/components/VehicleCalendar.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function VehicleCalendar() {
  const [roster, setRoster] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    // Fetch both roster and cases
    Promise.all([
      fetch(`${API_URL}/api/roster`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/cases`).then(r => r.json()).then(data => data.cases || []).catch(() => [])
    ])
    .then(([rosterData, casesData]) => {
      setRoster(Array.isArray(rosterData) ? rosterData : []);
      setCases(Array.isArray(casesData) ? casesData : []);
      setLoading(false);
    })
    .catch(() => {
      setRoster([]);
      setCases([]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    );
  }

  // If roster has data, show roster. Otherwise, show cases
  const displayData = roster.length > 0 ? roster : cases;
  const isRoster = roster.length > 0;

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">
        {isRoster ? 'Live Roster' : 'Recent Cases'}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              {isRoster && (
                <>
                  <th className="p-3 text-left font-semibold text-gray-700">Vehicle</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Assignment</th>
                </>
              )}
              {!isRoster && (
                <>
                  <th className="p-3 text-left font-semibold text-gray-700">Case Number</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Deceased Name</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Funeral Date</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                </>
              )}
              <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={isRoster ? 3 : 5} className="p-4 text-center text-gray-500">
                  {isRoster ? 'No assignments scheduled' : 'No cases found'}
                </td>
              </tr>
            ) : (
              displayData.map((item, i) => (
                <tr key={item.id || i} className="border-b hover:bg-gray-50">
                  {isRoster ? (
                    <>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{item.reg_number || 'N/A'}</div>
                        <div className="text-sm text-gray-600">{item.driver_name || 'N/A'}</div>
                        {item.vehicle_type && (
                          <div className="text-xs text-gray-500">{item.vehicle_type}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{item.case_number || 'N/A'}</div>
                        <div className="text-sm text-gray-600">{item.venue_name || 'N/A'}</div>
                        {item.funeral_time && (
                          <div className="text-xs text-gray-500">{item.funeral_time}</div>
                        )}
                      </td>
                      <td className="p-3">
                        {item.case_id && (
                          <Link 
                            to={`/cases/${item.case_id}`} 
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            View Details
                          </Link>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{item.case_number || 'N/A'}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-800">{item.deceased_name || 'N/A'}</div>
                        {item.nok_name && (
                          <div className="text-sm text-gray-600">NOK: {item.nok_name}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-gray-800">
                          {item.funeral_date ? new Date(item.funeral_date).toLocaleDateString() : 'N/A'}
                        </div>
                        {item.funeral_time && (
                          <div className="text-sm text-gray-600">{item.funeral_time}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status || 'intake'}
                        </span>
                      </td>
                      <td className="p-3">
                        <Link 
                          to={`/cases/${item.id}`} 
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}