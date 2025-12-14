// client/src/components/VehicleCalendar.jsx
import React, { useEffect, useState } from 'react';
import { API_HOST } from '../api/config';
import { getAccessToken } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { fetchDrivers } from '../api/drivers';
import { updateRoster } from '../api/roster';
import { updateCaseVenue, updateFuneralTime } from '../api/cases';

export default function VehicleCalendar() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('upcoming');
  const [authError, setAuthError] = useState('');
  const { isAdmin } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [editDriver, setEditDriver] = useState({});
  const [editVehicle, setEditVehicle] = useState({});
  const [editStatus, setEditStatus] = useState({});
  const [editPickupTime, setEditPickupTime] = useState({});
  const [saving, setSaving] = useState({});
  const [editVenueName, setEditVenueName] = useState({});
  const [editBurialPlace, setEditBurialPlace] = useState({});
  const [editCaseFuneralTime, setEditCaseFuneralTime] = useState({});
  const [caseFuneralTimeValues, setCaseFuneralTimeValues] = useState({});

  useEffect(() => {
    const API_URL = API_HOST;
    const token = getAccessToken();
    fetch(`${API_URL}/api/roster`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.status === 401) {
          setAuthError('Your session has expired. Please login again to view the live roster.');
          return Promise.reject('HTTP 401');
        }
        return res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`);
      })
      .then(data => setRoster(data.roster || []))
      .catch(err => {
        console.error('Roster fetch error:', err);
        setRoster([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!isAdmin()) return;
    fetchDrivers().then(setDrivers).catch(() => setDrivers([]));
    fetch(`${API_HOST}/api/vehicles`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => setVehicles(j.vehicles || []))
      .catch(() => setVehicles([]));
  }, [isAdmin]);

  const filteredRoster = roster.filter(item => {
    if (!item.funeral_date) return viewMode !== 'past';
    const funeralDate = new Date(item.funeral_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (viewMode === 'past') return funeralDate < today;
    return funeralDate >= today;
  });

  const sortedRoster = [...filteredRoster].sort((a, b) => {
    if (!a.funeral_date || !b.funeral_date) return 0;
    const dateA = new Date(a.funeral_date);
    const dateB = new Date(b.funeral_date);
    if (viewMode === 'past') return dateB - dateA;
    return dateA - dateB;
  });

  const groupByCase = items => {
    const map = new Map();
    items.forEach(i => {
      const key = i.case_id || i.id;
      const existing = map.get(key) || {
        case_id: i.case_id || i.id,
        case_number: i.case_number || null,
        deceased_name: i.deceased_name || null,
        funeral_date: i.funeral_date || null,
        funeral_time: i.funeral_time || null,
        delivery_date: i.delivery_date || null,
        delivery_time: i.delivery_time || null,
        venue_name: i.venue_name || null,
        assignments: []
      };
      existing.assignments.push({
        id: i.id,
        driver_name: i.driver_name || i.vehicle_driver_name || null,
        vehicle_type: i.vehicle_type || null,
        reg_number: i.reg_number || null,
        pickup_time: i.pickup_time || null,
        status: i.status || null
      });
      map.set(key, existing);
    });
    return Array.from(map.values());
  };

  const groupByDriver = items => {
    const map = new Map();
    items.forEach(i => {
      const name = (i.driver_name || i.vehicle_driver_name || '').trim();
      if (!name) return;
      const existing = map.get(name) || { driver_name: name, assignments: [] };
      existing.assignments.push({
        case_id: i.case_id || i.id,
        case_number: i.case_number || null,
        deceased_name: i.deceased_name || null,
        funeral_date: i.funeral_date || null,
        funeral_time: i.funeral_time || null,
        venue_name: i.venue_name || null,
        vehicle_type: i.vehicle_type || null,
        reg_number: i.reg_number || null,
        status: i.status || null
      });
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.driver_name.localeCompare(b.driver_name));
  };

  const groupByDriverSet = items => {
    const cases = groupByCase(items);
    const map = new Map();
    cases.forEach(cg => {
      const drivers = Array.from(new Set(
        (cg.assignments || [])
          .map(a => String(a.driver_name || '').trim())
          .filter(n => n && n.toLowerCase() !== 'tbd')
      ));
      if (drivers.length < 2) return;
      const key = drivers.slice().sort((a, b) => a.localeCompare(b)).join(' & ');
      const existing = map.get(key) || { key, drivers: drivers.slice().sort((a, b) => a.localeCompare(b)), cases: [] };
      existing.cases.push(cg);
      map.set(key, existing);
    });
    return Array.from(map.values()).filter(g => g.cases.length >= 2).sort((a, b) => b.cases.length - a.cases.length || a.key.localeCompare(b.key));
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-red-600 font-semibold">
        Loading Live Roster...
      </div>
    );
  }

  return (
    <div>
      {authError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {authError} <a href="/login" className="underline ml-1">Login</a>
        </div>
      )}
      {/* View Mode Toggle */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-lg border-2 border-red-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode('upcoming')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              viewMode === 'upcoming'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📅 Upcoming Services
          </button>
          <button
            onClick={() => setViewMode('past')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              viewMode === 'past'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📜 Past Services
          </button>
          <button
            onClick={() => setViewMode('drivers')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              viewMode === 'drivers'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            👤 Driver Groups
          </button>
        </div>
      </div>

      {/* Empty State */}
      {sortedRoster.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed border-red-300 rounded-xl">
          <p className="text-gray-700 text-lg font-medium">
            {viewMode === 'upcoming' 
              ? 'No upcoming services scheduled.'
              : 'No past services found.'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {viewMode === 'upcoming'
              ? 'Once services are scheduled, they will appear here.'
              : 'Past services will appear here once they are completed.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-center">
            <p className="text-gray-600">
              {viewMode === 'drivers' ? (
                <>Showing <span className="font-bold text-red-600">{groupByDriverSet(sortedRoster).length}</span> driver group{groupByDriverSet(sortedRoster).length !== 1 ? 's' : ''}</>
              ) : (
                <>Showing <span className="font-bold text-red-600">{groupByCase(sortedRoster).length}</span> case{groupByCase(sortedRoster).length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>

          {viewMode === 'drivers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupByDriverSet(sortedRoster).map(group => (
                <div key={group.key} className="bg-white border-l-4 border-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-red-700">{group.key}</h3>
                    <span className="text-sm text-gray-500">{group.cases.length} case{group.cases.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-4">
                    {group.cases.map(cg => (
                      <div key={cg.case_id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-800 font-semibold">{cg.case_number || `CASE-${cg.case_id}`}</span>
                          <span className="text-sm text-gray-500">{cg.funeral_date ? new Date(cg.funeral_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }) : 'Date TBA'}</span>
                        </div>
                        <div className="space-y-2">
                          {cg.assignments.filter(a => group.drivers.includes(String(a.driver_name || '').trim())).map(a => (
                            <div key={a.id || `${cg.case_id}-${a.reg_number}-${a.driver_name}`} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <p className="text-yellow-800 font-semibold flex items-center">👤 {a.driver_name || 'Driver not assigned'}</p>
                              <p className="text-yellow-700 text-sm">🚗 {a.vehicle_type ? a.vehicle_type.toUpperCase().replace('_', ' ') : '—'} — {a.reg_number || '—'}</p>
                              <div className="mt-2 flex justify-end">
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  a.status === 'scheduled'
                                    ? 'bg-blue-100 text-blue-700'
                                    : a.status === 'en_route'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {a.status?.toUpperCase() || 'PENDING'}
                                </span>
                              </div>
                              {isAdmin() && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <select
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editDriver[a.id]?.id || ''}
                                    onChange={e => {
                                      const did = parseInt(e.target.value);
                                      const d = drivers.find(x => x.id === did) || null;
                                      setEditDriver(prev => ({ ...prev, [a.id]: d }));
                                    }}
                                  >
                                    <option value="">Change driver</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                  <select
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editVehicle[a.id]?.id || ''}
                                    onChange={e => {
                                      const vid = parseInt(e.target.value);
                                      const v = vehicles.find(x => x.id === vid) || null;
                                      setEditVehicle(prev => ({ ...prev, [a.id]: v }));
                                    }}
                                  >
                                    <option value="">Change vehicle</option>
                                    {vehicles.map(v => (
                                      <option key={v.id} value={v.id}>{(v.type || '').toUpperCase().replace('_',' ')} • {v.reg_number}</option>
                                    ))}
                                  </select>
                                  <select
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editStatus[a.id] || ''}
                                    onChange={e => setEditStatus(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  >
                                    <option value="">Change status</option>
                                    <option value="scheduled">scheduled</option>
                                    <option value="en_route">en_route</option>
                                    <option value="completed">completed</option>
                                  </select>
                                  <input
                                    type="datetime-local"
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editPickupTime[a.id] || ''}
                                    onChange={e => setEditPickupTime(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  />
                                  <button
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
                                    disabled={saving[a.id] || (!editDriver[a.id] && !editVehicle[a.id] && !editStatus[a.id] && !editPickupTime[a.id])}
                                    onClick={async () => {
                                      const payload = {};
                                      if (editDriver[a.id]) payload.driver_name = editDriver[a.id].name;
                                      if (editVehicle[a.id]) payload.vehicle_id = editVehicle[a.id].id;
                                      if (editStatus[a.id]) payload.status = editStatus[a.id];
                                      if (editPickupTime[a.id]) payload.pickup_time = editPickupTime[a.id];
                                      setSaving(prev => ({ ...prev, [a.id]: true }));
                                      try {
                                        await updateRoster(a.id, payload);
                                        const token = getAccessToken();
                                        const res = await fetch(`${API_HOST}/api/roster`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                        const json = await res.json();
                                        setRoster(json.roster || []);
                                        setEditDriver(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                        setEditVehicle(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                        setEditStatus(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                        setEditPickupTime(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                      } catch (err) {
                                        alert(err.response?.data?.error || err.message || 'Failed to update');
                                      } finally {
                                        setSaving(prev => ({ ...prev, [a.id]: false }));
                                      }
                                    }}
                                  >
                                    Save
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {isAdmin() && (
                            <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-white">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  className="border rounded px-2 py-1 text-sm"
                                  placeholder="Service venue"
                                  value={editVenueName[cg.case_id] ?? ''}
                                  onChange={e => setEditVenueName(prev => ({ ...prev, [cg.case_id]: e.target.value }))}
                                />
                                <input
                                  type="text"
                                  className="border rounded px-2 py-1 text-sm"
                                  placeholder="Burial place"
                                  value={editBurialPlace[cg.case_id] ?? ''}
                                  onChange={e => setEditBurialPlace(prev => ({ ...prev, [cg.case_id]: e.target.value }))}
                                />
                              </div>
                              <div className="mt-2 flex justify-end">
                                <button
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
                                  disabled={saving[`case-${cg.case_id}`] || (!editVenueName[cg.case_id] && !editBurialPlace[cg.case_id])}
                                  onClick={async () => {
                                    const payload = {};
                                    if (editVenueName[cg.case_id]) payload.venue_name = editVenueName[cg.case_id];
                                    if (editBurialPlace[cg.case_id]) payload.burial_place = editBurialPlace[cg.case_id];
                                    setSaving(prev => ({ ...prev, [`case-${cg.case_id}`]: true }));
                                    try {
                                      await updateCaseVenue(cg.case_id, payload);
                                      const token = getAccessToken();
                                      const res = await fetch(`${API_HOST}/api/roster`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                      const json = await res.json();
                                      setRoster(json.roster || []);
                                      setEditVenueName(prev => { const n = { ...prev }; delete n[cg.case_id]; return n; });
                                      setEditBurialPlace(prev => { const n = { ...prev }; delete n[cg.case_id]; return n; });
                                    } catch (err) {
                                      alert(err.response?.data?.error || err.message || 'Failed to update case');
                                    } finally {
                                      setSaving(prev => ({ ...prev, [`case-${cg.case_id}`]: false }));
                                    }
                                  }}
                                >
                                  Save Case
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupByCase(sortedRoster).map(group => (
                <div key={group.case_id} className="bg-white border-l-4 border-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-red-700">{group.case_number || `CASE-${group.case_id}`}</h3>
                    <span className="text-sm text-gray-500">
                      {group.funeral_date
                        ? new Date(group.funeral_date).toLocaleDateString('en-ZA', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'Date TBA'}
                    </span>
                  </div>
                  <p className="text-gray-800 font-semibold text-xl mb-2">{group.deceased_name || 'Deceased Name Not Available'}</p>
                  <p className="text-gray-600 text-sm mb-1">📍 <span className="font-medium">{group.venue_name || 'Venue To Be Announced'}</span></p>
                  <p className="text-gray-600 text-sm mb-1">⏰ Funeral Time: <span className="font-medium">{group.funeral_time || 'Time To Be Announced'}</span></p>
                  {isAdmin() && (
                    <div className="mt-2 flex items-center gap-2">
                      {editCaseFuneralTime[group.case_id] ? (
                        <>
                          <input
                            type="time"
                            className="border rounded px-2 py-1 text-sm"
                            value={caseFuneralTimeValues[group.case_id] || group.funeral_time || ''}
                            onChange={e => setCaseFuneralTimeValues(prev => ({ ...prev, [group.case_id]: e.target.value }))}
                          />
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                            onClick={async () => {
                              try {
                                await updateFuneralTime(group.case_id, caseFuneralTimeValues[group.case_id] || group.funeral_time);
                                const token = getAccessToken();
                                const res = await fetch(`${API_HOST}/api/roster`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                const json = await res.json();
                                setRoster(json.roster || []);
                                setEditCaseFuneralTime(prev => { const n = { ...prev }; delete n[group.case_id]; return n; });
                                setCaseFuneralTimeValues(prev => { const n = { ...prev }; delete n[group.case_id]; return n; });
                              } catch (err) {
                                alert(err.response?.data?.error || err.message || 'Failed to update funeral time');
                              }
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                            onClick={() => {
                              setEditCaseFuneralTime(prev => { const n = { ...prev }; delete n[group.case_id]; return n; });
                              setCaseFuneralTimeValues(prev => { const n = { ...prev }; delete n[group.case_id]; return n; });
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-blue-600 text-xs underline"
                          onClick={() => {
                            setEditCaseFuneralTime(prev => ({ ...prev, [group.case_id]: true }));
                            setCaseFuneralTimeValues(prev => ({ ...prev, [group.case_id]: group.funeral_time || '' }));
                          }}
                        >
                          Edit Time
                        </button>
                      )}
                    </div>
                  )}
                  {group.delivery_date && group.delivery_time && (
                    <p className="text-gray-600 text-sm mb-1">🚚 Delivery: <span className="font-medium">{new Date(group.delivery_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} at {group.delivery_time}</span></p>
                  )}
                  <div className="mt-3 space-y-3">
                    {group.assignments.map((a, idx) => (
                      <div key={idx} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 font-semibold flex items-center">👤 {a.driver_name || 'Driver not assigned'}</p>
                        <p className="text-yellow-700 text-sm">🚗 {a.vehicle_type ? a.vehicle_type.toUpperCase().replace('_', ' ') : '—'} — {a.reg_number || '—'}</p>
                        <div className="mt-2 flex justify-end">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            a.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : a.status === 'en_route'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {a.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                        {isAdmin() && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={editDriver[a.id]?.id || ''}
                              onChange={e => {
                                const did = parseInt(e.target.value);
                                const d = drivers.find(x => x.id === did) || null;
                                setEditDriver(prev => ({ ...prev, [a.id]: d }));
                              }}
                            >
                              <option value="">Change driver</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={editVehicle[a.id]?.id || ''}
                              onChange={e => {
                                const vid = parseInt(e.target.value);
                                const v = vehicles.find(x => x.id === vid) || null;
                                setEditVehicle(prev => ({ ...prev, [a.id]: v }));
                              }}
                            >
                              <option value="">Change vehicle</option>
                              {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{(v.type || '').toUpperCase().replace('_',' ')} • {v.reg_number}</option>
                              ))}
                            </select>
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={editStatus[a.id] || ''}
                              onChange={e => setEditStatus(prev => ({ ...prev, [a.id]: e.target.value }))}
                            >
                              <option value="">Change status</option>
                              <option value="scheduled">scheduled</option>
                              <option value="en_route">en_route</option>
                              <option value="completed">completed</option>
                            </select>
                            <input
                              type="datetime-local"
                              className="border rounded px-2 py-1 text-sm"
                              value={editPickupTime[a.id] || ''}
                              onChange={e => setEditPickupTime(prev => ({ ...prev, [a.id]: e.target.value }))}
                            />
                            <button
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
                              disabled={saving[a.id] || (!editDriver[a.id] && !editVehicle[a.id] && !editStatus[a.id] && !editPickupTime[a.id])}
                              onClick={async () => {
                                const payload = {};
                                if (editDriver[a.id]) payload.driver_name = editDriver[a.id].name;
                                if (editVehicle[a.id]) payload.vehicle_id = editVehicle[a.id].id;
                                if (editStatus[a.id]) payload.status = editStatus[a.id];
                                if (editPickupTime[a.id]) payload.pickup_time = editPickupTime[a.id];
                                setSaving(prev => ({ ...prev, [a.id]: true }));
                                try {
                                  await updateRoster(a.id, payload);
                                  const token = getAccessToken();
                                  const res = await fetch(`${API_HOST}/api/roster`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                  const json = await res.json();
                                  setRoster(json.roster || []);
                                  setEditDriver(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                  setEditVehicle(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                  setEditStatus(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                  setEditPickupTime(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                                } catch (err) {
                                  alert(err.response?.data?.error || err.message || 'Failed to update');
                                } finally {
                                  setSaving(prev => ({ ...prev, [a.id]: false }));
                                }
                              }}
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
