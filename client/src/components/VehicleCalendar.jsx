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

  /* ================= FETCH ADMIN DATA ================= */
  useEffect(() => {
    if (!isAdmin()) return;
    const token = getAccessToken();

    fetchDrivers().then(setDrivers).catch(() => setDrivers([]));

    fetch(`${API_HOST}/api/vehicles`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(j => setVehicles(j.vehicles || []))
      .catch(() => setVehicles([]));
  }, [isAdmin]);

  /* ================= FILTER + SORT ================= */
  const filteredRoster = roster.filter(item => {
    if (!item.funeral_date) return viewMode !== "past";
    const d = new Date(item.funeral_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return viewMode === "past" ? d < today : d >= today;
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
        assignments: []
      };
      existing.assignments.push({
        id: i.id,
        driver_name: i.driver_name,
        vehicle_type: i.vehicle_type,
        reg_number: i.reg_number,
        status: i.status
      });
      map.set(key, existing);
    });
    return Array.from(map.values());
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

      {/* VIEW MODE */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-lg border p-1">
          {["upcoming", "past"].map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-6 py-2 rounded-md font-semibold ${viewMode === m
                  ? "bg-red-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {m === "upcoming" ? "📅 Upcoming" : "📜 Past"}
            </button>
          ))}
        </div>
      </div>

      {/* EMPTY STATE */}
      {sortedRoster.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl">
          No services found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupByCase(sortedRoster).map(group => (
            <div
              key={group.case_id}
              className="bg-white border-l-4 border-red-600 rounded-xl shadow p-6"
            >
              <h3 className="font-bold text-red-700">
                {group.case_number || `CASE-${group.case_id}`}
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

              <div className="mt-4 space-y-2">
                {group.assignments.map(a => (
                  <div
                    key={a.id}
                    className="bg-yellow-50 border rounded p-3"
                  >
                    <p className="font-semibold">👤 {a.driver_name || "TBA"}</p>
                    <p className="text-sm">
                      🚗 {a.vehicle_type || "—"} • {a.reg_number || "—"}
                    </p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {a.status || "pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
