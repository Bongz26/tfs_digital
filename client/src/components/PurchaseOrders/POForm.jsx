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
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow mb-6">
      <h2 className="text-xl font-bold mb-4">Create Purchase Order</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="PO Number"
          value={poNumber}
          onChange={e => setPoNumber(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <select
          value={supplierName}
          onChange={e => setSupplierName(e.target.value)}
          className="border p-2 rounded"
          required
        >
          <option value="">Select Supplier</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.name}>
              {supplier.name} {supplier.email ? `(${supplier.email})` : ''}
            </option>
          ))}
        </select>
        <input
          type="date"
          placeholder="Order Date"
          value={orderDate}
          onChange={e => setOrderDate(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="date"
          placeholder="Expected Delivery"
          value={expectedDelivery}
          onChange={e => setExpectedDelivery(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="mt-4 bg-red-800 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create PO"}
      </button>
      {suppliers.length === 0 && (
        <p className="mt-2 text-sm text-gray-600">
          No suppliers found. Please add suppliers to the database first.
        </p>
      )}
    </form>
  );
};

export default POForm;
