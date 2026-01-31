import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCaseById, assignVehicle, updateCase } from '../api/cases';
import { fetchDrivers } from '../api/drivers';
import { fetchVehicles } from '../api/vehicles';
import { fetchRoster, updateRoster } from '../api/roster';
import { API_HOST } from '../api/config';
import AssignVehicleModal from '../components/AssignVehicleModal';
import AssignedTransportList from '../components/AssignedTransportList';
import { prepareCaseForEdit } from '../utils/caseFormatters';

export default function CaseDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [caseRoster, setCaseRoster] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const loadCase = async () => {
      try {
        const data = await fetchCaseById(id);
        setCaseData(data);

        try {
          // Load drivers, roster, and vehicles in parallel
          const [drv, rost, veh] = await Promise.all([
            fetchDrivers(),
            fetchRoster(),
            fetchVehicles() // Use the imported, authenticated fetcher
          ]);
          setDrivers(drv);
          setCaseRoster((rost || []).filter(r => String(r.case_id) === String(id)));
          setVehicles(veh);
        } catch (innerErr) {
          console.warn("Error loading auxiliary data:", innerErr);
        }

      } catch (err) {
        console.error('Error fetching case:', err);
        setError('Failed to load case details.');
      } finally {
        setLoading(false);
      }
    };

    loadCase();
  }, [id]);

  const handleSaveEdit = async (e) => {
    // Prevent any default form submission behavior
    if (e) e.preventDefault();

    try {
      if (!window.confirm("Are you sure you want to update the case details?")) return;
      const updated = await updateCase(id, editForm);
      setCaseData(updated);
      setIsEditing(false);

      // Use setTimeout to avoid alert causing navigation issues
      setTimeout(() => {
        alert("Case updated successfully");
      }, 100);
    } catch (err) {
      console.error('Update error:', err);
      alert("Failed to update case: " + (err.response?.data?.error || err.message));
    }
  };

  const handleAssignVehicle = async (caseId, assignmentData) => {
    try {
      await assignVehicle(caseId, assignmentData);

      // Refresh roster
      const rost = await fetchRoster();
      setCaseRoster((rost || []).filter(r => String(r.case_id) === String(id)));

      setModalOpen(false);
      alert('Vehicle assigned successfully');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to assign';
      alert(msg);
      throw err;
    }
  };

  if (loading) return <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center text-red-600">Loading case details...</div>;
  if (error) return <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center text-red-600">{error}</div>;
  if (!caseData) return <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center text-gray-600">Case not found</div>;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <Link to="/active-cases" className="text-blue-600 hover:underline mb-6 inline-block">← Back to Active Cases</Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-800">
          Case Details: {caseData.case_number}
        </h1>
        <div>
          {/* Admin Edit Button */}
          {user?.role === 'admin' && !isEditing && (
            <button
              onClick={() => {
                // Transform database data to HTML input-compatible formats
                setEditForm(prepareCaseForEdit(caseData));
                setIsEditing(true);
              }}
              className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition"
            >
              Edit Details
            </button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Deceased Info</h2>
          <p><span className="font-semibold">Name:</span> {caseData.deceased_name}</p>
          <p><span className="font-semibold">Policy Number:</span> {caseData.policy_number || '-'}</p>
          <p><span className="font-semibold">ID:</span> {caseData.deceased_id || '-'}</p>
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Next of Kin</h2>
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-gray-500">Name</label>
                <input className="w-full border rounded p-1" value={editForm.nok_name || ''} onChange={e => setEditForm({ ...editForm, nok_name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Contact</label>
                <input className="w-full border rounded p-1" value={editForm.nok_contact || ''} onChange={e => setEditForm({ ...editForm, nok_contact: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              <p><span className="font-semibold">Name:</span> {caseData.nok_name}</p>
              <p><span className="font-semibold">Contact:</span> {caseData.nok_contact}</p>
              <p><span className="font-semibold">Relation:</span> {caseData.nok_relation || '-'}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Plan Details</h2>
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-gray-500">Plan Name</label>
                <input className="w-full border rounded p-1" value={editForm.plan_name || ''} onChange={e => setEditForm({ ...editForm, plan_name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Category</label>
                <select className="w-full border rounded p-1" value={editForm.plan_category || ''} onChange={e => setEditForm({ ...editForm, plan_category: e.target.value })}>
                  <option value="policyholder">Policyholder</option>
                  <option value="dependent">Dependent</option>
                  <option value="motjha">Motjha</option>
                  <option value="pensioner">Pensioner</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Total Price (R)</label>
                <input type="number" className="w-full border rounded p-1" value={editForm.total_price || ''} onChange={e => setEditForm({ ...editForm, total_price: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              <p><span className="font-semibold">Category:</span> {caseData.plan_category}</p>
              <p><span className="font-semibold">Name:</span> {caseData.plan_name}</p>
              {caseData.plan_category === 'motjha'
                ? <p><span className="font-semibold">Members:</span> {caseData.plan_members}</p>
                : <p><span className="font-semibold">Age Bracket:</span> {caseData.plan_age_bracket}</p>}
              <p><span className="font-semibold">Service Type:</span> {caseData.service_type || 'book'}</p>
              <p><span className="font-semibold">Total Price:</span> R{caseData.total_price}</p>
            </>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Casket & Delivery</h2>
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-gray-500">Casket Type</label>
                <input className="w-full border rounded p-1" value={editForm.casket_type || ''} onChange={e => setEditForm({ ...editForm, casket_type: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Casket Colour</label>
                <input className="w-full border rounded p-1" value={editForm.casket_colour || ''} onChange={e => setEditForm({ ...editForm, casket_colour: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Delivery Date</label>
                <input type="date" className="w-full border rounded p-1" value={editForm.delivery_date || ''} onChange={e => setEditForm({ ...editForm, delivery_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Delivery Time</label>
                <input type="time" className="w-full border rounded p-1" value={editForm.delivery_time || ''} onChange={e => setEditForm({ ...editForm, delivery_time: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              <p><span className="font-semibold">Casket Type:</span> {caseData.casket_type || '-'}</p>
              <p><span className="font-semibold">Casket Colour:</span> {caseData.casket_colour || '-'}</p>
              <p><span className="font-semibold">Delivery Date:</span> {caseData.delivery_date || '-'}</p>
              <p><span className="font-semibold">Delivery Time:</span> {caseData.delivery_time || '-'}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Funeral Info</h2>
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-gray-500">Date</label>
                <input
                  type="date"
                  className="w-full border rounded p-1"
                  value={editForm.funeral_date || editForm.service_date || ''}
                  onChange={e => setEditForm({
                    ...editForm,
                    funeral_date: e.target.value,
                    service_date: e.target.value  // Keep both in sync
                  })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Time</label>
                <input
                  type="time"
                  className="w-full border rounded p-1"
                  value={editForm.funeral_time || editForm.service_time || ''}
                  onChange={e => setEditForm({
                    ...editForm,
                    funeral_time: e.target.value,
                    service_time: e.target.value  // Keep both in sync
                  })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Venue</label>
                <input className="w-full border rounded p-1" value={editForm.venue_name || ''} onChange={e => setEditForm({ ...editForm, venue_name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Service Type</label>
                <select className="w-full border rounded p-1" value={editForm.service_type || 'book'} onChange={e => setEditForm({ ...editForm, service_type: e.target.value })}>
                  <option value="book">Book Only</option>
                  <option value="full_service">Full Service</option>
                </select>
              </div>
            </div>
          ) : (
            <>
              <p><span className="font-semibold">Date:</span> {(caseData.service_date || caseData.funeral_date) ? new Date(caseData.service_date || caseData.funeral_date).toLocaleDateString() : 'Not set'}</p>
              <p><span className="font-semibold">Time:</span> {(caseData.service_time || caseData.funeral_time) ? (caseData.service_time || caseData.funeral_time).slice(0, 5) : 'Not set'}</p>
              <p><span className="font-semibold">Venue:</span> {caseData.venue_name}</p>
              <p><span className="font-semibold">Address:</span> {caseData.venue_address}</p>
            </>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Options</h2>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.requires_cow} onChange={e => setEditForm({ ...editForm, requires_cow: e.target.checked })} />
                <label className="text-sm">Requires Cow</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.requires_tombstone} onChange={e => setEditForm({ ...editForm, requires_tombstone: e.target.checked })} />
                <label className="text-sm">Requires Tombstone</label>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Branch</label>
                <input className="w-full border rounded p-1" value={editForm.branch || ''} onChange={e => setEditForm({ ...editForm, branch: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              <p><span className="font-semibold">Requires Cow:</span> {caseData.requires_cow ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Requires Tombstone:</span> {caseData.requires_tombstone ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Intake Day:</span> {caseData.intake_day || '-'}</p>
              <p><span className="font-semibold">Branch:</span> {caseData.branch || 'Head Office'}</p>
              <p><span className="font-semibold">Status:</span> {caseData.status}</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 p-4 sm:p-6 rounded-xl shadow bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Vehicle & Driver Assignment</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 transition"
          >
            + Assign Transport
          </button>
        </div>

        {caseRoster.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No transport assigned yet.</div>
        ) : (
          <AssignedTransportList roster={caseRoster} />
        )}
      </div>

      <AssignVehicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAssign={handleAssignVehicle}
        vehicles={vehicles}
        drivers={drivers}
        caseNumber={caseData.case_number}
        caseId={id}
      />
    </div >
  );
}

