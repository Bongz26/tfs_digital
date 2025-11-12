// client/src/pages/CaseDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function CaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await fetch(`${API_URL}/api/cases/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to load case');
        setCaseData(result.case);
      } catch (err) {
        console.error('Error fetching case:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, API_URL]);

  if (loading) return <p className="p-6 text-center">Loading case details...</p>;
  if (error) return <p className="p-6 text-center text-red-600">{error}</p>;
  if (!caseData) return <p className="p-6 text-center">Case not found.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-3xl font-bold text-center text-red-600 mb-6">
        Case Details: {caseData.case_number}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><strong>Deceased Name:</strong> {caseData.deceased_name}</div>
        <div><strong>ID Number:</strong> {caseData.deceased_id || 'N/A'}</div>
        <div><strong>Next of Kin:</strong> {caseData.nok_name}</div>
        <div><strong>Contact:</strong> {caseData.nok_contact}</div>
        <div><strong>Relation:</strong> {caseData.nok_relation || 'N/A'}</div>
        <div><strong>Plan Category:</strong> {caseData.plan_category}</div>
        <div><strong>Plan Name:</strong> {caseData.plan_name}</div>
        {caseData.plan_category !== 'colour_grade' && (
          <div>
            <strong>
              {caseData.plan_category === 'motjha' ? 'Members' : 'Age Bracket'}:
            </strong>{' '}
            {caseData.plan_category === 'motjha'
              ? caseData.plan_members
              : caseData.plan_age_bracket}
          </div>
        )}
        <div><strong>Funeral Date:</strong> {caseData.funeral_date}</div>
        <div><strong>Funeral Time:</strong> {caseData.funeral_time || 'N/A'}</div>
        <div><strong>Venue:</strong> {caseData.venue_name || 'N/A'}</div>
        <div><strong>Address:</strong> {caseData.venue_address}</div>
        <div><strong>Requires Cow:</strong> {caseData.requires_cow ? 'Yes' : 'No'}</div>
        <div><strong>Requires Tombstone:</strong> {caseData.requires_tombstone ? 'Yes' : 'No'}</div>
        <div><strong>Status:</strong> {caseData.status}</div>
        <div><strong>Intake Day:</strong> {caseData.intake_day || 'N/A'}</div>
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/dashboard"
          className="btn-red px-6 py-2 rounded text-white font-semibold"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
