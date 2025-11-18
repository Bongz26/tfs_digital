import React, { useState } from "react";
import POItemRow from "./POItemRow";
import { processPurchaseOrder } from "../../api/purchaseOrders";

const POList = ({ purchaseOrders, onAddItem, onReload }) => {
  const [processing, setProcessing] = useState({});
  const [adminEmail, setAdminEmail] = useState("");

  const handleProcess = async (poId, poNumber) => {
    if (!adminEmail) {
      const email = prompt("Enter your email address to receive a copy:");
      if (!email) return;
      setAdminEmail(email);
    }

    const confirmed = window.confirm(
      `Send Purchase Order ${poNumber} to supplier? A copy will be sent to ${adminEmail || 'your email'}.`
    );
    if (!confirmed) return;

    setProcessing({ ...processing, [poId]: true });
    try {
      const result = await processPurchaseOrder(poId, adminEmail);
      alert(
        `Purchase Order processed!\n` +
        `Supplier email: ${result.supplier_email_sent ? '✅ Sent' : '❌ Failed'}\n` +
        `Your copy: ${result.admin_email_sent ? '✅ Sent' : '❌ Failed'}`
      );
      if (onReload) onReload();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing({ ...processing, [poId]: false });
    }
  };

  if (!purchaseOrders.length) return <p className="p-4">No purchase orders yet.</p>;

  return (
    <div className="space-y-6">
      {purchaseOrders.map(po => (
        <div key={po.id} className="p-4 bg-white rounded shadow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">{po.po_number} — Status: {po.status || 'draft'}</h3>
              <p className="text-sm text-gray-600">
                Order Date: {po.order_date} | Expected Delivery: {po.expected_delivery || 'Not set'}
                {po.supplier && ` | Supplier: ${po.supplier.name}`}
              </p>
            </div>
            {po.items && po.items.length > 0 && po.status !== 'sent' && (
              <button
                onClick={() => handleProcess(po.id, po.po_number)}
                disabled={processing[po.id]}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {processing[po.id] ? "Sending..." : "📧 Send to Supplier"}
              </button>
            )}
          </div>

          {/* Add Item Form */}
          <POItemRow poId={po.id} onAddItem={onAddItem} />

          {/* Items Table */}
          {po.items && po.items.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-lg mb-3 text-gray-800">Order Items</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white shadow-sm">
                  <thead>
                    <tr className="bg-red-800 text-white">
                      <th className="border p-3 text-left font-semibold">Item Description</th>
                      <th className="border p-3 text-center font-semibold">Quantity</th>
                      <th className="border p-3 text-right font-semibold">Unit Cost</th>
                      <th className="border p-3 text-right font-semibold">Line Total</th>
                      <th className="border p-3 text-center font-semibold">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, index) => {
                      const lineTotal = (item.quantity_ordered || 0) * (parseFloat(item.unit_cost) || 0);
                      return (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border p-3">
                            <div className="font-semibold text-gray-800">{item.inventory_name || `Item #${item.inventory_id}`}</div>
                            {item.sku && <div className="text-xs text-gray-500 mt-1">SKU: {item.sku}</div>}
                          </td>
                          <td className="border p-3 text-center font-medium">{item.quantity_ordered}</td>
                          <td className="border p-3 text-right">R {parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                          <td className="border p-3 text-right font-semibold text-gray-800">R {lineTotal.toFixed(2)}</td>
                          <td className="border p-3 text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              (item.received_quantity || 0) >= (item.quantity_ordered || 0) 
                                ? 'bg-green-100 text-green-800' 
                                : (item.received_quantity || 0) > 0 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.received_quantity || 0}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan="3" className="border p-3 text-right">TOTAL:</td>
                      <td className="border p-3 text-right text-red-800 text-lg">
                        R {po.items.reduce((sum, item) => sum + ((item.quantity_ordered || 0) * (parseFloat(item.unit_cost) || 0)), 0).toFixed(2)}
                      </td>
                      <td className="border p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default POList;
