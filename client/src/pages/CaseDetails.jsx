// src/pages/CaseDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCaseById, assignVehicle } from '../api/cases';
import { fetchDrivers } from '../api/drivers';
import { fetchRoster, updateRoster } from '../api/roster';
import { API_HOST } from '../api/config';
import AssignVehicleModal from '../components/AssignVehicleModal';
import AssignedTransportList from '../components/AssignedTransportList';

export default function CaseDetails() {
  const { id } = useParams(); // get case id from route
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [caseRoster, setCaseRoster] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

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

