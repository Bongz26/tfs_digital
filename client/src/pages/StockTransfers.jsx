import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {

    fetchTransfers,
    createTransferRequest,
    dispatchTransferRequest,
    receiveTransferRequest,
    fetchInventory,
    fetchLocations,
    updateTransferRequest
} from '../api/inventory';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { fetchDrivers } from '../api/drivers';
import TransferGatePass from '../components/TransferGatePass';

const StockTransfers = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('pending'); // pending, dispatched, history
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drivers, setDrivers] = useState([]);
    const [inventory, setInventory] = useState([]); // For selection
    const [locations, setLocations] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({ inventory_id: '', quantity: 1 });
    const [formData, setFormData] = useState({
        from_location: 'Manekeng',
        to_location: 'Head Office',
        driver_id: '',
        items: [],
        notes: ''
    });



    // Print State
    const [printTransfer, setPrintTransfer] = useState(null);
    const [editingTransfer, setEditingTransfer] = useState(null); // { id, driver_id, driver_name }

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Transfers
            // We can filter by status in backend or here. 
            const data = await fetchTransfers();
            if (data.transfers) {
                setTransfers(data.transfers);
            }

            // Load Drivers & Inventory for forms
            const driversList = await fetchDrivers();
            setDrivers(driversList || []);

            const invList = await fetchInventory('coffin');
            setInventory(invList || []);

            const locList = await fetchLocations();
            setLocations(locList || []);

        } catch (error) {
            console.error('Error loading transfers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (formData.items.length === 0) return alert('Add at least one item');
        try {
            await createTransferRequest(formData);
            setShowCreateModal(false);
            setFormData({ from_location: 'Manekeng', to_location: 'Head Office', driver_id: '', items: [], notes: '' });
            loadData();
            alert('Transfer Request Created!');
        } catch (error) {
            alert('Failed to create transfer: ' + (error.response?.data?.error || error.message));
        }
    };

    const addItem = () => {
        if (!newItem.inventory_id) return;
        const inv = inventory.find(i => i.id === parseInt(newItem.inventory_id));
        if (!inv) return;

        const item = {
            inventory_id: inv.id,
            name: inv.name,
            quantity: parseInt(newItem.quantity),
            model: inv.model,
            color: inv.color
        };
        setFormData({ ...formData, items: [...formData.items, item] });
        setNewItem({ inventory_id: '', quantity: 1 });
    };

    const handleDispatch = async (id) => {
        if (!window.confirm('Confirm Dispatch? Stock will be deducted.')) return;
        try {
            await dispatchTransferRequest(id);
            loadData();
        } catch (e) { alert(e.message); }
    };

    const handleReceive = async (id) => {
        if (!window.confirm('Confirm Receipt? Stock will be added to location.')) return;
        try {
            await receiveTransferRequest(id);
            loadData();
        } catch (e) { alert(e.message); }
    };

    const handlePrintGatePass = (transfer) => {
        setPrintTransfer(transfer);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    const handleUpdateDriver = async () => {
        if (!editingTransfer || !editingTransfer.new_driver_id) return;
        try {
            await updateTransferRequest(editingTransfer.id, { driver_id: editingTransfer.new_driver_id });
            setEditingTransfer(null);
            loadData();
            alert('Driver updated successfully');
        } catch (e) {
            alert('Failed to update driver: ' + e.message);
        }
    };

    // Filter Logic
    const pending = transfers.filter(t => t.status === 'pending');
    const inTransit = transfers.filter(t => t.status === 'in_transit');
    const completed = transfers.filter(t => t.status === 'completed');

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Stock Transfers (Gate Pass)</h1>
                    <p className="text-gray-500 text-sm">Manage inter-branch stock movements and Gate Passes.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold"
                >
                    <span className="text-xl font-bold">+</span>
                    New Transfer Request
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button onClick={() => setActiveTab('pending')} className={`pb-2 px-4 ${activeTab === 'pending' ? 'border-b-2 border-red-600 font-semibold text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    Pending / Requests ({pending.length})
                </button>
                <button onClick={() => setActiveTab('in_transit')} className={`pb-2 px-4 ${activeTab === 'in_transit' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    Outgoing / Dispatch ({inTransit.length})
                </button>
                <button onClick={() => setActiveTab('completed')} className={`pb-2 px-4 ${activeTab === 'completed' ? 'border-b-2 border-green-600 font-semibold text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    Completed / History
                </button>
            </div>

            {/* Content */}
            {loading ? <p className="text-gray-500 text-center py-8">Loading transfers...</p> : (
                <div className="space-y-4">
                    {activeTab === 'pending' && <TransferList transfers={pending} onDispatch={handleDispatch} onPrint={handlePrintGatePass} isPending={true} onEditDriver={(t) => setEditingTransfer({ ...t, new_driver_id: t.driver_id })} />}
                    {activeTab === 'in_transit' && <TransferList transfers={inTransit} onReceive={handleReceive} onPrint={handlePrintGatePass} isTransit={true} onEditDriver={(t) => setEditingTransfer({ ...t, new_driver_id: t.driver_id })} />}
                    {activeTab === 'completed' && <TransferList transfers={completed} onPrint={handlePrintGatePass} isHistory={true} />}
                </div>
            )}

            {/* Edit Driver Modal */}
            {editingTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Edit Driver</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select New Driver</label>
                            <select
                                className="w-full border p-2 rounded"
                                value={editingTransfer.new_driver_id || ''}
                                onChange={e => setEditingTransfer({ ...editingTransfer, new_driver_id: e.target.value })}
                            >
                                <option value="">Select Driver</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingTransfer(null)} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleUpdateDriver} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4">New Transfer Request (Gate Pass)</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">From</label>
                                    <select
                                        value={formData.from_location}
                                        onChange={e => setFormData({ ...formData, from_location: e.target.value })}
                                        className="w-full border p-2 rounded focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="">Select Location</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.name}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">To</label>
                                    <select
                                        value={formData.to_location}
                                        onChange={e => setFormData({ ...formData, to_location: e.target.value })}
                                        className="w-full border p-2 rounded focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="">Select Location</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.name}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Driver</label>
                                <select
                                    value={formData.driver_id}
                                    onChange={e => setFormData({ ...formData, driver_id: e.target.value })}
                                    className="w-full border p-2 rounded focus:ring-red-500 focus:border-red-500"
                                >
                                    <option value="">Select Driver (Optional)</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Item Builder */}
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Add Items</label>
                                <div className="flex gap-2 mb-2">
                                    <select
                                        className="flex-1 border p-1 rounded text-sm"
                                        value={newItem.inventory_id}
                                        onChange={e => setNewItem({ ...newItem, inventory_id: e.target.value })}
                                    >
                                        <option value="">Select Item</option>
                                        {inventory.map(i => (
                                            <option key={i.id} value={i.id}>
                                                {i.name} {i.model && `(${i.model})`} - Stock: {i.stock_quantity}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        className="w-16 border p-1 rounded text-sm px-2"
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                                        min="1"
                                    />
                                    <button onClick={addItem} className="bg-blue-600 text-white px-3 rounded text-sm font-bold shadow-sm">+</button>
                                </div>
                                <div className="space-y-1">
                                    {formData.items.length === 0 && <p className="text-gray-400 text-xs italic">No items added yet.</p>}
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 border rounded shadow-sm">
                                            <span><span className="font-bold">{item.quantity}x</span> {item.name} <span className="text-gray-500 text-xs">({item.model})</span></span>
                                            <button
                                                onClick={() => {
                                                    const newItems = [...formData.items];
                                                    newItems.splice(idx, 1);
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                                className="text-red-500 hover:text-red-700 font-semibold text-xs uppercase"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                placeholder="Notes (e.g. For generic stock replenishment)"
                                className="w-full border p-2 rounded text-sm"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleCreate} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm font-medium">Create Request</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TransferList = ({ transfers, onDispatch, onReceive, onPrint, isPending, isTransit, isHistory, onEditDriver }) => {
    if (transfers.length === 0) return <div className="text-gray-500 text-center py-8 italic border-2 border-dashed border-gray-200 rounded-lg">No transfers found in this status.</div>;

    return (
        <div className="grid gap-4">
            {transfers.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-gray-800">{t.transfer_number}</span>
                            <StatusBadge status={t.status} />
                        </div>
                        <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                            <span className="font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-800 border">{t.from_location}</span>
                            <span className="text-gray-400">➔</span>
                            <span className="font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-800 border">{t.to_location}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                            <span>🚚 Driver:</span>
                            <span className="font-medium text-gray-800">{t.driver_name || 'Unassigned'}</span>
                            {(isPending || isTransit) && onEditDriver && (
                                <button onClick={() => onEditDriver(t)} className="ml-2 text-blue-600 hover:text-blue-800" title="Edit Driver">
                                    <PencilSquareIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="mt-3 text-sm text-gray-700">
                            {t.items.map((i, idx) => (
                                <span key={idx} className="inline-block bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-1 rounded mr-2 mb-1 text-xs">
                                    {i.quantity}x {i.name} {i.model} {i.color}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
                        {isPending && (
                            <>
                                <button
                                    onClick={() => onPrint(t)}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 border px-3 py-1.5 rounded text-sm bg-white hover:bg-gray-50 shadow-sm transition"
                                >
                                    🖨️ Print Gate Pass
                                </button>
                                <button
                                    onClick={() => onDispatch(t.id)}
                                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 shadow-sm transition"
                                >
                                    📦 Confirm Dispatch
                                </button>
                            </>
                        )}
                        {isTransit && (
                            <button
                                onClick={() => onReceive(t.id)}
                                className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 shadow-sm transition"
                            >
                                ✅ Confirm Receipt
                            </button>
                        )}
                        <div className="text-xs text-gray-400 mt-2">Created: {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const colors = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
        completed: 'bg-green-100 text-green-800 border-green-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded uppercase tracking-wide border font-bold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

export default StockTransfers;
