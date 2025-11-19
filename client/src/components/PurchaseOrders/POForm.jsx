import React, { useState, useEffect } from "react";
import { API_HOST } from "../../api/config";

const POForm = ({ onCreate }) => {
  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch suppliers
    const fetchSuppliers = async () => {
      try {
        const response = await fetch(`${API_HOST}/api/purchase-orders/suppliers`);
        const data = await response.json();
        if (data.success) {
          setSuppliers(data.suppliers || []);
        }
      } catch (err) {
        console.error("Error fetching suppliers:", err);
      }
    };
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poNumber || !supplierName || !orderDate) {
      return alert("Please fill all required fields");
    }

    setLoading(true);
    try {
      await onCreate({
        po_number: poNumber,
        supplier_name: supplierName,
        order_date: orderDate,
        expected_delivery: expectedDelivery,
        created_by: "frontend-user"
      });

      setPoNumber("");
      setSupplierName("");
      setOrderDate("");
      setExpectedDelivery("");
    } catch (err) {
      alert(err.message || "Failed to create purchase order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-white rounded-lg shadow-md mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Create Purchase Order</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-1 font-medium">PO Number *</label>
          <input
            type="text"
            placeholder="PO-2025-001"
            value={poNumber}
            onChange={e => setPoNumber(e.target.value)}
            className="w-full border border-gray-300 p-2.5 sm:p-2 rounded-lg text-base focus:ring-2 focus:ring-red-600 focus:border-red-600"
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-1 font-medium">Supplier *</label>
          <select
            value={supplierName}
            onChange={e => setSupplierName(e.target.value)}
            className="w-full border border-gray-300 p-2.5 sm:p-2 rounded-lg text-base focus:ring-2 focus:ring-red-600 focus:border-red-600"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.name}>
                {supplier.name} {supplier.email ? `(${supplier.email})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-1 font-medium">Order Date *</label>
          <input
            type="date"
            value={orderDate}
            onChange={e => setOrderDate(e.target.value)}
            className="w-full border border-gray-300 p-2.5 sm:p-2 rounded-lg text-base focus:ring-2 focus:ring-red-600 focus:border-red-600"
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-1 font-medium">Expected Delivery</label>
          <input
            type="date"
            value={expectedDelivery}
            onChange={e => setExpectedDelivery(e.target.value)}
            className="w-full border border-gray-300 p-2.5 sm:p-2 rounded-lg text-base focus:ring-2 focus:ring-red-600 focus:border-red-600"
          />
        </div>
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="mt-3 sm:mt-4 w-full sm:w-auto bg-red-800 text-white px-6 py-2.5 sm:py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-base sm:text-sm transition-colors"
      >
        {loading ? "Creating..." : "Create PO"}
      </button>
      {suppliers.length === 0 && (
        <p className="mt-2 text-xs sm:text-sm text-gray-600">
          No suppliers found. Please add suppliers to the database first.
        </p>
      )}
    </form>
  );
};

export default POForm;
