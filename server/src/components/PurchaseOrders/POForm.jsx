import React, { useState, useEffect } from "react";
import { API_HOST } from "../../api/config";
import { fetchInventory } from "../../api/inventory";

const POForm = ({ onCreate }) => {
  const [poNumber, setPoNumber] = useState("");
  const [supplierMode, setSupplierMode] = useState("select"); // "select" or "manual"
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [manualSupplierName, setManualSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Item State
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    inventory_id: "",
    quantity_ordered: "",
    unit_cost: ""
  });
  const [quantityCombinedMessage, setQuantityCombinedMessage] = useState("");

  useEffect(() => {
    // Fetch suppliers and inventory
    const loadData = async () => {
      try {
        const [suppliersRes, inventoryRes] = await Promise.all([
          fetch(`${API_HOST}/api/purchase-orders/suppliers`),
          fetchInventory()
        ]);

        const suppliersData = await suppliersRes.json();

        if (suppliersData.success) {
          setSuppliers(suppliersData.suppliers || []);
        }
        setInventory(inventoryRes || []);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
  }, []);

  const handleAddItem = () => {
    if (!currentItem.inventory_id || !currentItem.quantity_ordered) {
      return alert("Please select an item and enter quantity");
    }

    const selectedInv = inventory.find(i => i.id.toString() === currentItem.inventory_id);

    // Get price from inventory if unit_cost is not provided or is 0
    let unitCost = currentItem.unit_cost;
    if (!unitCost || unitCost === "" || parseFloat(unitCost) === 0) {
      if (selectedInv && selectedInv.unit_price) {
        unitCost = selectedInv.unit_price;
      } else {
        unitCost = 0; // Will be fetched from inventory by backend
      }
    }

    const newQuantity = parseInt(currentItem.quantity_ordered, 10);
    const newUnitCost = parseFloat(unitCost) || 0;

    // Check if item already exists in the list (by inventory_id)
    const existingItemIndex = items.findIndex(
      item => item.inventory_id.toString() === currentItem.inventory_id.toString()
    );

    if (existingItemIndex >= 0) {
      // Item already exists - combine quantities instead of adding duplicate
      const updatedItems = [...items];
      const existingItem = updatedItems[existingItemIndex];
      
      // Add the new quantity to existing quantity
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity_ordered: existingItem.quantity_ordered + newQuantity,
        // Keep the existing unit_cost (or update if new one is provided and different)
        // If user wants different price, they should remove and re-add
        unit_cost: existingItem.unit_cost || newUnitCost
      };

      setItems(updatedItems);
      
      // Show a helpful message that quantities were combined
      const itemName = selectedInv ? selectedInv.name : "Unknown Item";
      const totalQty = existingItem.quantity_ordered + newQuantity;
      setQuantityCombinedMessage(`✓ Combined quantities for "${itemName}": ${existingItem.quantity_ordered} + ${newQuantity} = ${totalQty}`);
      
      // Clear message after 3 seconds
      setTimeout(() => setQuantityCombinedMessage(""), 3000);
    } else {
      // Item doesn't exist - add as new item
      const newItem = {
        ...currentItem,
        inventory_name: selectedInv ? selectedInv.name : "Unknown Item",
        quantity_ordered: newQuantity,
        unit_cost: newUnitCost,
        id: Date.now() // Temporary ID for list key
      };

      setItems([...items, newItem]);
    }

    // Clear the form inputs after adding
    setCurrentItem({ inventory_id: "", quantity_ordered: "", unit_cost: "" });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalSupplierName = supplierMode === "select"
      ? suppliers.find(s => s.id.toString() === selectedSupplierId)?.name || ""
      : manualSupplierName;

    if (!poNumber || !finalSupplierName || !orderDate || !supplierEmail) {
      return alert("Please fill all required fields (PO Number, Supplier, Email, Order Date)");
    }

    if (items.length === 0) {
      return alert("Please add at least one item to the purchase order");
    }

    setLoading(true);
    try {
      // Format items for backend - ensure unit_cost is sent as 0 if empty/undefined
      const formattedItems = items.map(item => ({
        inventory_id: item.inventory_id,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost && parseFloat(item.unit_cost) > 0 ? parseFloat(item.unit_cost) : 0
      }));

      const poData = {
        po_number: poNumber,
        supplier_name: finalSupplierName,
        order_date: orderDate,
        expected_delivery: expectedDelivery || null,
        manual_supplier_email: supplierEmail,
        created_by: "frontend-user",
        items: formattedItems // Send formatted items with the PO creation request
      };

      // Only include supplier_id if we're selecting from existing suppliers
      if (supplierMode === "select" && selectedSupplierId) {
        poData.supplier_id = parseInt(selectedSupplierId, 10);
      }

      await onCreate(poData);

      // Reset form
      setPoNumber("");
      setSupplierMode("select");
      setSelectedSupplierId("");
      setManualSupplierName("");
      setSupplierEmail("");
      setOrderDate("");
      setExpectedDelivery("");
      setItems([]);
    } catch (err) {
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to create purchase order";
      console.error("PO Creation Error:", err.response?.data || err);
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle supplier selection change
  const handleSupplierSelect = (supplierId) => {
    setSelectedSupplierId(supplierId);
    if (supplierId) {
      const supplier = suppliers.find(s => s.id.toString() === supplierId);
      if (supplier && supplier.email) {
        setSupplierEmail(supplier.email); // Auto-fill email from selected supplier
      }
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const cost = item.unit_cost || 0;
      return sum + (item.quantity_ordered * cost);
    }, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
      <div className="p-4 bg-red-800 text-white">
        <h2 className="text-lg font-bold">Create Purchase Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        {/* Header Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
            <input
              type="text"
              placeholder="PO-2025-001"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-600 focus:border-red-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
            <input
              type="date"
              value={orderDate}
              onChange={e => setOrderDate(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-600 focus:border-red-600"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="supplierMode"
                  value="select"
                  checked={supplierMode === "select"}
                  onChange={() => setSupplierMode("select")}
                  className="mr-2 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Select Existing</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="supplierMode"
                  value="manual"
                  checked={supplierMode === "manual"}
                  onChange={() => {
                    setSupplierMode("manual");
                    setSelectedSupplierId("");
                    setSupplierEmail("");
                  }}
                  className="mr-2 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Enter New</span>
              </label>
            </div>

            {supplierMode === "select" ? (
              <select
                value={selectedSupplierId}
                onChange={e => handleSupplierSelect(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-600 focus:border-red-600"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.email ? `(${supplier.email})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Enter supplier name"
                value={manualSupplierName}
                onChange={e => setManualSupplierName(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-600 focus:border-red-600"
                required
              />
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Email *</label>
            <input
              type="email"
              placeholder="supplier@example.com"
              value={supplierEmail}
              onChange={e => setSupplierEmail(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-600 focus:border-red-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
            <input
              type="date"
              value={expectedDelivery}
              onChange={e => setExpectedDelivery(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

          {/* Items Section */}
        <div className="mb-6">
          <h3 className="text-md font-bold text-gray-800 mb-3">Order Items</h3>

          {/* Quantity Combined Notification */}
          {quantityCombinedMessage && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              {quantityCombinedMessage}
            </div>
          )}

          {/* Add Item Inputs */}
          <div className="flex flex-col md:flex-row gap-3 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex-1">
              <select
                value={currentItem.inventory_id}
                onChange={e => {
                  const itemId = e.target.value;
                  const selectedInv = inventory.find(i => i.id.toString() === itemId);
                  // Auto-fill price from inventory when item is selected
                  const autoPrice = selectedInv && selectedInv.unit_price ? selectedInv.unit_price.toString() : "";
                  setCurrentItem({ 
                    inventory_id: itemId, 
                    quantity_ordered: currentItem.quantity_ordered, 
                    unit_cost: autoPrice 
                  });
                }}
                className="w-full border border-gray-300 p-2 rounded text-sm"
              >
                <option value="">Select Item</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock: {item.stock_quantity}) {item.unit_price ? `- R${Number(item.unit_price).toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-32">
              <input
                type="number"
                placeholder="Qty"
                min="1"
                value={currentItem.quantity_ordered}
                onChange={e => setCurrentItem({ ...currentItem, quantity_ordered: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded text-sm"
              />
            </div>
            <div className="w-full md:w-32">
              <input
                type="number"
                placeholder="Cost (optional)"
                min="0"
                step="0.01"
                value={currentItem.unit_cost}
                onChange={e => setCurrentItem({ ...currentItem, unit_cost: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded text-sm"
                title="Leave empty to use inventory price"
              />
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm font-medium"
            >
              Add
            </button>
          </div>

          {/* Items List */}
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Cost</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const cost = item.unit_cost || 0;
                    // Use inventory_id as key since duplicates are prevented, with fallback to id or index
                    const rowKey = item.inventory_id || item.id || index;
                    return (
                      <tr key={rowKey} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{item.inventory_name}</td>
                        <td className="px-4 py-2 text-center">{item.quantity_ordered}</td>
                        <td className="px-4 py-2 text-right">
                          {cost > 0 ? `R ${cost.toFixed(2)}` : <span className="text-gray-400 italic">Auto</span>}
                        </td>
                        <td className="px-4 py-2 text-right font-bold">
                          {cost > 0 ? `R ${(item.quantity_ordered * cost).toFixed(2)}` : <span className="text-gray-400 italic">TBD</span>}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="3" className="px-4 py-2 text-right">Total:</td>
                    <td className="px-4 py-2 text-right text-red-800 text-lg">
                      R {calculateTotal().toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4 italic border border-dashed border-gray-300 rounded">
              No items added yet. Add items above.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full bg-red-800 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-md transition-all transform hover:-translate-y-0.5"
        >
          {loading ? "Creating Purchase Order..." : `Create Purchase Order (R ${calculateTotal().toFixed(2)})`}
        </button>
      </form>
    </div>
  );
};

export default POForm;
