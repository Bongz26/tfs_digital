import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchActiveCases } from "../api/activeCases";
import { fetchCancelledCases, assignVehicle, updateCaseStatus, updateCaseVenue } from "../api/cases";
import { fetchDrivers } from "../api/drivers";
import { fetchVehicles } from "../api/vehicles";
import { getNextStatuses, getStatusConfig, CASE_STATUSES } from "../utils/caseStatus";
import AssignVehicleModal from "../components/AssignVehicleModal";
import AssignedTransportList from "../components/AssignedTransportList";

export default function ActiveCases() {
  const { user } = useAuth();
  const location = useLocation();

  // Initialize filter from URL
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get("status") || "all";

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ageFilter, setAgeFilter] = useState("recent"); // 'recent' or 'older'

  const [cases, setCases] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [modalCase, setModalCase] = useState(null); // Case currently being assigned
  const [changingStatus, setChangingStatus] = useState({});

  const isAdmin = () => user?.role === "admin";

  const formatVehicleType = (type) => {
    if (!type) return "";
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      // Only pass status if it's not 'all'
      const statusParam = statusFilter !== 'all' ? statusFilter : undefined;

      const [activeData, cancelledData, driversData, vehiclesData] = await Promise.all([
        fetchActiveCases({
          page,
          limit,
          status: statusParam,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          age_filter: ageFilter // Pass the age filter
        }),
        fetchCancelledCases(),
        fetchDrivers(),
        fetchVehicles()
      ]);

      setCases(activeData.cases || []);
      setVehicles(vehiclesData || []);
      setTotal(activeData.total || 0);
      setCancelled(cancelledData || []);
      setDrivers(driversData || []);
    } catch (err) {
      console.error("Error loading active cases:", err);
      setError("Failed to load active cases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter, fromDate, toDate, ageFilter]); // Re-load when ageFilter changes

  const handleAssignVehicle = async (caseId, assignmentData) => {
    try {
      await assignVehicle(caseId, assignmentData);

      await loadData();
      setModalCase(null);
    } catch (err) {
      alert("Failed to assign vehicle: " + (err.response?.data?.message || err.message));
      throw err; // Propagate error so modal knows it failed
    }
  };

  const handleChangeCaseStatus = async (caseId, newStatus) => {
    try {
      setChangingStatus(prev => ({ ...prev, [caseId]: true }));
      await updateCaseStatus(caseId, newStatus);
      await loadData();
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    } finally {
      setChangingStatus(prev => ({ ...prev, [caseId]: false }));
    }
  };

  const handleToggleYardBurial = async (caseId, currentState) => {
    try {
      // Optimistically update UI immediately for better UX
      setCases(prevCases =>
        prevCases.map(c =>
          c.id === caseId ? { ...c, is_yard_burial: !currentState } : c
        )
      );

      // Update backend
      await updateCaseVenue(caseId, { is_yard_burial: !currentState });

      // Refresh to ensure consistency
      await loadData();
    } catch (err) {
      // Revert on error
      setCases(prevCases =>
        prevCases.map(c =>
          c.id === caseId ? { ...c, is_yard_burial: currentState } : c
        )
      );
      alert("Failed to update burial type: " + (err.response?.data?.message || err.message));
    }
  };

  const isLocked = (c) => c?.warning_past_funeral_date && !isAdmin();

  if (loading && cases.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-xl text-gray-600">Loading Active Cases...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <div className="text-xl font-bold mb-2">Error</div>
        <div>{error}</div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Active Cases</h1>

          {/* VIEW FILTER TOGGLE */}
          <div className="bg-white p-1 rounded-lg border flex shadow-sm">
            <button
              onClick={() => { setAgeFilter('recent'); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${ageFilter === 'recent' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Recent Cases
            </button>
            <button
              onClick={() => { setAgeFilter('older'); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${ageFilter === 'older' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Older {'>'} 2 Weeks
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            <option value="all">All Statuses</option>
            {Object.entries(CASE_STATUSES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white p-2 border rounded-lg">
            <span>From:</span>
            <input type="date" className="border rounded px-2 py-1" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
            <span>To:</span>
            <input type="date" className="border rounded px-2 py-1" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Link
          to="/dashboard"
          className="text-red-600 hover:text-red-800 font-medium"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* ACTIVE CASES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10 bg-white rounded-xl border border-dashed">
            No active cases available.
          </div>
        )}

        {cases.map(c => (
          <div key={c.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5 space-y-5">

            {/* HEADER */}
            <div className="border-b pb-3 flex justify-between items-start">
              <div>
                <div className="font-bold text-lg text-gray-900">{c.case_number}</div>
                <div className="text-sm font-medium text-gray-700">{c.deceased_name}</div>
              </div>
              <div className="text-xs text-right text-gray-500">
                <div className="font-semibold text-red-600">
                  {c.funeral_date
                    ? new Date(c.funeral_date).toLocaleDateString()
                    : "Date TBA"}
                </div>
                {c.funeral_time && <div>{c.funeral_time}</div>}
                {c.warning_past_funeral_date && (
                  <div className="text-red-600 text-xs mt-1">⚠ Funeral date has passed</div>
                )}
              </div>
            </div>

            {/* LOCATION */}
            <div className="bg-gray-50 border rounded-lg p-3 text-sm space-y-1">
              <div className="flex gap-2">
                <span className="font-semibold text-gray-500 w-16">Venue:</span>
                <span className="text-gray-800 truncate">{c.venue_name || "Not specified"}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-gray-500 w-16">Burial:</span>
                <span className="text-gray-800 truncate">{c.burial_place || "Not specified"}</span>
              </div>
            </div>

            {/* YARD BURIAL TOGGLE */}
            <div className="bg-gray-50 p-3 rounded-lg border border-red-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-red-800 uppercase">Service Scale</div>
                <div className="text-[10px] text-red-600">Yard, Stillborn or Baby funerals (Needs 1 vehicle)</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!c.is_yard_burial}
                  onChange={() => handleToggleYardBurial(c.id, !!c.is_yard_burial)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                <span className="ml-2 text-xs font-semibold text-gray-700">{c.is_yard_burial ? 'Small Service' : 'Standard'}</span>
              </label>
            </div>

            {/* STATUS */}
            <div>
              <div className="text-xs uppercase font-semibold text-gray-500 mb-1">Current Status</div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${getStatusConfig(c.status).bgColor} ${getStatusConfig(c.status).textColor}`}>
                  {getStatusConfig(c.status).label}
                </span>
              </div>

              {getNextStatuses(c.status)?.length > 0 && (
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                  disabled={changingStatus[c.id] || isLocked(c)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    if (window.confirm(`Change status to "${getStatusConfig(e.target.value).label}"?`)) {
                      handleChangeCaseStatus(c.id, e.target.value);
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">Update Status...</option>
                  {getNextStatuses(c.status).map(s => (
                    <option key={s.value} value={s.value}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ASSIGNMENT BUTTON */}
            <div className="pt-3">
              <button
                className="w-full bg-red-600 hover:bg-red-700 text-yellow-300 py-2 rounded font-semibold text-sm shadow-sm transition"
                onClick={() => setModalCase(c)}
              >
                Assign Vehicle & Driver
              </button>
            </div>


            {/* DISPLAY ASSIGNED */}
            {c.roster && c.roster.length > 0 && (
              <AssignedTransportList roster={c.roster} formatVehicleType={formatVehicleType} />
            )}


            <div className="pt-2 border-t text-center">
              <Link to={`/cases/${c.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Full Details</Link>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {total > 0 && (
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
          <span className="text-sm text-gray-600">
            Showing {cases.length} of {total}
          </span>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <span className="flex items-center px-2 text-sm text-gray-600">Page {page}</span>
            <button
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              disabled={page * limit >= total}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* CANCELLED */}
      {cancelled.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-bold text-xl text-gray-800 mb-4">Cancelled Cases</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3 font-semibold text-gray-600">Case No.</th>
                  <th className="p-3 font-semibold text-gray-600">Deceased Name</th>
                  <th className="p-3 font-semibold text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {cancelled.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.case_number}</td>
                    <td className="p-3">{c.deceased_name}</td>
                    <td className="p-3">
                      <Link to={`/cases/${c.id}`} className="text-blue-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REUSABLE ASSIGNMENT MODAL */}
      <AssignVehicleModal
        isOpen={!!modalCase}
        onClose={() => setModalCase(null)}
        onAssign={handleAssignVehicle}
        vehicles={vehicles}
        drivers={drivers}
        caseNumber={modalCase?.case_number}
        caseId={modalCase?.id}
      />
    </div>
  );
}
