import React, { useEffect, useState } from 'react';

export default function ActiveCases() {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const [cases, setCases] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [form, setForm] = useState({
    driver_name: '',
    vehicle_type: '',
    reg_number: '',
    pickup_time: '',
  });

  useEffect(() => {
    fetch(`${API_URL}/api/cases`)
      .then(res => res.json())
      .then(data => setCases(data.cases || []));
  }, []);

  const handleAssign = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/cases/assign/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('Driver assigned successfully ✅');
      setAssigning(null);
      setForm({ driver_name: '', vehicle_type: '', reg_number: '', pickup_time: '' });

      // refresh
      const newCases = await fetch(`${API_URL}/api/cases`).then(r => r.json());
      setCases(newCases.cases || []);
    } catch (err) {
      console.error('Assign error:', err);
      alert('Error assigning driver');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-red-700 mb-4">Active Cases</h2>
      <table className="w-full border-collapse border">
        <thead className="bg-red-50">
          <tr>
            <th className="border p-2">Case No</th>
            <th className="border p-2">Deceased</th>
            <th className="border p-2">Funeral Date</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <tr key={c.id}>
              <td className="border p-2">{c.case_number}</td>
              <td className="border p-2">{c.deceased_name}</td>
              <td className="border p-2">{c.funeral_date}</td>
              <td className="border p-2">
                <button
                  onClick={() => setAssigning(c.id)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Assign Driver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Assignment Modal */}
      {assigning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
            <h3 className="text-lg font-semibold text-red-700 mb-4">
              Assign Driver to Case #{assigning}
            </h3>

            <input
              type="text"
              placeholder="Driver Name"
              value={form.driver_name}
              onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
              className="border p-2 w-full mb-2 rounded"
            />
            <input
              type="text"
              placeholder="Vehicle Type"
              value={form.vehicle_type}
              onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
              className="border p-2 w-full mb-2 rounded"
            />
            <input
              type="text"
              placeholder="Reg Number"
              value={form.reg_number}
              onChange={(e) => setForm({ ...form, reg_number: e.target.value })}
              className="border p-2 w-full mb-2 rounded"
            />
            <input
              type="datetime-local"
              value={form.pickup_time}
              onChange={(e) => setForm({ ...form, pickup_time: e.target.value })}
              className="border p-2 w-full mb-4 rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAssigning(null)}
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssign(assigning)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
