// src/pages/ActiveCases.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStatusConfig, getNextStatuses, suggestStatus, getStatusBadgeProps } from '../utils/caseStatus';
import { fetchActiveCases, sendActiveCasesAlerts } from '../api/activeCases';
import { updateRoster } from '../api/roster';
import { fetchDrivers } from '../api/drivers';
import { assignVehicle, updateCaseStatus, updateFuneralTime as apiUpdateFuneralTime, fetchCancelledCases } from '../api/cases';
import { fetchCaseAuditLog } from '../api/cases';
import { useAuth } from '../context/AuthContext';
import { updateCaseVenue } from '../api/cases';

export default function ActiveCases() {
  const { isAdmin } = useAuth();
  const [cases, setCases] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState({});
  const [selectedDriver, setSelectedDriver] = useState({});
  const [vehicleCategory, setVehicleCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingStatus, setChangingStatus] = useState({});
  const [editingFuneralTime, setEditingFuneralTime] = useState({});
  const [funeralTimeValues, setFuneralTimeValues] = useState({});
  const [toasts, setToasts] = useState([]);
  const [auditModal, setAuditModal] = useState({ open: false, caseId: null, logs: [] });
  const [cancelled, setCancelled] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [editDriver, setEditDriver] = useState({});
  const [editVenueName, setEditVenueName] = useState({});
  const [editBurialPlace, setEditBurialPlace] = useState({});
  const [editBranch, setEditBranch] = useState({});
  const [assigningVehicle, setAssigningVehicle] = useState({});

  // Fetch active cases and vehicles in one call
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('Fetching active cases data...');
        const { cases: casesData, vehicles: vehiclesData, page: p, total: t, limit: l } = await fetchActiveCases({ page, limit, search, status: statusFilter });
        console.log('Active cases data received:', { cases: casesData, vehicles: vehiclesData });

        const today = new Date();
        const dayStart = new Date(today.toISOString().split('T')[0]);
        const normalizedCases = (casesData || [])
          .filter(c => !['completed', 'archived', 'cancelled'].includes((c.status || '').toLowerCase()))
          .map(c => {
            let warning_past_funeral_date = false;
            let warning_prep_required = false;
            if (c.funeral_date) {
              const funeralDate = new Date(c.funeral_date);
              if (funeralDate < dayStart) {
                warning_past_funeral_date = true;
              }
              const diffMs = funeralDate.getTime() - dayStart.getTime();
              const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
              const okStatuses = ['preparation', 'in_progress', 'completed', 'archived', 'cancelled'];
              if (diffDays <= 1 && diffDays >= 0 && !okStatuses.includes((c.status || '').toLowerCase())) {
                warning_prep_required = true;
              }
            }
            return {
              ...c,
              warning_past_funeral_date: c.warning_past_funeral_date ?? warning_past_funeral_date,
              warning_prep_required: c.warning_prep_required ?? warning_prep_required
            };
          });

        setCases(normalizedCases);
        setVehicles(vehiclesData);
        setTotal(t || normalizedCases.length);
        setPage(p || page);
        setLimit(l || limit);

        try {
          const cancelledCases = await fetchCancelledCases();
          console.log('Cancelled cases fetched:', Array.isArray(cancelledCases) ? cancelledCases.length : cancelledCases);
          setCancelled(Array.isArray(cancelledCases) ? cancelledCases : []);
        } catch (e) {
          console.error('Failed to fetch cancelled cases:', e);
          setCancelled([]);
        }

        // Fetch drivers separately
        try {
          console.log('🔍 Fetching drivers...');
          const driversData = await fetchDrivers();
          console.log(`✅ Drivers loaded: ${driversData.length} drivers`);
          setDrivers(driversData);
        } catch (driversError) {
          console.error('❌ Error fetching drivers:', driversError);
          // Don't fail the whole page if drivers fail to load
        }
      } catch (err) {
        console.error('Data fetch error:', err);
        setError(`Failed to load active cases: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    const messages = [];
    cases.forEach(c => {
      if (c.warning_past_funeral_date) {
        messages.push(`Case ${c.case_number}: funeral date passed`);
      }
      if (c.warning_prep_required) {
        messages.push(`Case ${c.case_number}: preparation required`);
      }
    });
    if (messages.length > 0) {
      setToasts(prev => [...prev, ...messages.map(m => ({ id: Date.now() + Math.random(), text: m }))]);
      setTimeout(() => {
        setToasts([]);
      }, 5000);
      (async () => {
        try {
          await sendActiveCasesAlerts('khumalo4sure@gmail.com');
        } catch (e) { }
      })();
    }
  }, [cases]);

  const handleAssignVehicle = async (caseId) => {
    if (assigningVehicle[caseId]) return;

    if (!selectedVehicle[caseId]) {
      alert('Please select a vehicle first');
      return;
    }

    const vehicle = selectedVehicle[caseId];
    const driver = selectedDriver[caseId];

    if (!driver || !driver.name) {
      alert('Please select a driver for this assignment');
      return;
    }

    try {
      setAssigningVehicle(prev => ({ ...prev, [caseId]: true }));
      await assignVehicle(caseId, {
        vehicle_id: vehicle.id,
        driver_name: driver.name,
        assignment_role: vehicleCategory[caseId] || 'family'
        // pickup_time will be calculated on backend (1.5 hours before funeral time)
      });

      alert('Vehicle assigned successfully!');
      // Refresh data instead of full page reload
      const { cases: casesData, vehicles: vehiclesData } = await fetchActiveCases();
      setCases(casesData);
      setVehicles(vehiclesData);

      // Clear selection for this case
      setSelectedVehicle(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
      setSelectedDriver(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
      setVehicleCategory(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
    } catch (err) {
      console.error('Assign error:', err);
      alert(`Failed to assign vehicle: ${err.message || err.response?.data?.error}`);
    } finally {
      setAssigningVehicle(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
    }
  };

  const classifyVehicleType = (t) => {
    const x = String(t || '').toLowerCase();
    if (x === 'hearse') return 'hearse';
    return 'family';
  };

  const formatVehicleType = (t) => {
    const x = String(t || '').toLowerCase();
    if (x === 'fortuner') return 'Toyota Fortuner';
    if (x === 'q7') return 'Audi Q7';
    if (x === 'v_class') return 'Mercedes-Benz V-Class';
    if (x === 'vito') return 'Mercedes-Benz Vito';
    if (x === 'hearse') return 'Hearse';
    return (t ? String(t).replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Vehicle');
  };

  const handleUpdateRoster = async (rosterId, caseId) => {
    const driver = editDriver[rosterId];
    const vehicle = selectedVehicle[rosterId];

    if (!driver && !vehicle) {
      alert('Please select a driver or vehicle to update');
      return;
    }

    const updates = {};
    if (driver) updates.driver_name = driver.name;
    if (vehicle) updates.vehicle_id = vehicle.id;

    try {
      await updateRoster(rosterId, updates);
      const { cases: casesData, vehicles: vehiclesData } = await fetchActiveCases();
      setCases(casesData);
      setVehicles(vehiclesData);

      // Clear selections
      setEditDriver(prev => {
        const next = { ...prev };
        delete next[rosterId];
        return next;
      });
      setSelectedVehicle(prev => {
        const next = { ...prev };
        delete next[rosterId];
        return next;
      });

      alert('Assignment updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update assignment');
    }
  };

  const handleChangeCaseStatus = async (caseId, newStatus) => {
    setChangingStatus(prev => ({ ...prev, [caseId]: true }));

    try {
      let notes = '';
      if (newStatus === 'cancelled') {
        notes = window.prompt('Enter cancellation reason');
        if (!notes || notes.trim() === '') {
          alert('Cancellation reason is required');
          return;
        }
      } else {
        notes = window.prompt('Optional note for this status change (leave blank to skip)') || '';
      }
      await updateCaseStatus(caseId, newStatus, notes);

      // Refresh data
      const { cases: casesData, vehicles: vehiclesData } = await fetchActiveCases();
      setCases(casesData);
      setVehicles(vehiclesData);

      alert(`Status updated to: ${getStatusConfig(newStatus).label}`);
    } catch (err) {
      console.error('Status change error:', err);
      const serverError = err.response?.data?.error;
      const details = err.response?.data?.details;
      alert(`Failed to update status: ${serverError || err.message}${details ? `\nDetails: ${details}` : ''}`);
    } finally {
      setChangingStatus(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
    }
  };

  const handleUpdateFuneralTime = async (caseId, funeralTime) => {
    setEditingFuneralTime(prev => ({ ...prev, [caseId]: true }));

    try {
      await apiUpdateFuneralTime(caseId, funeralTime);

      // Refresh data
      const { cases: casesData, vehicles: vehiclesData } = await fetchActiveCases();
      setCases(casesData);
      setVehicles(vehiclesData);

      // Clear editing state
      setEditingFuneralTime(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
      setFuneralTimeValues(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });

      alert('Funeral time updated successfully');
    } catch (err) {
      console.error('Funeral time update error:', err);
      alert(`Failed to update funeral time: ${err.message || err.response?.data?.error}`);
    } finally {
      setEditingFuneralTime(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-red-800 mb-2">
            THUSANANG FUNERAL SERVICES
          </h1>
          <p className="text-yellow-600 text-base sm:text-lg md:text-xl font-semibold">
            Live from QwaQwa • Re tšotella sechaba sa rona
          </p>
        </div>
        <div className="p-4 sm:p-6 md:p-8 text-center text-red-600">
          Loading Active Cases...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-red-800 mb-2">
            THUSANANG FUNERAL SERVICES
          </h1>
          <p className="text-yellow-600 text-base sm:text-lg md:text-xl font-semibold">
            Live from QwaQwa • Re tšotella sechaba sa rona
          </p>
        </div>
        <div className="p-4 sm:p-6 md:p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="text-center mb-6 sm:mb-8 md:mb-10">
        {/*<h1 className="text-5xl font-bold text-red-800 mb-2">
          THUSANANG FUNERAL SERVICES
        </h1>*/}
        <p className="text-yellow-600 text-base sm:text-lg md:text-xl font-semibold">
          Live from QwaQwa • Re tšotella sechaba sa rona
        </p>
      </div>

      {/* BACK TO DASHBOARD */}
      <div className="mb-4 sm:mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* PAGE TITLE */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-800 mb-2">
          Active Cases Management
        </h2>
        <p className="text-gray-600 text-sm sm:text-base md:text-lg">
          Manage vehicle assignments for upcoming funerals
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
        <input value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} placeholder="Search by name or case number" className="w-full sm:w-64 px-4 py-2 border rounded-lg" />
        <select value={statusFilter} onChange={e => { setPage(1); setStatusFilter(e.target.value); }} className="px-4 py-2 border rounded-lg">
          <option value="">All active statuses</option>
          <option value="intake">Intake</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparation">Preparation</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
        </select>
        <select value={limit} onChange={e => { setPage(1); setLimit(parseInt(e.target.value, 10)); }} className="px-4 py-2 border rounded-lg">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-t-4 border-red-600">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700">Total Active Cases</h3>
          <p className="text-3xl sm:text-4xl font-bold text-red-600 mt-1 sm:mt-2">{cases.length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700">Vehicles Available</h3>
          <p className="text-3xl sm:text-4xl font-bold text-orange-600 mt-1 sm:mt-2">
            {(() => {
              // Calculate vehicles not assigned to any active case
              const assignedVehicleIds = new Set();
              cases.forEach(c => {
                if (c.roster && c.roster.length > 0) {
                  c.roster.forEach(r => {
                    if (r.vehicle_id) {
                      assignedVehicleIds.add(r.vehicle_id);
                    }
                  });
                }
              });
              return vehicles.filter(v => !assignedVehicleIds.has(v.id)).length;
            })()}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700">Unassigned Cases</h3>
          <p className="text-3xl sm:text-4xl font-bold text-yellow-600 mt-1 sm:mt-2">
            {cases.filter(c => !c.roster || c.roster.length === 0).length}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-t-4 border-gray-500">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700">Cancelled Cases</h3>
          <p className="text-3xl sm:text-4xl font-bold text-gray-700 mt-1 sm:mt-2">{cancelled.length}</p>
        </div>
      </div>
      {/* ACTIVE CASES TABLE */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-t-4 border-red-600 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-red-800 mb-4 sm:mb-6 text-center">
          Active Cases & Vehicle Assignment
        </h2>

        {cases.length === 0 ? (
          <div className="text-center text-gray-500 py-6 sm:py-8">
            <p className="text-base sm:text-lg mb-2">No active cases found.</p>
            <p className="text-xs sm:text-sm">All cases are either completed or there are no upcoming funerals.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Case Number</th>
                    <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Deceased Name</th>
                    <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Funeral Date</th>
                    <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Branch</th>
                    <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Status</th>
                    <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Vehicle Assigned</th>
                    <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 sm:p-4">
                        <div className="font-semibold text-gray-800 text-sm">{c.case_number}</div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="text-gray-800 text-sm">{c.deceased_name}</div>
                        {c.deceased_id && (
                          <div className="text-xs text-gray-600">ID: {c.deceased_id}</div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="text-gray-800 text-sm">
                          {new Date(c.funeral_date).toLocaleDateString()}
                        </div>
                        {(isAdmin() || c.status === 'intake') && !c.warning_past_funeral_date ? (
                          <div className="mt-1">
                            {editingFuneralTime[c.id] ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={funeralTimeValues[c.id] || c.funeral_time || ''}
                                  onChange={(e) => setFuneralTimeValues(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                />
                                <button
                                  onClick={() => handleUpdateFuneralTime(c.id, funeralTimeValues[c.id] || c.funeral_time)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingFuneralTime(prev => {
                                      const newState = { ...prev };
                                      delete newState[c.id];
                                      return newState;
                                    });
                                    setFuneralTimeValues(prev => {
                                      const newState = { ...prev };
                                      delete newState[c.id];
                                      return newState;
                                    });
                                  }}
                                  className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div
                                className="text-xs text-blue-600 cursor-pointer hover:underline flex items-center gap-1"
                                onClick={() => {
                                  setEditingFuneralTime(prev => ({ ...prev, [c.id]: true }));
                                  setFuneralTimeValues(prev => ({ ...prev, [c.id]: c.funeral_time || '' }));
                                }}
                                title="Click to edit funeral time"
                              >
                                {c.funeral_time || 'Not set'} <span className="text-xs">✏️</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          c.funeral_time && (
                            <div className="text-xs text-gray-600">{c.funeral_time}</div>
                          )
                        )}
                        {c.warning_past_funeral_date && (
                          <div className="text-xs text-red-600 mt-1">⚠ Funeral date passed; update status</div>
                        )}
                        {c.warning_prep_required && (
                          <div className="text-xs text-orange-600 mt-1">⚠ Preparation status required</div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="text-gray-800 text-sm font-medium">{c.branch || 'Head Office'}</div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const statusConfig = getStatusConfig(c.status);
                            const suggestedStatus = suggestStatus(c.funeral_date, c.status);
                            const hasSuggestion = suggestedStatus !== c.status;

                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <span {...getStatusBadgeProps(c.status)}>
                                    {statusConfig.icon} {statusConfig.label}
                                  </span>
                                  {hasSuggestion && (
                                    <span className="text-xs text-orange-600" title={`Suggested: ${getStatusConfig(suggestedStatus).label}`}>
                                      💡
                                    </span>
                                  )}
                                </div>

                                {/* Status Change Dropdown */}
                                {getNextStatuses(c.status).length > 0 && (
                                  <select
                                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        if (window.confirm(`Change status to "${getStatusConfig(e.target.value).label}"?`)) {
                                          handleChangeCaseStatus(c.id, e.target.value);
                                        }
                                        e.target.value = '';
                                      }
                                    }}
                                    disabled={changingStatus[c.id] || c.warning_past_funeral_date}
                                  >
                                    <option value="">Change Status...</option>
                                    {getNextStatuses(c.status).map(nextStatus => (
                                      <option key={nextStatus.value} value={nextStatus.value}>
                                        {nextStatus.icon} {nextStatus.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        {isAdmin() && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                              placeholder="Service venue"
                              value={editVenueName[c.id] ?? ''}
                              onChange={e => setEditVenueName(prev => ({ ...prev, [c.id]: e.target.value }))}
                              disabled={c.warning_past_funeral_date}
                            />
                            <input
                              type="text"
                              className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                              placeholder="Burial place"
                              value={editBurialPlace[c.id] ?? ''}
                              onChange={e => setEditBurialPlace(prev => ({ ...prev, [c.id]: e.target.value }))}
                              disabled={c.warning_past_funeral_date}
                            />
                            <select
                              className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                              value={editBranch[c.id] ?? ''}
                              onChange={e => setEditBranch(prev => ({ ...prev, [c.id]: e.target.value }))}
                              disabled={c.warning_past_funeral_date}
                            >
                              <option value="">Change Branch...</option>
                              <option value="Head Office">Head Office</option>
                              <option value="Bethlehem">Bethlehem</option>
                              <option value="QwaQwa">QwaQwa</option>
                              <option value="Harrismith">Harrismith</option>
                              <option value="Reitz">Reitz</option>
                            </select>
                            <button
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={(!editVenueName[c.id] && !editBurialPlace[c.id] && !editBranch[c.id]) || c.warning_past_funeral_date}
                              onClick={async () => {
                                try {
                                  const payload = {};
                                  if (editVenueName[c.id]) payload.venue_name = editVenueName[c.id];
                                  if (editBurialPlace[c.id]) payload.burial_place = editBurialPlace[c.id];
                                  if (editBranch[c.id]) payload.branch = editBranch[c.id];
                                  await updateCaseVenue(c.id, payload);
                                  const { cases: casesData, vehicles: vehiclesData } = await fetchActiveCases({ page, limit, search, status: statusFilter });
                                  setCases(casesData);
                                  setVehicles(vehiclesData);
                                  setEditVenueName(prev => { const n = { ...prev }; delete n[c.id]; return n; });
                                  setEditBurialPlace(prev => { const n = { ...prev }; delete n[c.id]; return n; });
                                  setEditBranch(prev => { const n = { ...prev }; delete n[c.id]; return n; });
                                  alert('Case details updated');
                                } catch (err) {
                                  alert(err.response?.data?.error || err.message || 'Failed to update case venue');
                                }
                              }}
                            >
                              Save Case
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        {c.roster && c.roster.length > 0 ? (
                          <div className="text-green-600 font-medium text-sm">
                            ✓ Assigned ({c.roster.length} vehicle{c.roster.length > 1 ? 's' : ''})
                          </div>
                        ) : (
                          <div className="text-red-600 font-medium text-sm">
                            ⚠ Not Assigned
                          </div>
                        )}
                        <div className="mt-2">
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={async () => {
                              try {
                                const logs = await fetchCaseAuditLog(c.id);
                                setAuditModal({ open: true, caseId: c.id, logs });
                              } catch (e) {
                                alert('Failed to load notes');
                              }
                            }}
                          >
                            View Status Notes
                          </button>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        {(!c.roster || c.roster.length < (c.required_min_vehicles || 1)) ? (
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center gap-4 text-sm">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`vehcat-${c.id}`}
                                  checked={(vehicleCategory[c.id] || 'family') === 'hearse'}
                                  onChange={() => {
                                    setVehicleCategory(prev => ({ ...prev, [c.id]: 'hearse' }));
                                  }}
                                  disabled={c.warning_past_funeral_date}
                                />
                                Hearse
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`vehcat-${c.id}`}
                                  checked={(vehicleCategory[c.id] || 'family') === 'family'}
                                  onChange={() => {
                                    setVehicleCategory(prev => ({ ...prev, [c.id]: 'family' }));
                                  }}
                                  disabled={c.warning_past_funeral_date}
                                />
                                Family Car
                              </label>
                            </div>
                            <select
                              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              value={selectedVehicle[c.id]?.id || ''}
                              onChange={e => {
                                const vehicleId = e.target.value;
                                if (vehicleId) {
                                  const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
                                  setSelectedVehicle(prev => ({
                                    ...prev,
                                    [c.id]: vehicle
                                  }));
                                } else {
                                  setSelectedVehicle(prev => {
                                    const newState = { ...prev };
                                    delete newState[c.id];
                                    return newState;
                                  });
                                }
                              }}
                              disabled={c.warning_past_funeral_date}
                            >
                              <option value="">Select Vehicle</option>
                              {(() => {
                                const availableVehicles = c.available_vehicles || vehicles;
                                return availableVehicles.map(v => (
                                  <option key={v.id} value={v.id}>
                                    {formatVehicleType(v.type)} - {v.reg_number}
                                  </option>
                                ));
                              })()}
                            </select>
                            {c.available_vehicles && c.available_vehicles.length < vehicles.length && (
                              <div className="text-xs text-orange-600 mt-1">
                                ⚠️ Some vehicles unavailable due to time conflicts
                              </div>
                            )}

                            <select
                              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              value={selectedDriver[c.id]?.id || ''}
                              onChange={e => {
                                const driverId = e.target.value;
                                if (driverId) {
                                  const driver = drivers.find(d => d.id === parseInt(driverId));
                                  setSelectedDriver(prev => ({
                                    ...prev,
                                    [c.id]: driver
                                  }));
                                } else {
                                  setSelectedDriver(prev => {
                                    const newState = { ...prev };
                                    delete newState[c.id];
                                    return newState;
                                  });
                                }
                              }}
                              disabled={c.warning_past_funeral_date}
                            >
                              <option value="">Select Driver</option>
                              {drivers.length === 0 ? (
                                <option value="" disabled>No drivers available</option>
                              ) : (
                                drivers.map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.name} {d.contact ? `(${d.contact})` : ''}
                                  </option>
                                ))
                              )}
                            </select>
                            {drivers.length === 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                ⚠️ No drivers found. Run: node database/setup-drivers.js
                              </div>
                            )}

                            <button
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                              onClick={() => handleAssignVehicle(c.id)}
                              disabled={(!selectedVehicle[c.id] || !selectedDriver[c.id]) || c.warning_past_funeral_date || assigningVehicle[c.id]}
                            >
                              {assigningVehicle[c.id] ? 'Assigning...' : 'Assign Vehicle & Driver'}
                            </button>
                            <div className="text-xs text-gray-600">Assigned: {c.roster?.length || 0} / {c.required_min_vehicles || 1}</div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-green-600 font-medium mb-2 text-sm">
                              ✓ Vehicle(s) Assigned ({c.roster.length})
                            </div>
                            {c.roster.map((r, idx) => (
                              <React.Fragment key={idx}>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span>
                                    {(r.assignment_role ? (r.assignment_role === 'hearse' ? 'Hearse' : 'Family') + ' • ' : '')}
                                    Driver: {r.driver_name || 'TBD'}
                                  </span>
                                  <select
                                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                                    value={editDriver[r.id]?.id || ''}
                                    onChange={e => {
                                      const driverId = e.target.value;
                                      const d = drivers.find(d => d.id === parseInt(driverId));
                                      setEditDriver(prev => ({ ...prev, [r.id]: d || null }));
                                    }}
                                  >
                                    <option value="">Change driver...</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    className="bg-blue-600 text-white px-2 py-1 rounded"
                                    onClick={() => handleUpdateRoster(r.id, c.id)}
                                    disabled={(!editDriver[r.id] && !selectedVehicle[r.id]) || c.warning_past_funeral_date}
                                  >
                                    Update
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 mb-2">
                                  <span>Change Vehicle:</span>
                                  <select
                                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                                    value={selectedVehicle[r.id]?.id || ''}
                                    onChange={e => {
                                      const vehicleId = e.target.value;
                                      const v = vehicles.find(veh => veh.id === parseInt(vehicleId));
                                      setSelectedVehicle(prev => ({ ...prev, [r.id]: v || null }));
                                    }}
                                    disabled={c.warning_past_funeral_date}
                                  >
                                    <option value="">Select new vehicle...</option>
                                    {(() => {
                                      const available = c.available_vehicles || vehicles;
                                      return available.map(v => (
                                        <option key={v.id} value={v.id}>
                                          {formatVehicleType(v.type)} - {v.reg_number}
                                        </option>
                                      ));
                                    })()}
                                  </select>
                                </div>
                              </React.Fragment>
                            ))}
                            {c.roster.length < (c.required_min_vehicles || 1) && (
                              <div className="mt-2">
                                <button
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                                  onClick={() => handleAssignVehicle(c.id)}
                                  disabled={(!selectedVehicle[c.id] || !selectedDriver[c.id]) || c.warning_past_funeral_date || assigningVehicle[c.id]}
                                >
                                  {assigningVehicle[c.id] ? 'Assigning...' : 'Add Another Vehicle'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {cases.map(c => (
                <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm mb-1">{c.case_number}</div>
                      <div className="text-sm text-gray-800 mb-1">{c.deceased_name}</div>
                      {c.deceased_id && (
                        <div className="text-xs text-gray-600 mb-1">ID: {c.deceased_id}</div>
                      )}
                    </div>
                    {(() => {
                      const statusConfig = getStatusConfig(c.status);
                      return (
                        <span {...getStatusBadgeProps(c.status)} className="text-xs">
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="text-xs text-gray-600 mb-3 space-y-1">
                    <div>
                      Funeral: {new Date(c.funeral_date).toLocaleDateString()}
                      {((isAdmin || c.status === 'intake') && !c.warning_past_funeral_date) ? (
                        <div className="mt-1">
                          {editingFuneralTime[c.id] ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={funeralTimeValues[c.id] || c.funeral_time || ''}
                                onChange={(e) => setFuneralTimeValues(prev => ({ ...prev, [c.id]: e.target.value }))}
                                className="text-xs border border-gray-300 rounded px-2 py-1 w-24 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                              />
                              <button
                                onClick={() => handleUpdateFuneralTime(c.id, funeralTimeValues[c.id] || c.funeral_time)}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingFuneralTime(prev => {
                                    const newState = { ...prev };
                                    delete newState[c.id];
                                    return newState;
                                  });
                                  setFuneralTimeValues(prev => {
                                    const newState = { ...prev };
                                    delete newState[c.id];
                                    return newState;
                                  });
                                }}
                                className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span
                              className="text-blue-600 cursor-pointer hover:underline ml-1"
                              onClick={() => {
                                setEditingFuneralTime(prev => ({ ...prev, [c.id]: true }));
                                setFuneralTimeValues(prev => ({ ...prev, [c.id]: c.funeral_time || '' }));
                              }}
                            >
                              {c.funeral_time ? `at ${c.funeral_time} ✏️` : 'Click to set time ✏️'}
                            </span>
                          )}
                        </div>
                      ) : (
                        c.funeral_time && ` at ${c.funeral_time}`
                      )}
                    </div>
                    {c.warning_past_funeral_date && (
                      <div className="text-xs text-red-600">⚠ Funeral date passed; update status</div>
                    )}
                    {c.warning_prep_required && (
                      <div className="text-xs text-orange-600">⚠ Preparation status required</div>
                    )}
                    {c.roster && c.roster.length > 0 ? (
                      <div className="text-green-600 font-medium">
                        ✓ Assigned ({c.roster.length} vehicle{c.roster.length > 1 ? 's' : ''})
                      </div>
                    ) : (
                      <div className="text-red-600 font-medium">
                        ⚠ Not Assigned
                      </div>
                    )}

                  </div>

                  {/* CANCELLED CASES */}
                  <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-t-4 border-gray-500 mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
                      Cancelled Cases
                    </h2>
                    {cancelled.length === 0 ? (
                      <div className="text-center text-gray-500 py-6 sm:py-8">
                        <p className="text-base sm:text-lg mb-2">No cancelled cases.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b">
                              <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Case Number</th>
                              <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Deceased Name</th>
                              <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Funeral Date</th>
                              <th className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-sm">Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cancelled.map(c => (
                              <tr key={c.id} className="border-b">
                                <td className="p-3 sm:p-4 text-sm">{c.case_number}</td>
                                <td className="p-3 sm:p-4 text-sm">{c.deceased_name}</td>
                                <td className="p-3 sm:p-4 text-sm">{c.funeral_date ? new Date(c.funeral_date).toLocaleDateString() : '—'}</td>
                                <td className="p-3 sm:p-4 text-sm">{c.updated_at ? new Date(c.updated_at).toLocaleString() : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Status Change */}
                  {getNextStatuses(c.status).length > 0 && (
                    <div className="mb-3">
                      <select
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            if (window.confirm(`Change status to "${getStatusConfig(e.target.value).label}"?`)) {
                              handleChangeCaseStatus(c.id, e.target.value);
                            }
                            e.target.value = '';
                          }
                        }}
                        disabled={changingStatus[c.id] || c.warning_past_funeral_date}
                      >
                        <option value="">Change Status...</option>
                        {getNextStatuses(c.status).map(nextStatus => (
                          <option key={nextStatus.value} value={nextStatus.value}>
                            {nextStatus.icon} {nextStatus.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Vehicle & Driver Assignment */}
                  {(!c.roster || c.roster.length < (c.required_min_vehicles || 1)) ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`vehcatm-${c.id}`}
                            checked={(vehicleCategory[c.id] || 'family') === 'hearse'}
                            onChange={() => {
                              setVehicleCategory(prev => ({ ...prev, [c.id]: 'hearse' }));
                            }}
                            disabled={c.warning_past_funeral_date}
                          />
                          Hearse
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`vehcatm-${c.id}`}
                            checked={(vehicleCategory[c.id] || 'family') === 'family'}
                            onChange={() => {
                              setVehicleCategory(prev => ({ ...prev, [c.id]: 'family' }));
                            }}
                            disabled={c.warning_past_funeral_date}
                          />
                          Family
                        </label>
                      </div>
                      <select
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        value={selectedVehicle[c.id]?.id || ''}
                        onChange={e => {
                          const vehicleId = e.target.value;
                          if (vehicleId) {
                            const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
                            setSelectedVehicle(prev => ({
                              ...prev,
                              [c.id]: vehicle
                            }));
                          } else {
                            setSelectedVehicle(prev => {
                              const newState = { ...prev };
                              delete newState[c.id];
                              return newState;
                            });
                          }
                        }}
                        disabled={c.warning_past_funeral_date}
                      >
                        <option value="">Select Vehicle</option>
                        {(() => {
                          const availableVehicles = c.available_vehicles || vehicles;
                          return availableVehicles.map(v => (
                            <option key={v.id} value={v.id}>
                              {formatVehicleType(v.type)} - {v.reg_number}
                            </option>
                          ));
                        })()}
                      </select>

                      <select
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        value={selectedDriver[c.id]?.id || ''}
                        onChange={e => {
                          const driverId = e.target.value;
                          if (driverId) {
                            const driver = drivers.find(d => d.id === parseInt(driverId));
                            setSelectedDriver(prev => ({
                              ...prev,
                              [c.id]: driver
                            }));
                          } else {
                            setSelectedDriver(prev => {
                              const newState = { ...prev };
                              delete newState[c.id];
                              return newState;
                            });
                          }
                        }}
                        disabled={c.warning_past_funeral_date}
                      >
                        <option value="">Select Driver</option>
                        {drivers.length === 0 ? (
                          <option value="" disabled>No drivers available</option>
                        ) : (
                          drivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.contact ? `(${d.contact})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                      {drivers.length === 0 && (
                        <div className="text-xs text-red-600">
                          ⚠️ No drivers found
                        </div>
                      )}

                      <button
                        className="w-full bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        onClick={() => handleAssignVehicle(c.id)}
                        disabled={(!selectedVehicle[c.id] || !selectedDriver[c.id]) || c.warning_past_funeral_date || assigningVehicle[c.id]}
                      >
                        {assigningVehicle[c.id] ? 'Assigning...' : (c.roster?.length ? 'Add Another Vehicle' : 'Assign Vehicle & Driver')}
                      </button>
                      <div className="text-xs text-gray-600 text-center">Assigned: {c.roster?.length || 0} / {c.required_min_vehicles || 1}</div>
                    </div>
                  ) : (
                    <div className="text-center pt-2 space-y-2">
                      {c.roster.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-center gap-2 text-xs text-gray-600">
                          <span>
                            {(r.assignment_role ? (r.assignment_role === 'hearse' ? 'Hearse' : 'Family') + ' • ' : '')}
                            Driver: {r.driver_name || 'TBD'}
                          </span>
                          <select
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                            value={editDriver[r.id]?.id || ''}
                            onChange={e => {
                              const driverId = e.target.value;
                              const d = drivers.find(d => d.id === parseInt(driverId));
                              setEditDriver(prev => ({ ...prev, [r.id]: d || null }));
                            }}
                          >
                            <option value="">Change driver...</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <button
                            className="bg-blue-600 text-white px-2 py-1 rounded"
                            onClick={() => handleUpdateRoster(r.id, c.id)}
                            disabled={!editDriver[r.id] || c.warning_past_funeral_date}
                          >
                            Update
                          </button>
                        </div>
                      ))}
                      <div className="text-xs text-gray-600">Assigned: {c.roster.length} / {c.required_min_vehicles || 1}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Showing {cases.length} of {total} cases</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 border rounded-lg" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                <div className="px-3">Page {page}</div>
                <button className="px-3 py-2 border rounded-lg" disabled={(page * limit) >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
