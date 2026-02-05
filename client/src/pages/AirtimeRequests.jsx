import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAirtimeRequests, listArchivedAirtimeRequests, updateAirtimeRequestStatus } from '../api/sms';

// Airtime Requests Page - Updated with hyperlinks
export default function AirtimeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalId, setModalId] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalMode, setModalMode] = useState('update'); // 'update' | 'view'
  const [modalItem, setModalItem] = useState(null);
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      let data = [];
      if (viewMode === 'active') {
        data = await listAirtimeRequests(); // Fetches < 12 days
      } else {
        data = await listArchivedAirtimeRequests(); // Fetches > 12 days (archived)
      }
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [viewMode]);

  const openModal = (id, status) => {
    setModalId(id);
    setModalStatus(status);
    setModalNotes('');
    setModalMode('update');
    setModalItem(requests.find(x => x.id === id) || null);
    setModalOpen(true);
  };

  const viewNote = (item) => {
    setModalId(item.id);
    setModalStatus('note');
    setModalNotes(String(item.operator_notes || ''));
    setModalMode('view');
    setModalItem(item);
    setModalOpen(true);
  };

  const submitModal = async () => {
    if (!modalNotes || modalNotes.trim() === '') {
      alert('A note is required to update status');
      return;
    }
    setUpdating(prev => ({ ...prev, [modalId]: true }));
    try {
      const updated = await updateAirtimeRequestStatus(modalId, modalStatus, modalNotes);
      setRequests(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      setModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update status');
    } finally {
      setUpdating(prev => ({ ...prev, [modalId]: false }));
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
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-red-800">
              {viewMode === 'active' ? 'Airtime Requests' : 'Archived Requests'}
            </h2>
            <p className="text-gray-600">
              {viewMode === 'active'
                ? 'Showing recent requests (last 12 days)'
                : 'Viewing historical archive (> 12 days old)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="bg-white p-1 rounded-lg border flex shadow-sm">
              <button
                onClick={() => setViewMode('active')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'active'
                    ? 'bg-red-100 text-red-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Active
              </button>
              <button
                onClick={() => setViewMode('archived')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'archived'
                    ? 'bg-gray-200 text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Archived
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
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
                    <th className="px-4 py-2 text-left text-sm font-semibold">Notes</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {r.requested_at ? (() => {
                          const d = new Date(r.requested_at);
                          d.setHours(d.getHours() + 2);
                          return d.toLocaleString();
                        })() : ''}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {r.case_id ? (
                          <Link
                            to={`/cases/${r.case_id}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {r.policy_number || '-'}
                          </Link>
                        ) : (
                          <Link
                            to={`/?policy=${r.policy_number}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            title="Open Draft"
                          >
                            {r.policy_number || '-'} (Draft)
                          </Link>
                        )}
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
                      <td className="px-4 py-2 text-sm">
                        {(() => {
                          const note = String(r.operator_notes || '').trim();
                          if (!note) return '';
                          if (note.length <= 80) return note;
                          return (
                            <div className="flex items-center gap-2">
                              <span>{note.slice(0, 80)}...</span>
                              <button
                                className="text-blue-600 underline text-xs"
                                onClick={() => viewNote(r)}
                              >View</button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={updating[r.id]}
                            onClick={() => openModal(r.id, 'sent')}
                            className="px-3 py-1 rounded bg-green-600 text-white text-sm disabled:bg-gray-400"
                          >
                            Mark Sent
                          </button>
                          <button
                            disabled={updating[r.id]}
                            onClick={() => openModal(r.id, 'failed')}
                            className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:bg-gray-400"
                          >
                            Mark Failed
                          </button>
                          <button
                            disabled={updating[r.id]}
                            onClick={() => openModal(r.id, 'pending')}
                            className="px-3 py-1 rounded bg-yellow-600 text-white text-sm disabled:bg-gray-400"
                          >
                            Reset Pending
                          </button>
                          <button
                            disabled={updating[r.id]}
                            onClick={() => openModal(r.id, 'cancelled')}
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
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <div className="text-lg font-semibold text-gray-800">{modalMode === 'update' ? 'Update Airtime Status' : 'Airtime Request'}</div>
              <div className="text-sm text-gray-500">{modalMode === 'update' ? String(modalStatus).toUpperCase() : (modalItem?.policy_number || '')}</div>
            </div>
            <div className="px-6 py-4">
              {modalItem && (
                <div className="text-xs text-gray-600 mb-3 space-y-1">
                  <div><span className="font-semibold">Policy:</span> {modalItem.policy_number || '-'}</div>
                  <div><span className="font-semibold">Beneficiary:</span> {modalItem.beneficiary_name || '-'}</div>
                  <div><span className="font-semibold">Network/Number:</span> {modalItem.network} • {modalItem.phone_number}</div>
                  <div><span className="font-semibold">Amount:</span> R{Number(modalItem.amount || 0).toFixed(2)}</div>
                  <div><span className="font-semibold">Status:</span> {String(modalItem.status || '').toUpperCase()}</div>
                  <div><span className="font-semibold">Requested by:</span> {modalItem.requested_by_email || '-'} <span className="text-gray-500">({modalItem.requested_by_role || '-'})</span></div>
                  <div><span className="font-semibold">Requested at:</span> {modalItem.requested_at ? new Date(modalItem.requested_at).toLocaleString() : '-'}</div>
                  {modalItem.sent_at && (
                    <div><span className="font-semibold">Sent at:</span> {new Date(modalItem.sent_at).toLocaleString()}</div>
                  )}
                </div>
              )}
              <label className="block text-sm font-medium text-gray-700">Note</label>
              {modalMode === 'update' ? (
                <textarea
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  placeholder="Enter reason or details"
                  className="mt-2 w-full border rounded-lg px-3 py-2 min-h-[100px] focus:ring-2 focus:ring-red-500"
                />
              ) : (
                <div className="mt-2 w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 whitespace-pre-wrap">{modalNotes || '-'}</div>
              )}
            </div>
            <div className="px-6 py-4 flex justify-end gap-3 border-t">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border">{modalMode === 'update' ? 'Cancel' : 'Close'}</button>
              {modalMode === 'update' && (
                <button onClick={submitModal} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Save</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
