import React, { useState, useEffect } from 'react';

export default function StockManagement() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/inventory`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setInventory(data.inventory);
        } else {
          setError(data.error);
        }
      } catch (err) {
        console.error('Inventory error:', err);
        setError('Failed to load inventory data.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const updateStock = async (itemId, newQuantity) => {
    try {
      const response = await fetch(`${API_URL}/api/inventory/${itemId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: newQuantity })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh the inventory
        const refreshResponse = await fetch(`${API_URL}/api/inventory`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setInventory(refreshData.inventory);
        }
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-red-800 mb-2">
            THUSANANG FUNERAL SERVICES
          </h1>
          <p className="text-yellow-600 text-xl font-semibold">
            Live from QwaQwa • Re tšotella sechaba sa rona
          </p>
        </div>
        <div className="p-8 text-center text-red-600">
          Loading Stock Data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-red-800 mb-2">
            THUSANANG FUNERAL SERVICES
          </h1>
          <p className="text-yellow-600 text-xl font-semibold">
            Live from QwaQwa • Re tšotella sechaba sa rona
          </p>
        </div>
        <div className="p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const lowStockItems = inventory.filter(item => 
    item.available_quantity <= item.low_stock_threshold
  );

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-red-800 mb-2">
          THUSANANG FUNERAL SERVICES
        </h1>
        <p className="text-yellow-600 text-xl font-semibold">
          Live from QwaQwa • Re tšotella sechaba sa rona
        </p>
        <h2 className="text-3xl font-bold text-red-700 mt-6">
          Stock Management
        </h2>
        <p className="text-gray-600 mt-2">Manage caskets, equipment, and supplies</p>
      </div>

      {/* LOW STOCK ALERTS */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-600 p-6 mb-8 rounded-r-lg shadow">
          <p className="font-bold text-red-800 text-xl">LOW STOCK ALERT</p>
          <p className="text-red-700">
            {lowStockItems.length} item(s) need attention
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            {lowStockItems.map(item => (
              <span key={item.id} className="inline-flex items-center bg-red-200 px-3 py-1 rounded-full">
                <span className="font-semibold">{item.name}:</span>
                <span className="ml-1 bg-red-600 text-white px-2 py-1 rounded text-xs">
                  {item.available_quantity} left (min: {item.low_stock_threshold})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
          <h3 className="text-lg font-semibold text-gray-700">Total Items</h3>
          <p className="text-5xl font-bold text-red-600 mt-2">{inventory.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          <p className="text-5xl font-bold text-orange-600 mt-2">{lowStockItems.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-700">Caskets</h3>
          <p className="text-5xl font-bold text-blue-600 mt-2">
            {inventory.filter(item => item.category === 'coffin').length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-600">
          <h3 className="text-lg font-semibold text-gray-700">Equipment</h3>
          <p className="text-5xl font-bold text-green-600 mt-2">
            {inventory.filter(item => ['tent', 'chair'].includes(item.category)).length}
          </p>
        </div>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600 mb-6">
        <h2 className="text-2xl font-bold text-red-800 mb-6 text-center">
          Inventory Items
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-left font-semibold text-gray-700">Item</th>
                <th className="p-3 text-left font-semibold text-gray-700">Category</th>
                <th className="p-3 text-left font-semibold text-gray-700">In Stock</th>
                <th className="p-3 text-left font-semibold text-gray-700">Reserved</th>
                <th className="p-3 text-left font-semibold text-gray-700">Available</th>
                <th className="p-3 text-left font-semibold text-gray-700">Low Stock Alert</th>
                <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className={`border-b hover:bg-gray-50 ${
                    item.available_quantity <= item.low_stock_threshold ? 'bg-red-50' : ''
                  }`}>
                    <td className="p-3">
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.location}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.category === 'coffin' ? 'bg-red-100 text-red-800' :
                        item.category === 'tent' ? 'bg-blue-100 text-blue-800' :
                        item.category === 'chair' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-800 font-semibold">{item.stock_quantity}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-600">{item.reserved_quantity || 0}</div>
                    </td>
                    <td className="p-3">
                      <div className={`font-semibold ${
                        item.available_quantity <= item.low_stock_threshold ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.available_quantity}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-600">{item.low_stock_threshold}</div>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          const newQty = prompt(`Update stock quantity for ${item.name}:`, item.stock_quantity);
                          if (newQty !== null && !isNaN(newQty)) {
                            updateStock(item.id, parseInt(newQty));
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        Update Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>
          Toll Free: <span className="font-bold text-red-600">0800 01 4574</span> | Serving with Dignity
        </p>
      </div>
    </div>
  );
}