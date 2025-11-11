// client/src/components/VehicleCalendar.jsx
import React, { useEffect, useState } from 'react';

export default function VehicleCalendar() {
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    fetch(`${API_URL}/api/roster`)
      .then(r => r.json())
      .then(setRoster)
      .catch(() => setRoster([]));
  }, []);

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Live Roster</h2>
      <table className="w-full">
        <thead><tr className="bg-gray-100"><th>Vehicle</th><th>Assignment</th></tr></thead>
        <tbody>
          {roster.map((r, i) => (
            <tr key={i}>
              <td>{r.reg_number} • {r.driver_name}</td>
              <td>{r.case_number} • {r.venue_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}