// src/pages/ActiveCases.jsx
import React, { useEffect, useState } from 'react';

export default function ActiveCases() {
  const [cases, setCases] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState({});

  // Use your actual API base URL here
  const API_BASE =
    process.env.NODE_ENV === 'production'
      ? 'https://admintfs-api.onrender.com' // your backend URL
      : 'http://localhost:5000';

  // Fetch active cases
  useEffect(() => {
    fetch(`${API_BASE}/api/activeCases`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) setCases(data.cases);
        else console.error(data.error);
      })
      .catch(err => console.error('ActiveCases fetch error:', err));
  }, []);

  // Fetch available vehicles
  useEffect(() => {
    fetch(`${API_BASE}/api/vehicles/available`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) setVehicles(data.vehicles);
        else console.error(data.error);
      })
      .catch(err => console.error('Vehicles fetch error:', err));
  }, []);

  const assignVehicle = async (caseId) => {
    if (!selectedVehicle[caseId]) return alert('Select a vehicle first');
    const vehicle = selectedVehicle[caseId];

    try {
      const res = await fetch(`${API_BASE}/api/cases/assign/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          driver_name: vehicle.driver_name || 'TBD',
          pickup_time: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert('Vehicle assigned successfully!');
      window.location.reload(); // refresh list
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign vehicle.');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Active Cases</h2>
      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Case Number</th>
            <th className="border px-4 py-2">Deceased</th>
            <th className="border px-4 py-2">Funeral Date</th>
            <th className="border px-4 py-2">Vehicle Assigned</th>
            <th className="border px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <tr key={c.id} className="text-center">
              <td className="border px-4 py-2">{c.case_number}</td>
              <td className="border px-4 py-2">{c.deceased_name}</td>
              <td className="border px-4 py-2">
                {new Date(c.funeral_date).toLocaleDateString()}
              </td>
              <td className="border px-4 py-2">
                {c.roster?.length > 0
                  ? c.roster[0].driver_name +
                    ' / Vehicle ' +
                    c.roster[0].vehicle_id
                  : 'Not Assigned'}
              </td>
              <td className="border px-4 py-2">
                {c.roster?.length === 0 && (
                  <>
                    <select
                      className="border px-2 py-1 mr-2"
                      onChange={e =>
                        setSelectedVehicle({
                          ...selectedVehicle,
                          [c.id]: vehicles.find(
                            v => v.id === Number(e.target.value)
                          ),
                        })
                      }
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.type} - {v.reg_number} (
                          {v.driver_name || 'TBD'})
                        </option>
                      ))}
                    </select>
                    <button
                      className="bg-blue-600 text-white px-4 py-1 rounded"
                      onClick={() => assignVehicle(c.id)}
                    >
                      Assign
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
