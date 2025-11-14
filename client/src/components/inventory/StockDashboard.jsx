import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import StockAlerts from './StockAlerts';
import StockTable from './StockTable';
import StatsCards from './StatsCards';

export default function StockDashboard() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      if (response.success) {
        setInventory(response.inventory);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to fetch inventory');
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (itemId, newQuantity) => {
    try {
      const response = await inventoryAPI.updateStock(itemId, newQuantity);
      if (response.success) {
        await fetchInventory(); // Refresh data
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stock data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl">❌</div>
          <p className="mt-4 text-gray-600">Error: {error}</p>
          <button 
            onClick={fetchInventory}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const lowStockItems = inventory.filter(item => 
    item.available_quantity <= item.low_stock_threshold
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-800 mb-2">Stock Management</h1>
          <p className="text-gray-600">Manage caskets, equipment, and supplies</p>
        </div>

        <StockAlerts lowStockItems={lowStockItems} />
        <StatsCards inventory={inventory} lowStockItems={lowStockItems} />
        <StockTable inventory={inventory} onUpdateStock={updateStock} />
      </div>
    </div>
  );
}