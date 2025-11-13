import React, { useEffect, useState } from 'react';

export default function ActiveCases() {
  const [cases, setCases] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignData, setAssignData] = useState({});

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch active cases and available vehicles
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/activeCases`).then(r => r.json()),
      fetch(`${API_URL}/api/vehicles`).then(r => r.json()) // assumes /api/vehicles returns all vehicles
    ]).then(([casesData, vehiclesData]) => {
      setCases(casesData.cases || []);
      setVehicles(vehiclesData || []);
      setLoading(false);
    }).catch(err => console.error(err));
  }, []);

  const handleAssign = async (caseId) => {
    const vehicle_id = assignData[caseId]?.vehicle_id;
    const driver_name = assignData[caseId]?.driver_name;
    const pickup_time = assignData[caseId]?.pickup_time;

    if (!vehicle_id || !driver_name || !pickup_time) return alert('Fill all fields');

    try {
      const res = await fetch(`${API_URL}/api/activeCases/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, vehicle_id, driver_name, pickup_time })
      });
      const data = await res.json();
      if (data.success) {
        alert('Vehicle assigned!');
        window.location.reload(); // simple way to refresh list
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to assign vehicle');
    }
  };

  if (loading) return <div className="p-8 text-center text-red-600">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-red-800 mb-6">Active Cases</h1>
      <table className="w-full border-collapse bg-white shadow rounded-lg overflow-hidden">
        <thead className="bg-red-100">
          <tr>
            <th className="p-3 text-left">Case Number</th>
            <th className="p-3 text-left">Deceased Name</th>
            <th className="p-3 text-left">Funeral Date</th>
            <th className="p-3 text-left">Vehicle</th>
            <th className="p-3 text-left">Driver</th>
            <th className="p-3 text-left">Pickup Time</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{c.case_number}</td>
              <td className="p-3">{c.deceased_name}</td>
              <td className="p-3">{c.funeral_date}</td>
              <td className="p-3">
                {c.vehicle_assigned ? c.vehicle_id : (
                  <select
                    className="border p-1"
                    onChange={e => setAssignData({...assignData, [c.id]: {...assignData[c.id], vehicle_id: e.target.value}})}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.filter(v => v.available).map(v => (
                      <option key={v.id} value={v.id}>{v.reg_number} ({v.type})</option>
                    ))}
                  </select>
                )}
              </td>
              <td className="p-3">
                {c.vehicle_assigned ? c.driver_name : (
                  <input
                    type="text"
                    placeholder="Driver Name"
                    className="border p-1 w-full"
                    onChange={e => setAssignData({...assignData, [c.id]: {...assignData[c.id], driver_name: e.target.value}})}
                  />
                )}
              </td>
              <td className="p-3">
                {c.vehicle_assigned ? c.pickup_time : (
                  <input
                    type="time"
                    className="border p-1 w-full"
                    onChange={e => setAssignData({...assignData, [c.id]: {...assignData[c.id], pickup_time: e.target.value}})}
                  />
                )}
              </td>
              <td className="p-3">
                {!c.vehicle_assigned && (
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-800"
                    onClick={() => handleAssign(c.id)}
                  >
                    Assign
                  </button>
                )}
                {c.vehicle_assigned && <span className="text-green-700 font-semibold">Assigned</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
