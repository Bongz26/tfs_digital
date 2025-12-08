import React, { useEffect, useState } from 'react';
import { listAirtimeRequests, updateAirtimeRequestStatus } from '../api/sms';

export default function AirtimeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listAirtimeRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (id, status) => {
    setUpdating(prev => ({ ...prev, [id]: true }));
    try {
      let notes = '';
      if (status === 'cancelled') {
        notes = window.prompt('Enter cancellation reason');
        if (!notes || notes.trim() === '') {
          setUpdating(prev => ({ ...prev, [id]: false }));
          return;
        }
      } else {
        notes = window.prompt('Optional note for this status change (leave blank to skip)') || '';
      }
      const updated = await updateAirtimeRequestStatus(id, status, notes);
      setRequests(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update status');
    } finally {
      setUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const filtered = requests.filter(r => (statusFilter ? String(r.status || '').toLowerCase() === statusFilter : true));

  const statusBadge = (s) => {
    const x = String(s || '').toLowerCase();
    if (x === 'sent') return 'bg-green-100 text-green-800';
    if (x === 'failed') return 'bg-red-100 text-red-800';
    if (x === 'cancelled') return 'bg-gray-200 text-gray-700';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-red-800">Airtime Requests</h2>
            <p className="text-gray-600">View and update airtime delivery status</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">Loading...</div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-4 bg-white border rounded">No requests</div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bg-white rounded-xl shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Requested</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Policy</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Beneficiary</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Details</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {r.requested_at ? new Date(r.requested_at).toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="font-semibold">{r.policy_number || '-'}</div>
                        <div className="text-gray-500">{r.case_number ? `Case ${r.case_number}` : ''}</div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="font-semibold">{r.beneficiary_name || '-'}</div>
                        <div className="text-gray-500">{r.requested_by_email || ''}</div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div>{r.network} • {r.phone_number}</div>
                      </td>
                      <td className="px-4 py-2 text-sm">R{Number(r.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge(r.status)}`}>
                          {String(r.status || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={updating[r.id]}
                            onClick={() => handleUpdate(r.id, 'sent')}
                            className="px-3 py-1 rounded bg-green-600 text-white text-sm disabled:bg-gray-400"
                          >
                            Mark Sent
                          </button>
                          <button
                            disabled={updating[r.id]}
                            onClick={() => handleUpdate(r.id, 'failed')}
                            className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:bg-gray-400"
                          >
                            Mark Failed
                          </button>
                          <button
                            disabled={updating[r.id]}
                            onClick={() => handleUpdate(r.id, 'pending')}
                            className="px-3 py-1 rounded bg-yellow-600 text-white text-sm disabled:bg-gray-400"
                          >
                            Reset Pending
                          </button>
                          <button
                            disabled={updating[r.id]}
                            onClick={() => handleUpdate(r.id, 'cancelled')}
                            className="px-3 py-1 rounded bg-gray-600 text-white text-sm disabled:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

