import React, { useState } from "react";

const POForm = ({ onCreate }) => {
  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poNumber || !supplierId || !orderDate) return alert("Please fill required fields");

    await onCreate({
      po_number: poNumber,
      supplier_id: Number(supplierId),
      order_date: orderDate,
      expected_delivery: expectedDelivery,
      created_by: "frontend-user"
    });

    setPoNumber("");
    setSupplierId("");
    setOrderDate("");
    setExpectedDelivery("");
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
        <input
          type="number"
          placeholder="Supplier ID"
          value={supplierId}
          onChange={e => setSupplierId(e.target.value)}
          className="border p-2 rounded"
          required
        />
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
      <button type="submit" className="mt-4 bg-red-800 text-white px-4 py-2 rounded hover:bg-red-600">
        Create PO
      </button>
    </form>
  );
};

export default POForm;
