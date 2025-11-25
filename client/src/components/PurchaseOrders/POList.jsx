import React, { useState } from "react";
import POItemRow from "./POItemRow";
import GRVReceiveForm from "./GRVReceiveForm";
import { processPurchaseOrder, deletePurchaseOrder, updatePurchaseOrder } from "../../api/purchaseOrders";

const POList = ({ purchaseOrders, onAddItem, onReload }) => {
  const [processing, setProcessing] = useState({});
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem('po_admin_email') || '');
  const [showGRVForm, setShowGRVForm] = useState({});
  const [deleting, setDeleting] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleDelete = async (poId, poNumber) => {
    if (!window.confirm(`Are you sure you want to cancel Purchase Order ${poNumber}?`)) return;

    setDeleting({ ...deleting, [poId]: true });
    try {
      await deletePurchaseOrder(poId);
      alert(`✅ Purchase Order ${poNumber} has been cancelled`);
      if (onReload) setTimeout(onReload, 300);
    } catch (err) {
      alert(`❌ Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setDeleting({ ...deleting, [poId]: false });
    }
  };

  const handleProcess = async (poId, poNumber) => {
    if (!adminEmail) {
      const email = prompt("Enter email address to receive a copy:");
      if (!email) return;
      setAdminEmail(email);
      localStorage.setItem('po_admin_email', email);
    }

    if (!window.confirm(`Send Purchase Order ${poNumber} to supplier?`)) return;

    setProcessing({ ...processing, [poId]: true });
    try {
      const result = await processPurchaseOrder(poId, adminEmail);
      alert(result.supplier_email_sent ? "✅ Sent successfully!" : "⚠️ Processed with warnings.");

      if (result.supplier_email_sent && window.confirm("Process GRV now?")) {
        setShowGRVForm(prev => ({ ...prev, [poId]: true }));
      }

      if (onReload) setTimeout(onReload, 500);
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing({ ...processing, [poId]: false });
    }
  };

  const startEdit = (po) => {
    setEditingId(po.id);
    setEditForm({
      po_number: po.po_number,
      order_date: po.order_date ? po.order_date.split('T')[0] : '',
      expected_delivery: po.expected_delivery ? po.expected_delivery.split('T')[0] : '',
      manual_supplier_email: po.manual_supplier_email || po.supplier?.email || ''
    });
  };

  const saveEdit = async (poId) => {
    try {
      await updatePurchaseOrder(poId, editForm);
      alert("✅ Purchase Order updated");
      setEditingId(null);
      if (onReload) onReload();
    } catch (err) {
      alert(`Error updating PO: ${err.message}`);
    }
  };

  if (!purchaseOrders.length) return <p className="p-4 text-gray-500 italic">No purchase orders found.</p>;

  return (
    <div className="space-y-6">
      {purchaseOrders.map(po => (
        <div key={po.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              {editingId === po.id ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editForm.po_number}
                    onChange={e => setEditForm({ ...editForm, po_number: e.target.value })}
                    className="border p-1 rounded"
                  />
                  <input
                    type="date"
                    value={editForm.order_date}
                    onChange={e => setEditForm({ ...editForm, order_date: e.target.value })}
                    className="border p-1 rounded"
                  />
                  <input
                    type="email"
                    value={editForm.manual_supplier_email}
                    onChange={e => setEditForm({ ...editForm, manual_supplier_email: e.target.value })}
                    className="border p-1 rounded sm:col-span-2"
                    placeholder="Supplier Email"
                  />
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg text-gray-800">
                    {po.po_number}
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${po.status === 'sent' ? 'bg-green-100 text-green-800' :
                      po.status === 'received' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {po.status || 'DRAFT'}
                    </span>
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">{po.supplier?.name}</span> • {new Date(po.order_date).toLocaleDateString()}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {editingId === po.id ? (
                <>
                  <button onClick={() => saveEdit(po.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded text-sm">Cancel</button>
                </>
              ) : (
                <>
                  {po.status === 'draft' && (
                    <>
                      <button onClick={() => startEdit(po)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                      <button onClick={() => handleDelete(po.id, po.po_number)} className="text-red-600 hover:text-red-800 text-sm font-medium">Cancel Order</button>
                      <button
                        onClick={() => handleProcess(po.id, po.po_number)}
                        disabled={processing[po.id]}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium transition-colors"
                      >
                        {processing[po.id] ? "Sending..." : "Send to Supplier"}
                      </button>
                    </>
                  )}
                  {(po.status === 'sent' || po.status === 'received' || po.status === 'partial') && (
                    <button
                      onClick={() => setShowGRVForm(prev => ({ ...prev, [po.id]: !prev[po.id] }))}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      {showGRVForm[po.id] ? "Close GRV" : "Receive Goods (GRV)"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* GRV Form */}
          {showGRVForm[po.id] && (
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <GRVReceiveForm
                poId={po.id}
                items={po.items}
                onSuccess={() => {
                  setShowGRVForm(prev => ({ ...prev, [po.id]: false }));
                  if (onReload) onReload();
                }}
                onCancel={() => setShowGRVForm(prev => ({ ...prev, [po.id]: false }))}
              />
            </div>
          )}

          {/* Items Table */}
          {po.items && po.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-center">Ordered</th>
                    <th className="px-4 py-3 text-center">Received</th>
                    <th className="px-4 py-3 text-right">Unit Cost</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {po.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.inventory_name || `Item #${item.inventory_id}`}
                        {item.sku && <span className="text-gray-500 text-xs ml-2">({item.sku})</span>}
                      </td>
                      <td className="px-4 py-3 text-center">{item.quantity_ordered}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${(item.received_quantity || 0) >= item.quantity_ordered ? 'bg-green-100 text-green-800' :
                          (item.received_quantity || 0) > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                          {item.received_quantity || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">R {parseFloat(item.unit_cost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        R {(item.quantity_ordered * item.unit_cost).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="4" className="px-4 py-3 text-right">Total Value:</td>
                    <td className="px-4 py-3 text-right text-red-800">
                      R {po.items.reduce((sum, i) => sum + (i.quantity_ordered * i.unit_cost), 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">No items in this order.</div>
          )}

          {/* Add Item (Only for Draft) */}
          {po.status === 'draft' && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <POItemRow poId={po.id} onAddItem={onAddItem} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default POList;
