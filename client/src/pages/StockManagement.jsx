import React, { useState, useEffect } from 'react';
import { API_HOST } from '../api/config';
import StockTakeModal from '../components/StockTake/StockTakeModal';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // import the function

const generateStockReportPDF = (inventory) => {
  const doc = new jsPDF();

  // attach autoTable
  autoTable(doc, {
    startY: 45,
    head: [["Item", "Category", "Stock", "Reserved", "Available", "Unit Price (R)", "Status"]],
    body: inventory.map(item => [
      item.name,
      item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Other',
      item.stock_quantity || 0,
      item.reserved_quantity || 0,
      (item.stock_quantity || 0) - (item.reserved_quantity || 0),
      item.unit_price ? Number(item.unit_price).toFixed(2) : '0.00',
      item.is_low_stock ? "Low Stock" : "In Stock",
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable?.finalY || 45;
  doc.setFontSize(12);
  doc.text(`Total Items: ${inventory.length}`, 14, finalY + 10);
  const lowStockCount = inventory.filter(i => i.is_low_stock).length;
  doc.text(`Low Stock Items: ${lowStockCount}`, 14, finalY + 16);

  doc.save(`Stock_Report_${new Date().toISOString().slice(0,10)}.pdf`);
};



export default function StockManagement() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStockTake, setShowStockTake] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'coffin',
    sku: '',
    stock_quantity: 0,
    unit_price: 0,
    low_stock_threshold: 2,
    location: 'Manekeng Showroom'
  });

  const API_URL = API_HOST;

  // Fetch inventory data
  const fetchInventory = async (category = 'all') => {
    try {
      setLoading(true);
      console.log('Fetching inventory, category:', category);
      const url = category === 'all' 
        ? `${API_URL}/api/inventory`
        : `${API_URL}/api/inventory?category=${category}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('Inventory response: ', data);
  
      if (data.success) {
        const withLowStock = data.inventory.map(item => ({
          ...item,
          is_low_stock: (item.stock_quantity - (item.reserved_quantity || 0)) <= item.low_stock_threshold
        }));
        setInventory(withLowStock);
      } else setError(data.error);
    } catch (err) {
      console.error('Inventory error:', err);
      setError('Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };
  
  
  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/inventory/stats`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchStats();
  }, []);

  const updateStock = async (itemId, newQuantity, reason = 'Manual adjustment') => {
    try {
      const response = await fetch(`${API_URL}/api/inventory/${itemId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: newQuantity, reason })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        await fetchInventory(activeTab === 'low' ? 'all' : activeTab);
        await fetchStats();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const addNewItem = async () => {
    try {
      const response = await fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setShowAddForm(false);
        setNewItem({
          name: '',
          category: 'coffin',
          sku: '',
          stock_quantity: 0,
          unit_price: 0,
          low_stock_threshold: 2,
          location: 'Manekeng Showroom'
        });
        await fetchInventory(activeTab === 'low' ? 'all' : activeTab);
        await fetchStats();
        return { success: true };
      } else return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const lowStockItems = inventory.filter(item => item.is_low_stock);
  const filteredInventory = activeTab === 'low' 
    ? lowStockItems 
    : activeTab === 'all' 
      ? inventory 
      : inventory.filter(item => item.category === activeTab);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-red-800 mb-2">THUSANANG FUNERAL SERVICES</h1>
          <p className="text-yellow-600 text-base sm:text-lg md:text-xl font-semibold">Live from QwaQwa • Re tšotella sechaba sa rona</p>
        </div>
        <div className="p-4 sm:p-6 md:p-8 text-center text-red-600">Loading Professional Stock System...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="text-center mb-6 sm:mb-8 md:mb-10">
        
        <p className="text-yellow-600 text-base sm:text-lg md:text-xl font-semibold">Live from QwaQwa • Re tšotella sechaba sa rona</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-red-700 mt-4 sm:mt-6">Professional Stock Management</h2>
        <p className="text-gray-600 mt-2">Real-time inventory tracking and reporting</p>
      </div>

      {/* ALERTS */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-600 p-6 mb-8 rounded-r-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-red-800 text-xl">🚨 LOW STOCK ALERT</p>
              <p className="text-red-700">{lowStockItems.length} item(s) need immediate attention</p>
            </div>
            <button 
              onClick={() => setActiveTab('low')}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              View All
            </button>
          </div>
        </div>
      )}

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
            <h3 className="text-lg font-semibold text-gray-700">Total Items</h3>
            <p className="text-5xl font-bold text-red-600 mt-2">{stats.total_items || 0}</p>
            <p className="text-sm text-gray-600 mt-2">{stats.categories || 0} categories</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
            <h3 className="text-lg font-semibold text-gray-700">Total Stock</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">{(stats.total_stock || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-2">Total units in stock</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-gray-700">Low Stock</h3>
            <p className="text-5xl font-bold text-yellow-600 mt-2">{stats.low_stock_count || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Need reordering</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-600">
            <h3 className="text-lg font-semibold text-gray-700">Categories</h3>
            <p className="text-5xl font-bold text-green-600 mt-2">{stats.categories || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Active categories</p>
          </div>
        </div>
      )}

      {/* CONTROL PANEL */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* TABS */}
          <div className="flex space-x-2 flex-wrap">
            {['all', 'coffin', 'tent', 'chair', 'grocery', 'low'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  // ALWAYS fetch all for low stock tab
                  fetchInventory(tab === 'low' ? 'all' : tab);
                }}
                className={`px-4 py-2 rounded-lg font-semibold capitalize ${
                  activeTab === tab
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tab === 'all' ? 'All Items' : tab === 'low' ? 'Low Stock' : tab}
              </button>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="flex space-x-3 flex-wrap">
            <button
              onClick={() => setShowStockTake(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-semibold flex items-center shadow-lg"
            >
              <span className="mr-2">📋</span> Stock Take
            </button>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold flex items-center"
            >
              <span className="mr-2">+</span> Add New Item
            </button>

            <button
            onClick={() => generateStockReportPDF(filteredInventory)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold"
              >
            📥 Download Stock Report
            </button>

            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
            >
              📄 Print Report
            </button>
          </div>
        </div>
      </div>

      {/* ADD ITEM MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-red-800 mb-4">Add New Inventory Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Premium Oak Casket"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="coffin">Casket/Coffin</option>
                  <option value="tent">Tent</option>
                  <option value="chair">Chair</option>
                  <option value="grocery">Grocery</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., CSK-OAK-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newItem.stock_quantity}
                    onChange={(e) => setNewItem({...newItem, stock_quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={newItem.low_stock_threshold}
                    onChange={(e) => setNewItem({...newItem, low_stock_threshold: parseInt(e.target.value) || 2})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={addNewItem}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TABLE */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-red-800">
            {activeTab === 'all' ? 'All Inventory' : 
             activeTab === 'low' ? 'Low Stock Items' : 
             `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Items`}
          </h2>
          <p className="text-gray-600">
            {filteredInventory.length} items • {
              activeTab === 'low' ? `${lowStockItems.length} need attention` : 
              `${inventory.filter(item => item.is_low_stock).length} low stock`
            }
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-left font-semibold text-gray-700">Item Details</th>
                <th className="p-3 text-left font-semibold text-gray-700">Stock Levels</th>
                <th className="p-3 text-left font-semibold text-gray-700">Pricing</th>
                <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">
                    {activeTab === 'low' 
                      ? '🎉 No low stock items! Everything is well stocked.' 
                      : 'No inventory items found'}
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => (
                  <tr key={item.id} className={`border-b hover:bg-gray-50 ${item.is_low_stock ? 'bg-red-50' : ''}`}>
                    <td className="p-3">
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      <div className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs capitalize">{item.category}</span>
                        <span>{item.sku && `SKU: ${item.sku}`}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{item.location}</div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>In Stock:</span>
                          <span className="font-semibold">{item.stock_quantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Reserved:</span>
                          <span className="text-orange-600">{item.reserved_quantity || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Available:</span>
                          <span className={`font-semibold ${item.available_quantity <= item.low_stock_threshold ? 'text-red-600' : 'text-green-600'}`}>
                            {item.available_quantity}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-gray-800">
                        R{parseFloat(item.unit_price || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Low stock: {item.low_stock_threshold}
                        </div>
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.available_quantity <= 0
                          ? 'bg-gray-200 text-gray-600'
                          : item.available_quantity <= item.low_stock_threshold
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {item.available_quantity <= 0
                          ? 'Out of Stock'
                          : item.available_quantity <= item.low_stock_threshold
                          ? 'Low Stock'
                          : 'In Stock'}
                      </span>
                    </td>

                    <td className="p-3 space-x-2">
                      <button
                        onClick={async () => {
                          const newQty = prompt(`Update stock for "${item.name}" (current: ${item.stock_quantity})`);
                          if (newQty !== null) {
                            const parsedQty = parseInt(newQty);
                            if (!isNaN(parsedQty)) {
                              const result = await updateStock(item.id, parsedQty);
                              if (!result.success) alert(`Error: ${result.error}`);
                            }
                          }
                        }}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                      >
                        Update Stock
                      </button>

                      <button
                        onClick={async () => {
                          const addQty = prompt(`Add quantity for "${item.name}" (current: ${item.stock_quantity})`);
                          if (addQty !== null) {
                            const parsedAdd = parseInt(addQty);
                            if (!isNaN(parsedAdd)) {
                              const result = await updateStock(item.id, item.stock_quantity + parsedAdd, 'Added manually');
                              if (!result.success) alert(`Error: ${result.error}`);
                            }
                          }
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                      >
                        Add Quantity
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Take Modal */}
      <StockTakeModal
        isOpen={showStockTake}
        onClose={() => setShowStockTake(false)}
        onComplete={() => {
          // Refresh inventory after stock take completion
          fetchInventory(activeTab === 'low' ? 'all' : activeTab);
          fetchStats();
        }}
      />
    </div>
  );
}
