// Stock Take Modal Component
import React, { useState, useEffect } from 'react';
import {
  fetchOpenStockTakes as apiFetchOpenStockTakes,
  fetchStockTake as apiFetchStockTake,
  startStockTake as apiStartStockTake,
  cancelStockTake as apiCancelStockTake,
  updateStockTakeItem as apiUpdateStockTakeItem,
  completeStockTake as apiCompleteStockTake
} from '../../api/inventory';

export default function StockTakeModal({ isOpen, onClose, onComplete }) {
  const [stockTake, setStockTake] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [takenBy, setTakenBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [openStockTakes, setOpenStockTakes] = useState([]);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [view, setView] = useState('list'); // 'list' or 'new' or 'active'

  // Fetch open stock takes
  const fetchOpenStockTakes = async () => {
    try {
      setLoadingOpen(true);
      const stockTakes = await apiFetchOpenStockTakes();
      setOpenStockTakes(stockTakes || []);
    } catch (err) {
      console.error('Error fetching open stock takes:', err);
      // Don't set error state here to avoid blocking UI, just log it
    } finally {
      setLoadingOpen(false);
    }
  };

  // Load existing stock take
  const loadStockTake = async (stockTakeId) => {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetchStockTake(stockTakeId);

      if (data.success) {
        setStockTake(data.stock_take);
        setItems(data.items || []);
        setView('active');
      } else {
        throw new Error(data.error || 'Failed to load stock take');
      }
    } catch (err) {
      setError(`Failed to load stock take: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cancel stock take
  const cancelStockTake = async (stockTakeId) => {
    if (!window.confirm('Are you sure you want to cancel this stock take? This action cannot be undone.')) {
      return;
    }

    try {
      setCancelling(true);
      const data = await apiCancelStockTake(stockTakeId);

      if (data.success) {
        // Refresh open stock takes list
        await fetchOpenStockTakes();
        if (stockTake && stockTake.id === stockTakeId) {
          // If cancelling the currently active one, reset
          setStockTake(null);
          setItems([]);
          setView('list');
        }
      } else {
        throw new Error(data.error || 'Failed to cancel stock take');
      }
    } catch (err) {
      setError(`Failed to cancel stock take: ${err.response?.data?.error || err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  // Load open stock takes when modal opens
  useEffect(() => {
    if (isOpen && !stockTake) {
      fetchOpenStockTakes();
      setView('list');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Start new stock take
  const startStockTake = async () => {
    if (!takenBy.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await apiStartStockTake(takenBy);

      if (data.success) {
        setStockTake({ id: data.stock_take_id, taken_by: takenBy });
        const itemsList = data.items || [];
        console.log('📦 Stock take items received:', itemsList.length);
        if (itemsList.length > 0) {
          console.log('📦 First item keys:', Object.keys(itemsList[0]));
          console.log('📦 First item:', itemsList[0]);
          console.log('📦 First item name:', itemsList[0].name);
          console.log('📦 First item color:', itemsList[0].color); // Debug color
        }
        setItems(itemsList);
        setView('active');
        // Refresh open stock takes list
        await fetchOpenStockTakes();
      } else {
        throw new Error(data.error || 'Failed to start stock take');
      }
    } catch (err) {
      // If limit reached, refresh open stock takes and show error
      if (err.response && err.response.status === 400 && err.response.data?.open_count >= 2) {
        await fetchOpenStockTakes();
        setView('list');
      }
      setError(`Failed to start stock take: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update item count
  const updateItemCount = async (itemId, physicalQuantity, notes = '') => {
    if (!stockTake) return;

    try {
      setSaving(true);
      const updatedItem = await apiUpdateStockTakeItem(
        stockTake.id,
        itemId,
        {
          physical_quantity: parseInt(physicalQuantity) || 0,
          notes: notes
        }
      );

      // Update local state
      setItems(items.map(item =>
        item.inventory_id === itemId
          ? { ...item, ...updatedItem }
          : item
      ));

    } catch (err) {
      setError(`Failed to update count: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Complete stock take
  const completeStockTake = async () => {
    if (!stockTake) return;

    const confirmed = window.confirm(
      'Are you sure you want to complete this stock take? This will update all inventory quantities.'
    );

    if (!confirmed) return;

    try {
      setCompleting(true);
      setError('');
      const data = await apiCompleteStockTake(stockTake.id);

      if (data.success) {
        alert(`Stock take completed! ${data.items_updated} items updated.`);
        // Refresh open stock takes list
        await fetchOpenStockTakes();
        onComplete();
        // Reset state
        setStockTake(null);
        setItems([]);
        setTakenBy('');
        setError('');
        setView('list');
        onClose(); // Explicitly close the modal
      } else {
        throw new Error(data.error || 'Failed to complete stock take');
      }
    } catch (err) {
      setError(`Failed to complete stock take: ${err.response?.data?.error || err.message}`);
    } finally {
      setCompleting(false);
    }
  };

  const handleClose = () => {
    setStockTake(null);
    setItems([]);
    setTakenBy('');
    setError('');
    setView('list');
    setOpenStockTakes([]);
    onClose();
  };

  const itemsCounted = items.filter(item => item.physical_quantity !== null).length;
  const totalItems = items.length;
  const hasDifferences = items.some(item => item.difference !== null && item.difference !== 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-red-800 text-white p-6 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Stock Take</h2>
            {stockTake && (
              <p className="text-red-200 text-sm mt-1">
                Stock Take #{stockTake.id} • Started by: {stockTake.taken_by}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-red-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-600 p-4 mb-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {view === 'list' && !stockTake ? (
            // List of Open Stock Takes
            <div className="max-w-2xl mx-auto">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
                <p className="text-blue-800">
                  <strong>Stock Take Sessions:</strong> You can have a maximum of 2 open stock take sessions at a time.
                  {openStockTakes.length >= 2 && (
                    <span className="block mt-2 text-red-600 font-semibold">
                      ⚠️ Maximum sessions reached. Complete or cancel an existing session to start a new one.
                    </span>
                  )}
                </p>
              </div>

              {loadingOpen ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading open stock takes...</p>
                </div>
              ) : openStockTakes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No open stock take sessions.</p>
                  <button
                    onClick={() => setView('new')}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold"
                  >
                    Start New Stock Take
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Open Stock Takes ({openStockTakes.length}/2)
                  </h3>
                  {openStockTakes.map((st) => (
                    <div
                      key={st.id}
                      className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            Stock Take #{st.id}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Started by: <span className="font-medium">{st.taken_by}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {new Date(st.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => loadStockTake(st.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                          >
                            Continue
                          </button>
                          <button
                            onClick={() => cancelStockTake(st.id)}
                            disabled={cancelling}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold disabled:bg-gray-400"
                          >
                            {cancelling ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {openStockTakes.length < 2 && (
                    <button
                      onClick={() => setView('new')}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold mt-4"
                    >
                      + Start New Stock Take
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : view === 'new' && !stockTake ? (
            // Start Stock Take Form
            <div className="max-w-md mx-auto">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
                <p className="text-blue-800">
                  <strong>Starting a Stock Take:</strong> This will capture the current system quantities
                  for all inventory items. You can then count the physical stock and update the counts.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setView('list')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-semibold mb-4"
                >
                  ← Back to Open Sessions
                </button>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={takenBy}
                    onChange={(e) => setTakenBy(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    onKeyPress={(e) => e.key === 'Enter' && startStockTake()}
                  />
                </div>

                <button
                  onClick={startStockTake}
                  disabled={loading || !takenBy.trim()}
                  className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting...' : 'Start Stock Take'}
                </button>
              </div>
            </div>
          ) : stockTake ? (
            // Stock Take Items
            <div>
              {/* Progress Bar */}
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Progress: {itemsCounted} of {totalItems} items counted
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {Math.round((itemsCounted / totalItems) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(itemsCounted / totalItems) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3 text-left font-semibold text-gray-700">Item</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Category</th>
                      <th className="p-3 text-center font-semibold text-gray-700">System Qty</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Physical Qty</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Difference</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Notes</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <StockTakeItemRow
                        key={item.id || index}
                        item={item}
                        onUpdate={updateItemCount}
                        saving={saving}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {stockTake && (
          <div className="bg-gray-50 p-6 rounded-b-xl border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {hasDifferences && (
                <span className="text-orange-600 font-semibold">
                  ⚠️ Differences detected - review before completing
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this stock take? This action cannot be undone.')) {
                    cancelStockTake(stockTake.id);
                  }
                }}
                disabled={cancelling}
                className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-semibold disabled:bg-gray-400"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Session'}
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold"
              >
                Close
              </button>
              <button
                onClick={completeStockTake}
                disabled={completing || itemsCounted === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {completing ? 'Completing...' : 'Complete Stock Take'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Item Row Component
function StockTakeItemRow({ item, onUpdate, saving }) {
  const [physicalQty, setPhysicalQty] = useState(item.physical_quantity?.toString() || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(item.inventory_id, physicalQty, notes);
    setIsEditing(false);
  };

  const difference = item.difference !== null ? item.difference :
    (physicalQty ? parseInt(physicalQty) - item.system_quantity : null);

  const differenceClass = difference === null ? '' :
    difference > 0 ? 'text-green-600 font-semibold' :
      difference < 0 ? 'text-red-600 font-semibold' : 'text-gray-600';

  return (
    <tr className={`border-b hover:bg-gray-50 ${item.physical_quantity !== null ? 'bg-green-50' : ''}`}>
      <td className="p-3">
        <div className="font-semibold text-gray-800">{item.name || `Item ${item.inventory_id}`}</div>
        <div className="flex flex-col text-xs text-gray-500">
          {item.sku && <span>SKU: {item.sku}</span>}
          {item.model && <span>Model: {item.model}</span>}
          {item.color && (
            <span className="font-medium text-gray-700 mt-0.5">
              Color: {item.color}
            </span>
          )}
        </div>
      </td>
      <td className="p-3">
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs capitalize">
          {item.category || 'other'}
        </span>
      </td>
      <td className="p-3 text-center font-semibold text-gray-700">
        {item.system_quantity}
      </td>
      <td className="p-3 text-center">
        {isEditing ? (
          <input
            type="number"
            value={physicalQty}
            onChange={(e) => setPhysicalQty(e.target.value)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
            autoFocus
          />
        ) : (
          <span className={`font-semibold ${item.physical_quantity !== null ? 'text-green-600' : 'text-gray-400'}`}>
            {item.physical_quantity !== null ? item.physical_quantity : '—'}
          </span>
        )}
      </td>
      <td className={`p-3 text-center ${differenceClass}`}>
        {difference !== null ? (
          difference > 0 ? `+${difference}` : difference
        ) : '—'}
      </td>
      <td className="p-3">
        {isEditing ? (
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes..."
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        ) : (
          <span className="text-sm text-gray-600">{item.notes || '—'}</span>
        )}
      </td>
      <td className="p-3 text-center">
        {isEditing ? (
          <div className="flex space-x-2 justify-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setPhysicalQty(item.physical_quantity?.toString() || '');
                setNotes(item.notes || '');
              }}
              className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            {item.physical_quantity !== null ? 'Edit' : 'Count'}
          </button>
        )}
      </td>
    </tr>
  );
}

