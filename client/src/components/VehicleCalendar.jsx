import React, { useEffect, useState } from "react";
import { API_HOST } from "../api/config";
import { getAccessToken } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { fetchDrivers } from "../api/drivers";
import { updateRoster } from "../api/roster";
import { updateCaseVenue, updateFuneralTime } from "../api/cases";

export default function VehicleCalendar() {
  const { isAdmin } = useAuth();

  const [roster, setRoster] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [viewMode, setViewMode] = useState("upcoming");

  const [editDriver, setEditDriver] = useState({});
  const [editVehicle, setEditVehicle] = useState({});
  const [editStatus, setEditStatus] = useState({});
  const [saving, setSaving] = useState({});
  const [editingAssignments, setEditingAssignments] = useState({});

  const [editVenueName, setEditVenueName] = useState({});
  const [editBurialPlace, setEditBurialPlace] = useState({});
  const [editCaseFuneralTime, setEditCaseFuneralTime] = useState({});
  const [caseFuneralTimeValues, setCaseFuneralTimeValues] = useState({});
  const [permissionError, setPermissionError] = useState(null);
  const [activeTeamTab, setActiveTeamTab] = useState(0);
  const [groupsSortBy, setGroupsSortBy] = useState("date"); // date or time
  const [groupsQuickFilter, setGroupsQuickFilter] = useState("this_week"); // Default to This Week



  /* ================= FETCH ROSTER ================= */
  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API_HOST}/api/roster`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.status === 401) {
          setAuthError("Session expired. Please login again.");
          throw new Error("401");
        }
        return res.json();
      })
      .then(data => setRoster(data.roster || []))
      .catch(() => setRoster([]))
      .finally(() => setLoading(false));
  }, []);

  /* ================= FETCH DATA (Drivers/Vehicles) ================= */
  useEffect(() => {
    const token = getAccessToken();

    // Fetch drivers for everyone (needed for assignment)
    fetchDrivers().then(setDrivers).catch(() => setDrivers([]));

    // Fetch vehicles for everyone
    fetch(`${API_HOST}/api/vehicles`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(j => setVehicles(j.vehicles || []))
      .catch(() => setVehicles([]));
  }, []);

  /* ================= FILTER + SORT ================= */
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const filteredRoster = roster.filter(item => {
    if (!item.funeral_date) return viewMode !== "past";
    const itemDate = new Date(item.funeral_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPast = itemDate < today;

    if (viewMode === "upcoming") {
      return itemDate >= today;
    }

    // Groups handles its own filtering based on user selection
    if (viewMode === "groups") {
      return true; // Show all data, let user filter control it
    }

    // Past View Logic
    if (!isPast) return false;

    // Apply Date Range Filters if set
    if (filterFrom) {
      const from = new Date(filterFrom);
      from.setHours(0, 0, 0, 0);
      if (itemDate < from) return false;
    }

    if (filterTo) {
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      if (itemDate > to) return false;
    }

    return true;
  });

  const sortedRoster = [...filteredRoster].sort((a, b) => {
    if (!a.funeral_date || !b.funeral_date) return 0;
    return viewMode === "past"
      ? new Date(b.funeral_date) - new Date(a.funeral_date)
      : new Date(a.funeral_date) - new Date(b.funeral_date);
  });

  /* ================= GROUPING ================= */
  const groupByCase = items => {
    const map = new Map();
    items.forEach(i => {
      const key = i.case_id || i.id;
      const existing = map.get(key) || {
        case_id: key,
        case_number: i.case_number,
        deceased_name: i.deceased_name,
        funeral_date: i.funeral_date,
        funeral_time: i.funeral_time,
        venue_name: i.venue_name,
        case_status: i.case_status || 'intake',
        assignments: []
      };
      existing.assignments.push({
        id: i.id,
        driver_name: i.driver_name,
        vehicle_id: i.vehicle_id,     // Needed for edit dropdown
        vehicle_type: i.vehicle_type,
        reg_number: i.reg_number,
        status: i.status
      });
      map.set(key, existing);
    });
    return Array.from(map.values());
  };

  // Group cases by their driver team combination
  const groupCasesByDriverTeam = (cases) => {
    const teams = {};

    cases.forEach(caseGroup => {
      // Get unique drivers for this case
      const uniqueDrivers = [...new Set(
        caseGroup.assignments.map(a => a.driver_name || 'TBD')
      )];
      // Create signature from sorted driver names
      const signature = uniqueDrivers.sort().join(' + ');

      if (!teams[signature]) {
        teams[signature] = {
          driverTeam: signature,
          drivers: uniqueDrivers,
          cases: []
        };
      }

      teams[signature].cases.push(caseGroup);
    });

    return Object.values(teams);
  };


  /* ================= UI ================= */
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

      {permissionError && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-600 text-red-800 px-4 py-3 rounded-lg shadow-md animate-pulse">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-lg">🔒 Permission Denied</p>
              <p className="mt-1">{permissionError}</p>
            </div>
            <button
              onClick={() => setPermissionError(null)}
              className="text-red-600 hover:text-red-800 font-bold text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}


      <div className="mb-6 flex flex-col items-center gap-4">
        {/* VIEW MODE TOGGLE */}
        <div className="inline-flex rounded-lg border p-1 bg-white shadow-sm">
          {["upcoming", "groups", "past"].map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-6 py-2 rounded-md font-semibold transition ${viewMode === m
                ? "bg-red-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {m === "upcoming" ? "📅 Upcoming" : m === "groups" ? "👥 Groups" : "📜 Past Services"}
            </button>
          ))}
        </div>

        {/* DATE FILTERS (Only for Past) */}
        {viewMode === "past" && (
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-lg border shadow-sm animate-fade-in-down">
            <span className="text-gray-600 text-sm font-medium">Filter by Date:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            {(filterFrom || filterTo) && (
              <button
                onClick={() => { setFilterFrom(""); setFilterTo(""); }}
                className="ml-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* EMPTY STATE */}
      {sortedRoster.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl">
          No services found.
        </div>
      ) : viewMode === "groups" ? (() => {
        // GROUPS VIEW - User-controlled filtering (no automatic filters)

        // Apply user-selected quick filter
        let filteredRoster = sortedRoster;

        if (groupsQuickFilter === "today") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          filteredRoster = sortedRoster.filter(item => {
            if (!item.funeral_date) return false;
            const itemDate = new Date(item.funeral_date);
            return itemDate >= today && itemDate < tomorrow;
          });
        } else if (groupsQuickFilter === "this_week") {
          // This Week = Monday to Sunday of current week
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

          // Calculate Monday of this week
          const monday = new Date(today);
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
          monday.setDate(monday.getDate() - daysFromMonday);
          monday.setHours(0, 0, 0, 0);

          // Calculate Sunday of this week
          const sunday = new Date(monday);
          sunday.setDate(sunday.getDate() + 6); // 6 days after Monday
          sunday.setHours(23, 59, 59, 999);

          filteredRoster = sortedRoster.filter(item => {
            if (!item.funeral_date) return false;
            const itemDate = new Date(item.funeral_date);
            return itemDate >= monday && itemDate <= sunday;
          });
        } else if (groupsQuickFilter === "past_week") {
          // Past Week = Previous Monday to Previous Sunday
          const today = new Date();
          const dayOfWeek = today.getDay();

          // Calculate Monday of this week first
          const thisMonday = new Date(today);
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          thisMonday.setDate(thisMonday.getDate() - daysFromMonday);

          // Previous Monday is 7 days before this Monday
          const prevMonday = new Date(thisMonday);
          prevMonday.setDate(prevMonday.getDate() - 7);
          prevMonday.setHours(0, 0, 0, 0);

          // Previous Sunday is 6 days after previous Monday
          const prevSunday = new Date(prevMonday);
          prevSunday.setDate(prevSunday.getDate() + 6);
          prevSunday.setHours(23, 59, 59, 999);

          filteredRoster = sortedRoster.filter(item => {
            if (!item.funeral_date) return false;
            const itemDate = new Date(item.funeral_date);
            return itemDate >= prevMonday && itemDate <= prevSunday;
          });
        }
        // "all" shows everything - no filter applied

        // 3. Group by driver team
        const driverTeams = groupCasesByDriverTeam(groupByCase(filteredRoster));

        // 4. Sort cases within each team
        driverTeams.forEach(team => {
          team.cases.sort((a, b) => {
            if (groupsSortBy === "date") {
              if (!a.funeral_date) return 1;
              if (!b.funeral_date) return -1;
              return new Date(a.funeral_date) - new Date(b.funeral_date);
            } else if (groupsSortBy === "time") {
              // Sort by funeral time (assumes format like "10:00")
              if (!a.funeral_time) return 1;
              if (!b.funeral_time) return -1;
              return a.funeral_time.localeCompare(b.funeral_time);
            }
            return 0;
          });
        });

        return (
          <div>
            {/* CONTROLS BAR - Quick Filter & Sort */}
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between bg-white p-3 rounded-lg  border shadow-sm">
              <div className="flex gap-3 items-center">
                {/* Quick Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-600">Filter:</label>
                  <select
                    value={groupsQuickFilter}
                    onChange={(e) => setGroupsQuickFilter(e.target.value)}
                    className="border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="this_week">This Week (Mon-Sun)</option>
                    <option value="past_week">Past Week (Mon-Sun)</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-600">Sort by:</label>
                  <select
                    value={groupsSortBy}
                    onChange={(e) => setGroupsSortBy(e.target.value)}
                    className="border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="date">Date</option>
                    <option value="time">Time</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                {groupByCase(filteredRoster).length} service{groupByCase(filteredRoster).length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Generate smart labels based on day of week */}
            {(() => {
              // Helper function to get day of week label
              const getDayLabel = (dateStr) => {
                if (!dateStr) return null;
                const date = new Date(dateStr);
                const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return { day, dayName: dayNames[day] };
              };

              // Assign smart labels to each team
              const dayCounters = {}; // Track count per day for numbering

              driverTeams.forEach((team, index) => {
                // Get primary day from first case in team
                const firstCase = team.cases[0];
                const dayInfo = getDayLabel(firstCase?.funeral_date);

                if (!dayInfo) {
                  team.smartLabel = `Group ${index + 1}`;
                  return;
                }

                const { day, dayName } = dayInfo;

                // Initialize counter for this day
                if (!dayCounters[dayName]) {
                  dayCounters[dayName] = 0;
                }
                dayCounters[dayName]++;

                // Monday-Friday (1-5): Use day abbreviation
                if (day >= 1 && day <= 5) {
                  team.smartLabel = dayName;
                }
                // Saturday (6): Use numbered groups
                else if (day === 6) {
                  team.smartLabel = `Group ${dayCounters[dayName]}`;
                }
                // Sunday (0): Use alphabetic labels
                else if (day === 0) {
                  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                  const letter = letters[dayCounters[dayName] - 1] || dayCounters[dayName];
                  team.smartLabel = `Sunday ${letter}`;
                }
              });

              return null; // Just for labeling, no render
            })()}

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {driverTeams.map((team, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTeamTab(index)}
                  className={`px-4 py-3 rounded-lg font-semibold whitespace-nowrap transition-all shadow-sm ${activeTeamTab === index
                    ? 'bg-red-600 text-white shadow-md scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${activeTeamTab === index ? 'bg-white/20' : 'bg-red-100 text-red-600'
                      }`}>
                      {team.smartLabel && team.smartLabel.length <= 3 ? team.smartLabel : (index + 1)}
                    </span>
                    <div className="text-left">
                      <div className="text-sm font-bold">{team.smartLabel || `Group ${index + 1}`}</div>
                      <div className="text-xs opacity-90">{team.driverTeam}</div>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${activeTeamTab === index ? 'bg-white/20' : 'bg-red-600 text-white'
                      }`}>
                      {team.cases.length}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* ACTIVE TAB CONTENT */}
            {driverTeams[activeTeamTab] && (
              <div>
                {/* Team Header */}
                <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-600 rounded-lg">
                  <h3 className="text-lg font-bold text-red-800 mb-1">
                    Driver Team: {driverTeams[activeTeamTab].driverTeam}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {driverTeams[activeTeamTab].cases.length} Service{driverTeams[activeTeamTab].cases.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Cases Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {driverTeams[activeTeamTab].cases.map(group => (
                    <div
                      key={group.case_id}
                      className="bg-white border-l-4 border-red-600 rounded-xl shadow p-6"
                    >
                      <h3 className="font-bold text-red-700 flex items-center justify-between"
                        onClick={() => console.log('DEBUG CASE:', { id: group.case_id, status: group.case_status, isAdmin: isAdmin() })}>
                        <span>{group.case_number || `CASE-${group.case_id}`}</span>
                        {/* Case Status Badge */}
                        <span className={`text-xs px-2 py-1 rounded-full ${group.case_status === 'scheduled' || group.case_status === 'in_progress' || group.case_status === 'completed'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                          }`}>
                          {group.case_status?.toUpperCase() || 'INTAKE'}
                        </span>
                      </h3>

                      <p className="font-semibold text-lg">
                        {group.deceased_name || "Name not available"}
                      </p>

                      <p className="text-sm text-gray-600">
                        📍 {group.venue_name || "Venue TBA"}
                      </p>

                      <p className="text-sm text-gray-600">
                        ⏰ {group.funeral_time || "Time TBA"}
                      </p>

                      {/* Locked Case Warning */}
                      {(group.case_status === 'scheduled' || group.case_status === 'in_progress' || group.case_status === 'completed') && (
                        <div className={`mt-2 p-2 rounded text-xs ${isAdmin()
                          ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                          : 'bg-red-50 border border-red-200 text-red-700'
                          }`}>
                          <span className="font-semibold">🔒 Locked Assignment</span>
                          <p className="mt-1">
                            {isAdmin()
                              ? '⚠️ Admin Override Active - You can modify driver/vehicle assignments'
                              : 'This case has been submitted. Only administrators can modify assignments.'}
                          </p>
                        </div>
                      )}

                      {isAdmin() && (
                        <div className="mt-2">
                          {!editCaseFuneralTime[group.case_id] ? (
                            <button
                              className="text-xs text-blue-600 underline"
                              onClick={() =>
                                setEditCaseFuneralTime(prev => ({
                                  ...prev,
                                  [group.case_id]: true
                                }))
                              }
                            >
                              Edit Time
                            </button>
                          ) : (
                            <div className="flex gap-2 mt-2">
                              <input
                                type="time"
                                className="border rounded px-2 py-1 text-sm"
                                value={caseFuneralTimeValues[group.case_id] || ""}
                                onChange={e =>
                                  setCaseFuneralTimeValues(prev => ({
                                    ...prev,
                                    [group.case_id]: e.target.value
                                  }))
                                }
                              />
                              <button
                                className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                                onClick={async () => {
                                  await updateFuneralTime(
                                    group.case_id,
                                    caseFuneralTimeValues[group.case_id]
                                  );
                                  window.location.reload();
                                }}
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 space-y-3">
                        {/* Group assignments by driver */}
                        {(() => {
                          // Group this case's assignments by driver
                          const driverGroups = {};
                          group.assignments.forEach(a => {
                            const driverKey = a.driver_name || 'TBD';
                            if (!driverGroups[driverKey]) {
                              driverGroups[driverKey] = {
                                driver: driverKey,
                                assignments: []
                              };
                            }
                            driverGroups[driverKey].assignments.push(a);
                          });

                          const groups = Object.values(driverGroups);

                          // If single driver with single vehicle, show simple view
                          if (groups.length === 1 && groups[0].assignments.length === 1) {
                            const a = groups[0].assignments[0];
                            return (
                              <div
                                key={a.id}
                                className={`border rounded p-3 transition-colors ${editingAssignments[a.id] ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'bg-yellow-50 hover:bg-yellow-100 cursor-pointer'
                                  }`}
                              >
                                {editingAssignments[a.id] ? (
                                  <div className="space-y-3">
                                    {/* Edit Mode */}
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-500 uppercase">Driver</label>
                                      <select
                                        className="w-full border rounded p-1 text-sm bg-white"
                                        value={editDriver[a.id] !== undefined ? editDriver[a.id] : (a.driver_name || "")}
                                        onChange={(e) => setEditDriver(prev => ({ ...prev, [a.id]: e.target.value }))}
                                      >
                                        <option value="">Select Driver...</option>
                                        {drivers.map(d => (
                                          <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold text-gray-500 uppercase">Vehicle</label>
                                      <select
                                        className="w-full border rounded p-1 text-sm bg-white"
                                        value={editVehicle[a.id] !== undefined ? editVehicle[a.id] : (a.vehicle_id || "")}
                                        onChange={(e) => setEditVehicle(prev => ({ ...prev, [a.id]: e.target.value }))}
                                      >
                                        <option value="">Select Vehicle...</option>
                                        {vehicles.map(v => (
                                          <option key={v.id} value={v.id}>{v.type} - {v.reg_number}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingAssignments(prev => ({ ...prev, [a.id]: false }));
                                          setPermissionError(null);
                                        }}
                                        className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setSaving(prev => ({ ...prev, [a.id]: true }));
                                          setPermissionError(null);

                                          try {
                                            const updates = {};
                                            const dName = editDriver[a.id];
                                            if (dName !== undefined && dName !== a.driver_name) updates.driver_name = dName;

                                            const vId = editVehicle[a.id];
                                            if (vId !== undefined && vId !== a.vehicle_id) updates.vehicle_id = vId;

                                            if (Object.keys(updates).length > 0) {
                                              await updateRoster(a.id, updates);
                                              window.location.reload();
                                            } else {
                                              setEditingAssignments(prev => ({ ...prev, [a.id]: false }));
                                            }
                                          } catch (err) {
                                            console.error("Update failed", err);
                                            if (err.response && err.response.status === 403) {
                                              setPermissionError(err.response.data.error || "Permission Denied");
                                            } else {
                                              alert("Failed to update: " + (err.message || "Unknown error"));
                                            }
                                          } finally {
                                            setSaving(prev => ({ ...prev, [a.id]: false }));
                                          }
                                        }}
                                        disabled={saving[a.id]}
                                        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm"
                                      >
                                        {saving[a.id] ? "Saving..." : "Save Changes"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      setEditingAssignments(prev => ({ ...prev, [a.id]: true }));
                                      setEditDriver(prev => ({ ...prev, [a.id]: a.driver_name }));
                                      setEditVehicle(prev => ({ ...prev, [a.id]: a.vehicle_id }));
                                    }}
                                    className="relative group-hover:scale-[1.01] transition-transform"
                                  >
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1">
                                      <span className="text-xs text-blue-600 font-bold bg-white px-1 rounded shadow">✎ EDIT</span>
                                    </div>
                                    <p className="font-semibold">👤 {a.driver_name || "Assign Driver..."}</p>
                                    <p className="text-sm text-gray-700">
                                      🚗 {a.vehicle_type || "Vehicle"} • {a.reg_number || "Assign..."}
                                    </p>
                                    <div className="mt-2 flex justify-between items-center">
                                      <span className={`text-xs px-2 py-1 rounded ${a.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        a.status === 'on_route' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                        {a.status || "pending"}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Multiple drivers or multiple vehicles - show grouped view
                          return groups.map((driverGroup, groupIndex) => (
                            <div
                              key={groupIndex}
                              className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-500 rounded-lg p-3"
                            >
                              {/* Group Header */}
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-red-200">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-gray-800">
                                    👤 {driverGroup.driver}
                                  </div>
                                </div>
                              </div>

                              {/* Group Assignments */}
                              <div className="space-y-2">
                                {driverGroup.assignments.map(a => (
                                  <div
                                    key={a.id}
                                    className={`border rounded p-2 transition-colors ${editingAssignments[a.id] ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'bg-white hover:bg-gray-50 cursor-pointer'
                                      }`}
                                  >
                                    {editingAssignments[a.id] ? (
                                      <div className="space-y-2">
                                        {/* Edit Mode */}
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-500 uppercase">Driver</label>
                                          <select
                                            className="w-full border rounded p-1 text-xs bg-white"
                                            value={editDriver[a.id] !== undefined ? editDriver[a.id] : (a.driver_name || "")}
                                            onChange={(e) => setEditDriver(prev => ({ ...prev, [a.id]: e.target.value }))}
                                          >
                                            <option value="">Select Driver...</option>
                                            {drivers.map(d => (
                                              <option key={d.id} value={d.name}>{d.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="block text-xs font-semibold text-gray-500 uppercase">Vehicle</label>
                                          <select
                                            className="w-full border rounded p-1 text-xs bg-white"
                                            value={editVehicle[a.id] !== undefined ? editVehicle[a.id] : (a.vehicle_id || "")}
                                            onChange={(e) => setEditVehicle(prev => ({ ...prev, [a.id]: e.target.value }))}
                                          >
                                            <option value="">Select Vehicle...</option>
                                            {vehicles.map(v => (
                                              <option key={v.id} value={v.id}>{v.type} - {v.reg_number}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingAssignments(prev => ({ ...prev, [a.id]: false }));
                                              setPermissionError(null);
                                            }}
                                            className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              setSaving(prev => ({ ...prev, [a.id]: true }));
                                              setPermissionError(null);

                                              try {
                                                const updates = {};
                                                const dName = editDriver[a.id];
                                                if (dName !== undefined && dName !== a.driver_name) updates.driver_name = dName;

                                                const vId = editVehicle[a.id];
                                                if (vId !== undefined && vId !== a.vehicle_id) updates.vehicle_id = vId;

                                                if (Object.keys(updates).length > 0) {
                                                  await updateRoster(a.id, updates);
                                                  window.location.reload();
                                                } else {
                                                  setEditingAssignments(prev => ({ ...prev, [a.id]: false }));
                                                }
                                              } catch (err) {
                                                console.error("Update failed", err);
                                                if (err.response && err.response.status === 403) {
                                                  setPermissionError(err.response.data.error || "Permission Denied");
                                                } else {
                                                  alert("Failed to update: " + (err.message || "Unknown error"));
                                                }
                                              } finally {
                                                setSaving(prev => ({ ...prev, [a.id]: false }));
                                              }
                                            }}
                                            disabled={saving[a.id]}
                                            className="px-2 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm"
                                          >
                                            {saving[a.id] ? "Saving..." : "Save"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => {
                                          setEditingAssignments(prev => ({ ...prev, [a.id]: true }));
                                          setEditDriver(prev => ({ ...prev, [a.id]: a.driver_name }));
                                          setEditVehicle(prev => ({ ...prev, [a.id]: a.vehicle_id }));
                                        }}
                                        className="relative"
                                      >
                                        <p className="text-sm font-medium text-gray-800">
                                          🚗 {a.vehicle_type || "Vehicle"} • {a.reg_number || "Assign..."}
                                        </p>
                                        <div className="mt-1 flex justify-between items-center">
                                          <span className={`text-xs px-1.5 py-0.5 rounded ${a.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            a.status === 'on_route' ? 'bg-blue-100 text-blue-700' :
                                              'bg-gray-100 text-gray-600'
                                            }`}>
                                            {a.status || "pending"}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })() : (
        // UPCOMING / PAST VIEW - Show all cases in grid
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {groupByCase(sortedRoster).map(group => (
            <div
              key={group.case_id}
              className="bg-white border-l-4 border-red-600 rounded-xl shadow p-6"
            >
              {/* Same content as in Groups view - will duplicate entire case card */}
              <h3 className="font-bold text-red-700 flex items-center justify-between"
                onClick={() => console.log('DEBUG CASE:', { id: group.case_id, status: group.case_status, isAdmin: isAdmin() })}>
                <span>{group.case_number || `CASE-${group.case_id}`}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${group.case_status === 'scheduled' || group.case_status === 'in_progress' || group.case_status === 'completed'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600'
                  }`}>
                  {group.case_status?.toUpperCase() || 'INTAKE'}
                </span>
              </h3>
              <p className="font-semibold text-lg">
                {group.deceased_name || "Name not available"}
              </p>
              <p className="text-sm text-gray-600">
                📍 {group.venue_name || "Venue TBA"}
              </p>
              <p className="text-sm text-gray-600">
                ⏰ {group.funeral_time || "Time TBA"}
              </p>

              {(group.case_status === 'scheduled' || group.case_status === 'in_progress' || group.case_status === 'completed') && (
                <div className={`mt-2 p-2 rounded text-xs ${isAdmin()
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                  <span className="font-semibold">🔒 Locked Assignment</span>
                  <p className="mt-1">
                    {isAdmin()
                      ? '⚠️ Admin Override Active - You can modify driver/vehicle assignments'
                      : 'This case has been submitted. Only administrators can modify assignments.'}
                  </p>
                </div>
              )}

              {group.assignments && group.assignments.length > 0 && (
                <div className="mt-3 text-sm text-gray-700">
                  <div className="font-semibold text-gray-600 mb-1">Assignments:</div>
                  {group.assignments.map((a, i) => (
                    <div key={i} className="text-xs">
                      • {a.driver_name || "TBD"} - {a.vehicle_type || "Vehicle"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


