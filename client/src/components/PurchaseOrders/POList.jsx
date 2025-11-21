import React, { useState } from "react";
import POItemRow from "./POItemRow";
import GRVReceiveForm from "./GRVReceiveForm";
import { processPurchaseOrder } from "../../api/purchaseOrders";

const POList = ({ purchaseOrders, onAddItem, onReload }) => {
  const [processing, setProcessing] = useState({});
  const [adminEmail, setAdminEmail] = useState("");
  const [showGRVForm, setShowGRVForm] = useState({});

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
    <div className="space-y-4 sm:space-y-6">
      {purchaseOrders.map(po => (
        <div key={po.id} className="p-3 sm:p-4 bg-white rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3 sm:mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg break-words">
                {po.po_number} <span className="text-sm font-normal text-gray-600">— {po.status || 'draft'}</span>
              </h3>
              <div className="text-xs sm:text-sm text-gray-600 mt-1 space-y-1">
                <p className="break-words">Order Date: {po.order_date}</p>
                <p className="break-words">Expected: {po.expected_delivery || 'Not set'}</p>
                {po.supplier && <p className="break-words">Supplier: {po.supplier.name}</p>}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {po.items && po.items.length > 0 && po.status !== 'sent' && (
                <button
                  onClick={() => handleProcess(po.id, po.po_number)}
                  disabled={processing[po.id]}
                  className="w-full sm:w-auto bg-green-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                >
                  {processing[po.id] ? "Sending..." : "📧 Send to Supplier"}
                </button>
              )}
              {po.items && po.items.length > 0 && (po.status === 'sent' || po.status === 'received') && (
                <button
                  onClick={() => setShowGRVForm(prev => ({ ...prev, [po.id]: !prev[po.id] }))}
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors"
                >
                  {showGRVForm[po.id] ? "❌ Cancel Receive" : "📦 Receive Items (GRV)"}
                </button>
              )}
            </div>
          </div>

          {/* Add Item Form */}
          <POItemRow poId={po.id} onAddItem={onAddItem} />

          {/* GRV Receive Form */}
          {showGRVForm[po.id] && po.items && po.items.length > 0 && (
            <GRVReceiveForm
              poId={po.id}
              items={po.items}
              onSuccess={() => {
                setShowGRVForm(prev => ({ ...prev, [po.id]: false }));
                if (onReload) onReload();
              }}
              onCancel={() => setShowGRVForm(prev => ({ ...prev, [po.id]: false }))}
            />
          )}

          {/* Items Table - Desktop View */}
          {po.items && po.items.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-base sm:text-lg mb-3 text-gray-800">Order Items</h4>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse bg-white shadow-sm">
                  <thead>
                    <tr className="bg-red-800 text-white">
                      <th className="border p-3 text-left font-semibold text-sm">Item Description</th>
                      <th className="border p-3 text-center font-semibold text-sm">Quantity</th>
                      <th className="border p-3 text-right font-semibold text-sm">Unit Cost</th>
                      <th className="border p-3 text-right font-semibold text-sm">Line Total</th>
                      <th className="border p-3 text-center font-semibold text-sm">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, index) => {
                      const lineTotal = (item.quantity_ordered || 0) * (parseFloat(item.unit_cost) || 0);
                      return (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border p-3">
                            <div className="font-semibold text-gray-800 text-sm">{item.inventory_name || `Item #${item.inventory_id}`}</div>
                            {item.sku && <div className="text-xs text-gray-500 mt-1">SKU: {item.sku}</div>}
                          </td>
                          <td className="border p-3 text-center font-medium text-sm">{item.quantity_ordered}</td>
                          <td className="border p-3 text-right text-sm">R {parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                          <td className="border p-3 text-right font-semibold text-gray-800 text-sm">R {lineTotal.toFixed(2)}</td>
                          <td className="border p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
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
                      <td colSpan="3" className="border p-3 text-right text-sm">TOTAL:</td>
                      <td className="border p-3 text-right text-red-800 text-base sm:text-lg">
                        R {po.items.reduce((sum, item) => sum + ((item.quantity_ordered || 0) * (parseFloat(item.unit_cost) || 0)), 0).toFixed(2)}
                      </td>
                      <td className="border p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {po.items.map((item, index) => {
                  const lineTotal = (item.quantity_ordered || 0) * (parseFloat(item.unit_cost) || 0);
                  return (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="font-semibold text-gray-800 text-sm mb-2">
                        {item.inventory_name || `Item #${item.inventory_id}`}
                      </div>
                      {item.sku && (
                        <div className="text-xs text-gray-500 mb-2">SKU: {item.sku}</div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Qty:</span>
                          <span className="font-medium ml-1">{item.quantity_ordered}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-600">Unit:</span>
                          <span className="font-medium ml-1">R {parseFloat(item.unit_cost || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="font-semibold text-gray-800 ml-1">R {lineTotal.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-600">Received:</span>
                          <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                            (item.received_quantity || 0) >= (item.quantity_ordered || 0) 
                              ? 'bg-green-100 text-green-800' 
                              : (item.received_quantity || 0) > 0 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.received_quantity || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">TOTAL:</span>
                    <span className="font-bold text-red-800 text-lg">
                      R {po.items.reduce((sum, item) => sum + ((item.quantity_ordered || 0) * (parseFloat(item.unit_cost) || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default POList;
