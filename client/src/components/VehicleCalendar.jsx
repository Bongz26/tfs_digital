// client/src/components/VehicleCalendar.jsx
import React, { useEffect, useState } from 'react';

export default function VehicleCalendar() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    fetch(`${API_URL}/api/roster`)
      .then(r => r.json())
      .then(data => {
        setRoster(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4 text-center">Loading roster...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-tfs-red text-white">
            <th className="p-4 text-left font-bold">Vehicle & Driver</th>
            <th className="p-4 text-left font-bold">Assignment</th>
          </tr>
        </thead>
        <tbody>
          {roster.length === 0 ? (
            <tr>
              <td colSpan="2" className="p-4 text-center text-gray-500">
                No assignments for Saturday 15 Nov
              </td>
            </tr>
          ) : (
            roster.map((r, i) => (
              <tr key={i} className="border-t hover:bg-tfs-light">
                <td className="p-4">
                  <div className="font-bold text-tfs-dark">{r.reg_number}</div>
                  <div className="text-sm text-gray-600">{r.driver_name} • {r.type || 'Unknown'}</div>
                </td>
                <td className="p-4">
                  <div className="bg-gradient-to-r from-yellow-50 to-red-50 p-4 rounded-lg border border-tfs-gold">
                    <div className="font-bold text-tfs-red">{r.case_number}</div>
                    <div className="text-sm text-tfs-dark">
                      {r.plan_name} • {r.funeral_time} • {r.venue_name}
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}