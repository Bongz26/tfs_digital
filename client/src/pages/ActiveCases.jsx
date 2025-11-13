// src/pages/ActiveCases.jsx
import React, { useEffect, useState } from 'react';

export default function ActiveCases() {
  const [cases, setCases] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch active cases and vehicles in one call
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Fetching active cases data...');
        const response = await fetch(`${API_URL}/api/activeCases`);
        
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
      <div className="p-8 text-center text-red-600">
        Loading active cases...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-red-800 mb-8">
        Active Cases Management
      </h1>

      {cases.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No active cases found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Case Number</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Deceased</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Funeral Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Vehicle Assigned</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cases.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{c.case_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{c.deceased_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">
                      {new Date(c.funeral_date).toLocaleDateString()}
                    </div>
                    {c.funeral_time && (
                      <div className="text-sm text-gray-500">{c.funeral_time}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      c.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      c.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {c.roster && c.roster.length > 0 ? (
                      <div className="text-green-600 font-medium">
                        Assigned
                      </div>
                    ) : (
                      <div className="text-red-600 font-medium">
                        Not Assigned
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(!c.roster || c.roster.length === 0) && (
                      <div className="flex items-center space-x-2">
                        <select
                          className="border border-gray-300 rounded px-3 py-2 text-sm"
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
                              {v.type} - {v.reg_number} ({v.driver_name || 'No driver'})
                            </option>
                          ))}
                        </select>
                        <button
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                          onClick={() => assignVehicle(c.id)}
                          disabled={!selectedVehicle[c.id]}
                        >
                          Assign
                        </button>
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
  );
}