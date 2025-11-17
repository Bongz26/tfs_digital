import React from "react";
import POItemRow from "./POItemRow";

const POList = ({ purchaseOrders, onAddItem }) => {
  if (!purchaseOrders.length) return <p className="p-4">No purchase orders yet.</p>;

  return (
    <div className="space-y-6">
      {purchaseOrders.map(po => (
        <div key={po.id} className="p-4 bg-white rounded shadow">
          <h3 className="font-bold text-lg mb-2">{po.po_number} — Status: {po.status}</h3>
          <p>Order Date: {po.order_date} | Expected Delivery: {po.expected_delivery}</p>

          {/* Add Item Form */}
          <POItemRow poId={po.id} onAddItem={onAddItem} />

          {/* Items Table */}
          {po.items && po.items.length > 0 && (
            <table className="w-full mt-2 border-collapse border">
              <thead>
                <tr>
                  <th className="border p-1">ID</th>
                  <th className="border p-1">Inventory Name</th>
                  <th className="border p-1">Qty Ordered</th>
                  <th className="border p-1">Unit Cost</th>
                  <th className="border p-1">Received Qty</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map(item => (
                  <tr key={item.id}>
                    <td className="border p-1">{item.id}</td>
                    <td className="border p-1">{item.inventory_name}</td>
                    <td className="border p-1">{item.quantity_ordered}</td>
                    <td className="border p-1">{item.unit_cost}</td>
                    <td className="border p-1">{item.received_quantity || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
};

export default POList;
