// src/pages/CaseDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCaseById, assignVehicle } from '../api/cases';
import { fetchDrivers } from '../api/drivers';
import { fetchRoster, updateRoster } from '../api/roster';
import { API_HOST } from '../api/config';

export default function CaseDetails() {
  const { id } = useParams(); // get case id from route
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [caseRoster, setCaseRoster] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [editDriverByRosterId, setEditDriverByRosterId] = useState({});
  const [editVehicleByRosterId, setEditVehicleByRosterId] = useState({});

  useEffect(() => {
    const loadCase = async () => {
      try {
        const data = await fetchCaseById(id);
        setCaseData(data);
        try {
          const [drv, rost] = await Promise.all([
            fetchDrivers(),
            fetchRoster()
          ]);
          setDrivers(drv);
          setCaseRoster((rost || []).filter(r => String(r.case_id) === String(id)));
        } catch (_) { }
        try {
          const res = await fetch(`${API_HOST}/api/vehicles`);
          const json = await res.json();
          setVehicles(json.vehicles || []);
        } catch (_) { }
      } catch (err) {
        console.error('Error fetching case:', err);
        setError('Failed to load case details.');
      } finally {
        setLoading(false);
      }
    };

    loadCase();
  }, [id]);

  if (loading) return <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center text-red-600">Loading case details...</div>;
  if (error) return <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center text-red-600">{error}</div>;
  if (!caseData) return <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center text-gray-600">Case not found</div>;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <Link to="/dashboard" className="text-blue-600 hover:underline mb-6 inline-block">← Back to Dashboard</Link>

      <h1 className="text-3xl font-bold text-center text-red-800 mb-6">
        Case Details: {caseData.case_number}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Deceased Info</h2>
          <p><span className="font-semibold">Name:</span> {caseData.deceased_name}</p>
          <p><span className="font-semibold">Policy Number:</span> {caseData.policy_number || '-'}</p>
          <p><span className="font-semibold">ID:</span> {caseData.deceased_id || '-'}</p>
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Next of Kin</h2>
          <p><span className="font-semibold">Name:</span> {caseData.nok_name}</p>
          <p><span className="font-semibold">Contact:</span> {caseData.nok_contact}</p>
          <p><span className="font-semibold">Relation:</span> {caseData.nok_relation || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Plan Details</h2>
          <p><span className="font-semibold">Category:</span> {caseData.plan_category}</p>
          <p><span className="font-semibold">Name:</span> {caseData.plan_name}</p>
          {caseData.plan_category === 'motjha'
            ? <p><span className="font-semibold">Members:</span> {caseData.plan_members}</p>
            : <p><span className="font-semibold">Age Bracket:</span> {caseData.plan_age_bracket}</p>}
          <p><span className="font-semibold">Service Type:</span> {caseData.service_type || 'book'}</p>
          <p><span className="font-semibold">Total Price:</span> R{caseData.total_price}</p>
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Casket & Delivery</h2>
          <p><span className="font-semibold">Casket Type:</span> {caseData.casket_type || '-'}</p>
          <p><span className="font-semibold">Casket Colour:</span> {caseData.casket_colour || '-'}</p>
          <p><span className="font-semibold">Delivery Date:</span> {caseData.delivery_date || '-'}</p>
          <p><span className="font-semibold">Delivery Time:</span> {caseData.delivery_time || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Funeral Info</h2>
          <p><span className="font-semibold">Date:</span> {(caseData.service_date || caseData.funeral_date) ? new Date(caseData.service_date || caseData.funeral_date).toLocaleDateString() : 'Not set'}</p>
          <p><span className="font-semibold">Time:</span> {(caseData.service_time || caseData.funeral_time) ? (caseData.service_time || caseData.funeral_time).slice(0, 5) : 'Not set'}</p>
          <p><span className="font-semibold">Venue:</span> {caseData.venue_name}</p>
          <p><span className="font-semibold">Address:</span> {caseData.venue_address}</p>
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Options</h2>
          <p><span className="font-semibold">Requires Cow:</span> {caseData.requires_cow ? 'Yes' : 'No'}</p>
          <p><span className="font-semibold">Requires Tombstone:</span> {caseData.requires_tombstone ? 'Yes' : 'No'}</p>
          <p><span className="font-semibold">Intake Day:</span> {caseData.intake_day || '-'}</p>
          <p><span className="font-semibold">Branch:</span> {caseData.branch || 'Head Office'}</p>
          <p><span className="font-semibold">Status:</span> {caseData.status}</p>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Created at: {new Date(caseData.created_at).toLocaleString()}</p>
        <p>Last updated: {new Date(caseData.updated_at).toLocaleString()}</p>
      </div>

      <div className="mt-10 p-4 sm:p-6 rounded-xl shadow bg-white">
        <h2 className="font-bold text-lg mb-3">Vehicle & Driver Assignment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Vehicle</label>
            <select className="w-full border rounded px-3 py-2" value={selectedVehicle?.id || ''} onChange={e => {
              const vid = parseInt(e.target.value);
              const v = vehicles.find(x => x.id === vid) || null;
              setSelectedVehicle(v);
            }}>
              <option value="">Choose vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{(v.type || '').toUpperCase()} • {v.reg_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Select Driver</label>
            <select className="w-full border rounded px-3 py-2" value={selectedDriver?.id || ''} onChange={e => {
              const did = parseInt(e.target.value);
              const d = drivers.find(x => x.id === did) || null;
              setSelectedDriver(d);
            }}>
              <option value="">Choose driver...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <button className="bg-red-600 text-white px-4 py-2 rounded" disabled={!selectedVehicle || !selectedDriver} onClick={async () => {
            try {
              await assignVehicle(id, { vehicle_id: selectedVehicle.id, driver_name: selectedDriver.name });
              const rost = await fetchRoster();
              setCaseRoster((rost || []).filter(r => String(r.case_id) === String(id)));
              alert('Vehicle assigned');
            } catch (err) {
              alert(err.response?.data?.error || err.message || 'Failed to assign');
            }
          }}>Assign Vehicle & Driver</button>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Current Assignments</h3>
          {caseRoster.length === 0 ? (
            <div className="text-sm text-gray-600">No assignments yet</div>
          ) : (
            <div className="space-y-2">
              {caseRoster.map(r => (
                <div key={r.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-sm">
                  <div className="flex-1">Vehicle: {(r.vehicle_type || '').toUpperCase()} • {r.reg_number} | Driver: {r.driver_name || 'TBD'}</div>
                  <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1" value={editDriverByRosterId[r.id]?.id || ''} onChange={e => {
                      const did = parseInt(e.target.value);
                      const d = drivers.find(x => x.id === did) || null;
                      setEditDriverByRosterId(prev => ({ ...prev, [r.id]: d }));
                    }}>
                      <option value="">Change driver...</option>
                      {drivers.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded" disabled={!editDriverByRosterId[r.id]} onClick={async () => {
                      try {
                        await updateRoster(r.id, { driver_name: editDriverByRosterId[r.id].name });
                        const rost = await fetchRoster();
                        setCaseRoster((rost || []).filter(x => String(x.case_id) === String(id)));
                        setEditDriverByRosterId(prev => { const n = { ...prev }; delete n[r.id]; return n; });
                        alert('Driver updated');
                      } catch (err) {
                        alert(err.response?.data?.error || err.message || 'Failed to update driver');
                      }
                    }}>Update</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1" value={editVehicleByRosterId[r.id]?.id || ''} onChange={e => {
                      const vid = parseInt(e.target.value);
                      const v = vehicles.find(x => x.id === vid) || null;
                      setEditVehicleByRosterId(prev => ({ ...prev, [r.id]: v }));
                    }}>
                      <option value="">Change vehicle...</option>
                      {vehicles.map(v => (<option key={v.id} value={v.id}>{(v.type || '').toUpperCase()} • {v.reg_number}</option>))}
                    </select>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded" disabled={!editVehicleByRosterId[r.id]} onClick={async () => {
                      try {
                        await updateRoster(r.id, { vehicle_id: editVehicleByRosterId[r.id].id });
                        const rost = await fetchRoster();
                        setCaseRoster((rost || []).filter(x => String(x.case_id) === String(id)));
                        setEditVehicleByRosterId(prev => { const n = { ...prev }; delete n[r.id]; return n; });
                        alert('Vehicle updated');
                      } catch (err) {
                        alert(err.response?.data?.error || err.message || 'Failed to update vehicle');
                      }
                    }}>Update</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
