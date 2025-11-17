// Stock Take Modal Component
import React, { useState, useEffect } from 'react';
import { API_HOST } from '../../api/config';

export default function StockTakeModal({ isOpen, onClose, onComplete }) {
  const [stockTake, setStockTake] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [takenBy, setTakenBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const API_URL = API_HOST;

  // Start new stock take
  const startStockTake = async () => {
    if (!takenBy.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/api/inventory/stock-take/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taken_by: takenBy })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setStockTake({ id: data.stock_take_id, taken_by: takenBy });
        const itemsList = data.items || [];
        console.log('📦 Stock take items received:', itemsList.length);
        if (itemsList.length > 0) {
          console.log('📦 First item keys:', Object.keys(itemsList[0]));
          console.log('📦 First item:', itemsList[0]);
          console.log('📦 First item name:', itemsList[0].name);
        }
        setItems(itemsList);
      } else {
        throw new Error(data.error || 'Failed to start stock take');
      }
    } catch (err) {
      setError(`Failed to start stock take: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update item count
  const updateItemCount = async (itemId, physicalQuantity, notes = '') => {
    if (!stockTake) return;

    try {
      setSaving(true);
      const response = await fetch(
        `${API_URL}/api/inventory/stock-take/${stockTake.id}/item/${itemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            physical_quantity: parseInt(physicalQuantity) || 0,
            notes: notes
          })
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        // Update local state - same structure as inventory items
        setItems(items.map(item =>
          item.inventory_id === itemId
            ? { ...item, ...data.item }
            : item
        ));
      } else {
        throw new Error(data.error || 'Failed to update count');
      }
    } catch (err) {
      setError(`Failed to update count: ${err.message}`);
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
      const response = await fetch(
        `${API_URL}/api/inventory/stock-take/${stockTake.id}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        alert(`Stock take completed! ${data.items_updated} items updated.`);
        onComplete();
        handleClose();
      } else {
        throw new Error(data.error || 'Failed to complete stock take');
      }
    } catch (err) {
      setError(`Failed to complete stock take: ${err.message}`);
    } finally {
      setCompleting(false);
    }
  };

  const handleClose = () => {
    setStockTake(null);
    setItems([]);
    setTakenBy('');
    setError('');
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

          {!stockTake ? (
            // Start Stock Take Form
            <div className="max-w-md mx-auto">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
                <p className="text-blue-800">
                  <strong>Starting a Stock Take:</strong> This will capture the current system quantities
                  for all inventory items. You can then count the physical stock and update the counts.
                </p>
              </div>

              <div className="space-y-4">
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
          ) : (
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
          )}
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
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold"
              >
                Cancel
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
        {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
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

