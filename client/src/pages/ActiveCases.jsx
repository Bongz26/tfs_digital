// src/pages/ActiveCases.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_HOST } from '../api/config';

export default function ActiveCases() {
  const [cases, setCases] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = API_HOST;

  // Fetch active cases and vehicles in one call
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Fetching active cases data...');
        const response = await fetch(`${API_URL}/api/active-cases`);
        
        // Check if response is OK before parsing as JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Active cases data received:', data);
        
        if (data.success) {
          setCases(data.cases || []);
          setVehicles(data.vehicles || []);
        } else {
          throw new Error(data.error || 'Failed to load data');
        }
      } catch (err) {
        console.error('Data fetch error:', err);
        setError(`Failed to load active cases: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_URL]);

  const assignVehicle = async (caseId) => {
    if (!selectedVehicle[caseId]) {
      alert('Please select a vehicle first');
      return;
    }
    
    const vehicle = selectedVehicle[caseId];

    try {
      const res = await fetch(`${API_URL}/api/cases/assign/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          driver_name: vehicle.driver_name || 'TBD',
          pickup_time: new Date().toISOString()
        })
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      alert('Vehicle assigned successfully!');
      window.location.reload(); // Refresh to show updated assignments
    } catch (err) {
      console.error('Assign error:', err);
      alert(`Failed to assign vehicle: ${err.message}`);
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
          Loading Active Cases...
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
        <h1 className="text-5xl font-bold text-red-800 mb-2">
          THUSANANG FUNERAL SERVICES
        </h1>
        <p className="text-yellow-600 text-xl font-semibold">
          Live from QwaQwa • Re tšotella sechaba sa rona
        </p>
      </div>

      {/* BACK TO DASHBOARD */}
      <div className="mb-6">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* PAGE TITLE */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-red-800 mb-2">
          Active Cases Management
        </h2>
        <p className="text-gray-600 text-lg">
          Manage vehicle assignments for upcoming funerals
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
          <h3 className="text-lg font-semibold text-gray-700">Total Active Cases</h3>
          <p className="text-4xl font-bold text-red-600 mt-2">{cases.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
          <h3 className="text-lg font-semibold text-gray-700">Vehicles Available</h3>
          <p className="text-4xl font-bold text-orange-600 mt-2">{vehicles.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-gray-700">Unassigned Cases</h3>
          <p className="text-4xl font-bold text-yellow-600 mt-2">
            {cases.filter(c => !c.roster || c.roster.length === 0).length}
          </p>
        </div>
      </div>

      {/* ACTIVE CASES TABLE */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600 mb-6">
        <h2 className="text-2xl font-bold text-red-800 mb-6 text-center">
          Active Cases & Vehicle Assignment
        </h2>

        {cases.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">No active cases found.</p>
            <p className="text-sm">All cases are either completed or there are no upcoming funerals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-4 text-left font-semibold text-gray-700">Case Number</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Deceased Name</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Funeral Date</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Status</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Vehicle Assigned</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{c.case_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-800">{c.deceased_name}</div>
                      {c.deceased_id && (
                        <div className="text-sm text-gray-600">ID: {c.deceased_id}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-gray-800">
                        {new Date(c.funeral_date).toLocaleDateString()}
                      </div>
                      {c.funeral_time && (
                        <div className="text-sm text-gray-600">{c.funeral_time}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        c.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {c.roster && c.roster.length > 0 ? (
                        <div className="text-green-600 font-medium">
                          ✓ Assigned
                        </div>
                      ) : (
                        <div className="text-red-600 font-medium">
                          ⚠ Not Assigned
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {(!c.roster || c.roster.length === 0) ? (
                        <div className="flex flex-col space-y-2">
                          <select
                            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            onChange={e => {
                              const vehicleId = e.target.value;
                              if (vehicleId) {
                                const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
                                setSelectedVehicle(prev => ({
                                  ...prev,
                                  [c.id]: vehicle
                                }));
                              }
                            }}
                          >
                            <option value="">Select Vehicle</option>
                            {vehicles.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.type.toUpperCase()} - {v.reg_number} ({v.driver_name || 'No driver'})
                              </option>
                            ))}
                          </select>
                          <button
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                            onClick={() => assignVehicle(c.id)}
                            disabled={!selectedVehicle[c.id]}
                          >
                            Assign Vehicle
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-green-600 font-medium">
                          Vehicle Assigned
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AVAILABLE VEHICLES SECTION */}
      {vehicles.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600 mb-6">
          <h3 className="text-xl font-bold text-blue-800 mb-4 text-center">
            Available Vehicles ({vehicles.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="font-semibold text-gray-800">{vehicle.reg_number}</div>
                <div className="text-sm text-gray-600 capitalize">{vehicle.type.replace('_', ' ')}</div>
                <div className="text-sm text-gray-600">{vehicle.driver_name || 'Driver TBD'}</div>
                <div className="text-xs text-green-600 font-medium mt-1">● Available</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>
          Toll Free: <span className="font-bold text-red-600">0800 01 4574</span> | Serving with Dignity
        </p>
      </div>
    </div>
  );
}