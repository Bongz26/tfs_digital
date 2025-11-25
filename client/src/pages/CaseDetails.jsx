// src/pages/CaseDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCaseById } from '../api/cases';

export default function CaseDetails() {
  const { id } = useParams(); // get case id from route
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCase = async () => {
      try {
        const data = await fetchCaseById(id);
        setCaseData(data);
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
          <p><span className="font-semibold">Date:</span> {caseData.funeral_date}</p>
          <p><span className="font-semibold">Time:</span> {caseData.funeral_time}</p>
          <p><span className="font-semibold">Venue:</span> {caseData.venue_name}</p>
          <p><span className="font-semibold">Address:</span> {caseData.venue_address}</p>
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Options</h2>
          <p><span className="font-semibold">Requires Cow:</span> {caseData.requires_cow ? 'Yes' : 'No'}</p>
          <p><span className="font-semibold">Requires Tombstone:</span> {caseData.requires_tombstone ? 'Yes' : 'No'}</p>
          <p><span className="font-semibold">Intake Day:</span> {caseData.intake_day || '-'}</p>
          <p><span className="font-semibold">Status:</span> {caseData.status}</p>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Created at: {new Date(caseData.created_at).toLocaleString()}</p>
        <p>Last updated: {new Date(caseData.updated_at).toLocaleString()}</p>
      </div>
    </div>
  );
}
