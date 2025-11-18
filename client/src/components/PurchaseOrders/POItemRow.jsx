import React, { useState, useEffect } from "react";
import { API_HOST } from "../../api/config";

const POItemRow = ({ poId, onAddItem }) => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch inventory items
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(`${API_HOST}/api/inventory`);
        const data = await response.json();
        if (data.success) {
          setInventoryItems(data.inventory || []);
        }
      } catch (err) {
        console.error("Error fetching inventory:", err);
      }
    };
    fetchInventory();
  }, []);

  // When item is selected, auto-fill price
  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    setSelectedItemId(itemId);
    
    if (itemId) {
      const item = inventoryItems.find(i => i.id === parseInt(itemId));
      setSelectedItem(item);
      // Auto-fill suggested price (can be adjusted)
      if (item && item.unit_price) {
        setUnitCost(item.unit_price.toString());
      } else {
        setUnitCost("");
      }
    } else {
      setSelectedItem(null);
      setUnitCost("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !quantity || !unitCost) {
      return alert("Please select an item, enter quantity, and unit cost");
    }

    setLoading(true);
    try {
      await onAddItem(poId, {
        inventory_id: Number(selectedItemId),
        quantity_ordered: Number(quantity),
        unit_cost: Number(unitCost),
      });

      // Reset form
      setSelectedItemId("");
      setSelectedItem(null);
      setQuantity("");
      setUnitCost("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-3 rounded-lg mb-3">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Add Item to Order</h4>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-600 mb-1">Select Item *</label>
          <select
            value={selectedItemId}
            onChange={handleItemSelect}
            className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-red-600 focus:border-red-600"
            required
          >
            <option value="">-- Choose Item --</option>
            {inventoryItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} {item.category ? `(${item.category})` : ''} {item.unit_price ? `- R${Number(item.unit_price).toFixed(2)}` : ''}
              </option>
            ))}
          </select>
          {selectedItem && (
            <p className="text-xs text-gray-500 mt-1">
              Current stock: {selectedItem.stock_quantity || 0} | 
              Suggested price: R{selectedItem.unit_price ? Number(selectedItem.unit_price).toFixed(2) : 'N/A'}
            </p>
          )}
        </div>

        <div className="w-24">
          <label className="block text-xs text-gray-600 mb-1">Quantity *</label>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Qty"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-red-600 focus:border-red-600"
            required
          />
        </div>

        <div className="w-32">
          <label className="block text-xs text-gray-600 mb-1">Unit Cost (R) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={unitCost}
            onChange={e => setUnitCost(e.target.value)}
            className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-red-600 focus:border-red-600"
            required
          />
          {selectedItem && selectedItem.unit_price && parseFloat(unitCost) !== Number(selectedItem.unit_price) && (
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ Different from suggested price (R{Number(selectedItem.unit_price).toFixed(2)})
            </p>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-red-800 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          {loading ? "Adding..." : "+ Add Item"}
        </button>
      </form>
      
      {inventoryItems.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          No inventory items found. Add items to inventory first.
        </p>
      )}
    </div>
  );
};

export default POItemRow;
