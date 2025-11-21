// src/pages/ActiveCases.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_HOST } from '../api/config';
import { getStatusConfig, getNextStatuses, suggestStatus, getStatusBadgeProps } from '../utils/caseStatus';

export default function ActiveCases() {
  const [cases, setCases] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState({});
  const [selectedDriver, setSelectedDriver] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingStatus, setChangingStatus] = useState({});
  const [editingFuneralTime, setEditingFuneralTime] = useState({});
  const [funeralTimeValues, setFuneralTimeValues] = useState({});

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

        // Fetch drivers separately
        try {
          console.log('🔍 Fetching drivers from:', `${API_URL}/api/drivers`);
          const driversResponse = await fetch(`${API_URL}/api/drivers`);
          console.log('📡 Drivers response status:', driversResponse.status);
          
          if (driversResponse.ok) {
            const driversData = await driversResponse.json();
            console.log('📦 Drivers API response:', driversData);
            
            if (driversData.success) {
              const driverCount = driversData.drivers?.length || 0;
              console.log(`✅ Drivers loaded: ${driverCount} drivers`);
              if (driverCount > 0) {
                console.log('📋 Driver names:', driversData.drivers.map(d => d.name));
              }
              setDrivers(driversData.drivers || []);
            } else {
              console.warn('⚠️ Drivers API returned success=false:', driversData.error || driversData.message);
              if (driversData.message) {
                console.warn('💡 Message:', driversData.message);
              }
            }
          } else {
            const errorText = await driversResponse.text();
            console.error('❌ Failed to fetch drivers:', driversResponse.status, driversResponse.statusText);
            console.error('Error response:', errorText);
          }
        } catch (driversError) {
          console.error('❌ Error fetching drivers:', driversError);
          console.error('Error details:', driversError.message);
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
  }, [API_URL]);

  const assignVehicle = async (caseId) => {
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
      const res = await fetch(`${API_URL}/api/cases/assign/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          driver_name: driver.name
          // pickup_time will be calculated on backend (1.5 hours before funeral time)
        })
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      alert('Vehicle assigned successfully!');
      // Refresh data instead of full page reload
      const refreshResponse = await fetch(`${API_URL}/api/active-cases`);
      const refreshData = await refreshResponse.json();
      if (refreshData.success) {
        setCases(refreshData.cases || []);
        setVehicles(refreshData.vehicles || []);
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
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert(`Failed to assign vehicle: ${err.message}`);
    }
  };

  const changeCaseStatus = async (caseId, newStatus) => {
    setChangingStatus(prev => ({ ...prev, [caseId]: true }));
    
    try {
      const res = await fetch(`${API_URL}/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      // Refresh data
      const refreshResponse = await fetch(`${API_URL}/api/active-cases`);
      const refreshData = await refreshResponse.json();
      if (refreshData.success) {
        setCases(refreshData.cases || []);
        setVehicles(refreshData.vehicles || []);
      }
      
      alert(`Status updated to: ${getStatusConfig(newStatus).label}`);
    } catch (err) {
      console.error('Status change error:', err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setChangingStatus(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
    }
  };

  const updateFuneralTime = async (caseId, funeralTime) => {
    setEditingFuneralTime(prev => ({ ...prev, [caseId]: true }));
    
    try {
      const res = await fetch(`${API_URL}/api/cases/${caseId}/funeral-time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funeral_time: funeralTime })
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      // Refresh data
      const refreshResponse = await fetch(`${API_URL}/api/active-cases`);
      const refreshData = await refreshResponse.json();
      if (refreshData.success) {
        setCases(refreshData.cases || []);
        setVehicles(refreshData.vehicles || []);
      }
      
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
      alert(`Failed to update funeral time: ${err.message}`);
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
                        {c.status === 'intake' ? (
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
                                  onClick={() => updateFuneralTime(c.id, funeralTimeValues[c.id] || c.funeral_time)}
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
                                          changeCaseStatus(c.id, e.target.value);
                                        }
                                        e.target.value = '';
                                      }
                                    }}
                                    disabled={changingStatus[c.id]}
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
                        {c.roster && c.roster.length > 0 ? (
                          <div className="text-green-600 font-medium text-sm">
                            ✓ Assigned ({c.roster.length} vehicle{c.roster.length > 1 ? 's' : ''})
                          </div>
                        ) : (
                          <div className="text-red-600 font-medium text-sm">
                            ⚠ Not Assigned
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        {(!c.roster || c.roster.length === 0) ? (
                          <div className="flex flex-col space-y-2">
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
                            >
                              <option value="">Select Vehicle</option>
                              {(() => {
                                const availableVehicles = c.available_vehicles || vehicles;
                                return availableVehicles.map(v => (
                                  <option key={v.id} value={v.id}>
                                    {v.type ? v.type.toUpperCase().replace('_', ' ') : 'VEHICLE'} - {v.reg_number}
                                  </option>
                                ));
                              })()}
                            </select>
                            {(!c.roster || c.roster.length === 0) && c.available_vehicles && c.available_vehicles.length < vehicles.length && (
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
                              onClick={() => assignVehicle(c.id)}
                              disabled={!selectedVehicle[c.id] || !selectedDriver[c.id]}
                            >
                              Assign Vehicle & Driver
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-green-600 font-medium mb-2 text-sm">
                              ✓ Vehicle Assigned
                            </div>
                            {c.roster.map((r, idx) => (
                              <div key={idx} className="text-xs text-gray-600">
                                Driver: {r.driver_name || 'TBD'}
                              </div>
                            ))}
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
                      {c.status === 'intake' ? (
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
                                onClick={() => updateFuneralTime(c.id, funeralTimeValues[c.id] || c.funeral_time)}
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

                  {/* Status Change */}
                  {getNextStatuses(c.status).length > 0 && (
                    <div className="mb-3">
                      <select
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            if (window.confirm(`Change status to "${getStatusConfig(e.target.value).label}"?`)) {
                              changeCaseStatus(c.id, e.target.value);
                            }
                            e.target.value = '';
                          }
                        }}
                        disabled={changingStatus[c.id]}
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
                  {(!c.roster || c.roster.length === 0) ? (
                    <div className="space-y-2">
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
                      >
                        <option value="">Select Vehicle</option>
                        {(() => {
                          const availableVehicles = c.available_vehicles || vehicles;
                          return availableVehicles.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.type ? v.type.toUpperCase().replace('_', ' ') : 'VEHICLE'} - {v.reg_number}
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
                        onClick={() => assignVehicle(c.id)}
                        disabled={!selectedVehicle[c.id] || !selectedDriver[c.id]}
                      >
                        Assign Vehicle & Driver
                      </button>
                    </div>
                  ) : (
                    <div className="text-center pt-2">
                      {c.roster.map((r, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          Driver: {r.driver_name || 'TBD'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* AVAILABLE VEHICLES SECTION */}
      {vehicles.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-t-4 border-blue-600 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-blue-800 mb-3 sm:mb-4 text-center">
            Available Vehicles ({vehicles.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition">
                <div className="font-semibold text-gray-800 text-sm sm:text-base">{vehicle.reg_number}</div>
                <div className="text-xs sm:text-sm text-gray-600 capitalize">{vehicle.type ? vehicle.type.replace('_', ' ') : 'Vehicle'}</div>
                <div className="text-xs text-green-600 font-medium mt-1">● Available</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AVAILABLE DRIVERS SECTION */}
      {drivers.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-t-4 border-green-600 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-green-800 mb-3 sm:mb-4 text-center">
            Available Drivers ({drivers.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {drivers.map(driver => (
              <div key={driver.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition">
                <div className="font-semibold text-gray-800 text-sm sm:text-base">{driver.name}</div>
                {driver.contact && (
                  <div className="text-xs sm:text-sm text-gray-600">{driver.contact}</div>
                )}
                <div className="text-xs text-green-600 font-medium mt-1">● Active</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-6 sm:mt-8 md:mt-12 text-center text-xs sm:text-sm text-gray-600">
        <p>
          Toll Free: <span className="font-bold text-red-600">0800 01 4574</span> | Serving with Dignity
        </p>
      </div>
    </div>
  );
}