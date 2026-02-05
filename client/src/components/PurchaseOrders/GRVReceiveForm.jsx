import React, { useState } from "react";
import { receiveGRV } from "../../api/purchaseOrders";

const GRVReceiveForm = ({ poId, items, onSuccess, onCancel }) => {
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [unitCosts, setUnitCosts] = useState({});
  const [receivedBy, setReceivedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize received quantities with current received_quantity or 0
  React.useEffect(() => {
    const initial = {};
    const initialCosts = {};
    items.forEach(item => {
      initial[item.inventory_id] = item.received_quantity || 0;
      // Use PO cost if available, otherwise fallback to current inventory price
      const defaultCost = item.unit_cost && parseFloat(item.unit_cost) > 0
        ? item.unit_cost
        : item.current_inventory_price || 0;
      initialCosts[item.inventory_id] = defaultCost;
    });
    setReceivedQuantities(initial);
    setUnitCosts(initialCosts);
    console.log("DEBUG: GRVReceiveForm items:", items);
    console.log("DEBUG: GRVReceiveForm initialCosts:", initialCosts);
  }, [items]);

  const handleQuantityChange = (inventoryId, value) => {
    const numValue = parseInt(value) || 0;
    setReceivedQuantities(prev => ({
      ...prev,
      [inventoryId]: numValue
    }));
    // Clear error for this item
    if (errors[inventoryId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[inventoryId];
        return newErrors;
      });
    }
  };

  const handleCostChange = (inventoryId, value) => {
    setUnitCosts(prev => ({
      ...prev,
      [inventoryId]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!receivedBy.trim()) {
      newErrors.receivedBy = "Please enter your name";
    }

    let hasAtLeastOneItem = false;
    items.forEach(item => {
      const qty = receivedQuantities[item.inventory_id] || 0;
      if (qty < 0) {
        newErrors[item.inventory_id] = "Quantity cannot be negative";
      }
      if (qty > item.quantity_ordered) {
        newErrors[item.inventory_id] = `Cannot receive more than ordered (${item.quantity_ordered})`;
      }
      if (qty > 0) {
        hasAtLeastOneItem = true;
      }
    });

    if (!hasAtLeastOneItem) {
      newErrors.general = "Please enter at least one quantity to receive";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Build received_items array (only include items with quantity > 0)
    const receivedItems = items
      .filter(item => {
        const qty = receivedQuantities[item.inventory_id] || 0;
        return qty > 0;
      })
      .map(item => ({
        inventory_id: item.inventory_id,
        quantity_received: receivedQuantities[item.inventory_id] || 0,
        new_unit_cost: unitCosts[item.inventory_id]
      }));

    if (receivedItems.length === 0) {
      setErrors({ general: "Please enter at least one quantity to receive" });
      return;
    }

    setLoading(true);
    try {
      await receiveGRV(poId, receivedItems, receivedBy);
      alert("✅ GRV received successfully! Inventory has been updated.");
      if (onSuccess) onSuccess();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to receive GRV";
      alert(`❌ Error: ${errorMsg}`);
      console.error("GRV receive error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 sm:p-6 mt-4">
      <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
        📦 Receive Goods (GRV)
      </h4>

      {errors.general && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Received By Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Received By <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={receivedBy}
            onChange={(e) => {
              setReceivedBy(e.target.value);
              if (errors.receivedBy) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.receivedBy;
                  return newErrors;
                });
              }
            }}
            placeholder="Enter your name"
            className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.receivedBy ? 'border-red-500' : 'border-gray-300'
              }`}
            required
          />
          {errors.receivedBy && (
            <p className="text-red-600 text-xs mt-1">{errors.receivedBy}</p>
          )}
        </div>

        {/* Items to Receive */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Quantities Received
          </label>
          <div className="space-y-3">
            {items.map((item) => {
              const orderedQty = item.quantity_ordered || 0;
              const currentReceived = item.received_quantity || 0;
              const remaining = orderedQty - currentReceived;
              const isFullyReceived = currentReceived >= orderedQty;

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-lg p-3 ${errors[item.inventory_id] ? 'border-red-500' : 'border-gray-200'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">
                        {item.inventory_name || `Item #${item.inventory_id}`}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Ordered: <span className="font-medium">{orderedQty}</span>
                        {currentReceived > 0 && (
                          <> | Already Received: <span className="font-medium">{currentReceived}</span></>
                        )}
                        {!isFullyReceived && (
                          <> | Remaining: <span className="font-medium text-blue-600">{remaining}</span></>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 whitespace-nowrap">Unit Cost (R):</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={unitCosts[item.inventory_id] || ''}
                          onChange={(e) => handleCostChange(item.inventory_id, e.target.value)}
                          className="w-24 border rounded p-2 text-center focus:ring-2 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 whitespace-nowrap">Qty Received:</label>
                        <input
                          type="number"
                          min="0"
                          max={orderedQty}
                          value={receivedQuantities[item.inventory_id] || 0}
                          onChange={(e) => handleQuantityChange(item.inventory_id, e.target.value)}
                          disabled={isFullyReceived}
                          className={`w-20 border rounded p-2 text-center focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors[item.inventory_id] ? 'border-red-500' : 'border-gray-300'
                            } ${isFullyReceived ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                  {errors[item.inventory_id] && (
                    <p className="text-red-600 text-xs mt-1">{errors[item.inventory_id]}</p>
                  )}
                  {isFullyReceived && (
                    <p className="text-green-600 text-xs mt-1">✅ Fully received</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-blue-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {loading ? "Processing..." : "✅ Receive Items"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="sm:w-auto bg-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default GRVReceiveForm;

