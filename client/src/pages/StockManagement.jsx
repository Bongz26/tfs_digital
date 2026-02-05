import React, { useState, useEffect, useCallback } from 'react';
import { API_HOST } from '../api/config';
import { getAccessToken, clearAuthData } from '../api/auth';
import StockTakeModal from '../components/StockTake/StockTakeModal';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // import the function

const generateStockReportPDF = (inventory) => {
  const doc = new jsPDF();

  // attach autoTable
  autoTable(doc, {
    startY: 45,
    head: [["Model", "Item Name", "Color", "Location", "Stock Qty", "Status"]],
    body: inventory.map(item => [
      item.model || '-',
      item.name,
      item.color || '-',
      item.location || 'Showroom',
      item.stock_quantity || 0,
      item.is_low_stock ? "LOW STOCK" : "IN STOCK",
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    // Matched to brand: #b71c1c (Dark Red)
    headStyles: { fillColor: [183, 28, 28], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 245, 245] }, // Very light red tint
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable?.finalY || 45;
  doc.setFontSize(12);
  doc.text(`Total Items: ${inventory.length}`, 14, finalY + 10);
  const lowStockCount = inventory.filter(i => i.is_low_stock).length;
  doc.text(`Low Stock Items: ${lowStockCount}`, 14, finalY + 16);

  doc.save(`Stock_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
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
    low_stock_threshold: 1,
    location: 'Manekeng Showroom',
    notes: '',
    model: '',
    color: ''
  });
  const [editItem, setEditItem] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [groupByCase, setGroupByCase] = useState(false);
  const [usageByCase, setUsageByCase] = useState([]);
  const [loadingUsageByCase, setLoadingUsageByCase] = useState(false);
  const [usageFrom, setUsageFrom] = useState('');
  const [usageTo, setUsageTo] = useState('');
  const [usageTotals, setUsageTotals] = useState({ grand_total: 0, case_count: 0 });
  const [includeArchived, setIncludeArchived] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const API_URL = API_HOST;

  // Fetch inventory data
  const fetchInventory = useCallback(async (category = 'all') => {
    try {
      setLoading(true);
      console.log('Fetching inventory, category:', category);
      const url = category === 'all'
        ? `${API_URL}/api/inventory`
        : `${API_URL}/api/inventory?category=${category}`;
      const token = getAccessToken();
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.status === 401) {
        // Session expired
        clearAuthData();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('Inventory response: ', data);

      if (data.success) {
        const withLowStock = data.inventory.map(item => ({
          ...item,
          available_quantity: (item.stock_quantity || 0) - (item.reserved_quantity || 0),
          is_low_stock: ((item.stock_quantity || 0) - (item.reserved_quantity || 0)) <= (item.low_stock_threshold || 0)
        }));
        setInventory(withLowStock);
      } else setError(data.error);
    } catch (err) {
      console.error('Inventory error:', err);
      setError('Failed to load inventory data. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const token = getAccessToken();
      const params = new URLSearchParams();
      params.append('category', 'all');
      if (usageFrom) params.append('from', usageFrom);
      if (usageTo) params.append('to', usageTo);
      const response = await fetch(`${API_URL}/api/inventory/movements?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const rows = (data.movements || []).filter(m => String(m.category).toLowerCase() === 'coffin');
      setMovements(rows);
    } catch (err) {
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [API_URL, usageFrom, usageTo]);

  const fetchUsageByCase = useCallback(async () => {
    try {
      setLoadingUsageByCase(true);
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (usageFrom) params.append('from', usageFrom);
      if (usageTo) params.append('to', usageTo);
      if (includeArchived) params.append('includeArchived', 'true');
      const url = params.toString() ? `${API_URL}/api/inventory/coffin-usage-by-case?${params.toString()}` : `${API_URL}/api/inventory/coffin-usage-by-case`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setUsageByCase(data.cases || []);
      setUsageTotals(data.totals || { grand_total: (data.cases || []).reduce((a, r) => a + (parseInt(r.total_coffins, 10) || 0), 0), case_count: (data.cases || []).length });
    } catch (err) {
      setUsageByCase([]);
      setUsageTotals({ grand_total: 0, case_count: 0 });
    } finally {
      setLoadingUsageByCase(false);
    }
  }, [API_URL, usageFrom, usageTo]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/inventory/stock-take/completed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error('History fetch error:', err);
      // setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [API_URL]);

  const [usageModal, setUsageModal] = useState({ open: false, item: null, caseNumber: '', date: '', quantity: 1 });

  const openUsageLogModal = (item) => {
    // Default to today
    const today = new Date().toISOString().slice(0, 10);
    setUsageModal({ open: true, item: item, caseNumber: '', date: today, quantity: 1 });
  };

  const submitUsageLog = async () => {
    const { item, caseNumber, date, quantity } = usageModal;
    if (!item) return;

    try {
      const token = getAccessToken();
      let caseId = null;

      if (caseNumber && caseNumber.trim()) {
        try {
          const resp = await fetch(`${API_URL}/api/cases/lookup?case_number=${encodeURIComponent(caseNumber.trim())}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const d = await resp.json();
            if (d.success && d.case?.id) caseId = d.case.id;
            else {
              if (!window.confirm(`Case "${caseNumber}" not found. Log as unallocated?`)) return;
            }
          }
        } catch (_) { }
      }

      const body = {
        quantity_change: -1 * (parseInt(quantity) || 1),
        reason: caseId ? 'Case consumption' : 'Manual usage',
        case_id: caseId,
        movement_type: 'sale',
        created_at: date ? new Date(date).toISOString() : new Date().toISOString()
      };

      const response = await fetch(`${API_URL}/api/inventory/${item.id}/adjust`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setUsageModal({ ...usageModal, open: false });
        await fetchInventory(activeTab === 'low' ? 'all' : activeTab);
        await fetchStats();
        await fetchMovements();
        alert('Usage logged successfully');
      } else {
        alert(data.error || 'Failed to log usage');
      }
    } catch (err) {
      alert(err.message || 'Failed to log usage');
    }
  };


  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/inventory/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.status === 401) {
        clearAuthData();
        return; // Navigation handled by fetchInventory usually, but safe to ignore here
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchInventory();
    fetchStats();
  }, [fetchInventory, fetchStats]);

  const updateStock = async (itemId, newQuantity, reason = 'Manual adjustment') => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/inventory/${itemId}/stock`, {
        method: 'PATCH',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
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

  const emailReport = async () => {
    // Default start date as requested
    const defaultStart = '2025-12-08';
    const today = new Date().toISOString().slice(0, 10);

    // Prompt for dates
    const startDate = prompt("Enter Start Date (YYYY-MM-DD):", defaultStart);
    if (!startDate) return; // User cancelled

    const endDate = prompt("Enter End Date (YYYY-MM-DD):", today);
    if (!endDate) return; // User cancelled

    if (!window.confirm(`Send Usage Report from ${startDate} to ${endDate} to Management Email?`)) return;

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/inventory/reports/email`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate })
      });

      if (response.status === 401) {
        clearAuthData();
        window.location.href = '/login';
        return;
      }

      const data = await response.json();
      if (data.success) {
        alert('Report sent successfully!');
      } else {
        alert('Failed to send report: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Email report error:', err);
      alert('Error sending report: ' + err.message);
    }
  };

  const addNewItem = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
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
          low_stock_threshold: 1,
          location: 'Manekeng Showroom',
          notes: '',
          model: '',
          color: ''
        });
        await fetchInventory(activeTab === 'low' ? 'all' : activeTab);
        await fetchStats();
        return { success: true };
      } else return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update inventory item (for editing)
  const updateInventoryItem = async (itemData) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/inventory/${itemData.id}`, {
        method: 'PUT',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setShowEditForm(false);
        setEditItem(null);
        await fetchInventory(activeTab === 'low' ? 'all' : activeTab);
        await fetchStats();
        return { success: true };
      } else return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete inventory item
  const deleteInventoryItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item? This cannot be undone.')) return;
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/inventory/${itemId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Success
      setShowEditForm(false);
      setEditItem(null);
      await fetchInventory(activeTab === 'low' ? 'all' : activeTab);
      await fetchStats();
      return { success: true };
    } catch (err) {
      alert(`Failed to delete item: ${err.message}`);
      return { success: false, error: err.message };
    }
  };

  // Open edit modal
  const handleEditItem = (item) => {
    setEditItem({
      id: item.id,
      name: item.name || '',
      category: item.category || 'other',
      sku: item.sku || '',
      stock_quantity: item.stock_quantity || 0,
      unit_price: item.unit_price || 0,
      low_stock_threshold: item.low_stock_threshold ?? 1,
      location: item.location || 'Manekeng',
      notes: item.notes || '',
      model: item.model || '',
      color: item.color || ''
    });
    setShowEditForm(true);
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
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
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

      {lowStockItems.filter(i => i.category === 'coffin').length > 0 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-600 p-4 mb-6 rounded-r-lg shadow">
          <p className="font-semibold text-yellow-800">Casket/Coffin items are low in stock</p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {lowStockItems.filter(i => i.category === 'coffin').slice(0, 5).map(i => (
              <div key={`low-${i.id}`} className="text-sm text-yellow-800 flex justify-between">
                <span>{i.name}{i.color ? ` • ${i.color}` : ''}</span>
                <span>Qty {i.stock_quantity} • Threshold {i.low_stock_threshold}</span>
              </div>
            ))}
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
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          {/* TABS */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {['all', 'coffin', 'usage', 'history', 'tent', 'chair', 'grocery', 'low'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  // ALWAYS fetch all for low stock tab
                  if (tab === 'usage') {
                    if (groupByCase) fetchUsageByCase(); else fetchMovements();
                  } else if (tab === 'history') {
                    fetchHistory();
                  } else {
                    fetchInventory(tab === 'low' ? 'all' : tab);
                  }
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg font-semibold capitalize text-sm sm:text-base transition-all ${activeTab === tab
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
                  }`}
              >
                {tab === 'all' ? 'All Items' : tab === 'low' ? 'Low Stock' : tab === 'usage' ? 'Coffin Usage' : tab === 'history' ? 'Stock Take History' : tab}
              </button>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowStockTake(true)}
              className="bg-orange-600 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-orange-700 font-semibold flex items-center justify-center transition-all shadow-md hover:shadow-lg text-sm sm:text-base min-w-[140px]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Stock Take
            </button>

            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center transition-all shadow-md hover:shadow-lg text-sm sm:text-base min-w-[140px]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Item
            </button>

            <button
              onClick={() => generateStockReportPDF(filteredInventory)}
              className="bg-red-600 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center transition-all shadow-md hover:shadow-lg text-sm sm:text-base min-w-[140px]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </button>

            <button
              onClick={emailReport}
              className="bg-purple-600 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center transition-all shadow-md hover:shadow-lg text-sm sm:text-base min-w-[140px]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Daily Report
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
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Premium Oak Casket"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Model (Optional)</label>
                  <input
                    type="text"
                    value={newItem.model}
                    onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="e.g 5 Feet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Color (Optional)</label>
                  <input
                    type="text"
                    value={newItem.color}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="e.g Kiaat"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., CSK-OAK-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newItem.stock_quantity}
                    onChange={(e) => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={newItem.low_stock_threshold}
                    onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Additional notes about this item (optional)"
                  rows={2}
                />
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
                onClick={async () => {
                  const res = await addNewItem();
                  if (!res.success) alert(res.error || 'Failed to add item');
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {showEditForm && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-red-800 mb-4">Edit Inventory Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={editItem.category}
                  onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="coffin">Casket/Coffin</option>
                  <option value="tent">Tent</option>
                  <option value="chair">Chair</option>
                  <option value="grocery">Grocery</option>
                  <option value="catering">Catering</option>
                  <option value="tombstone">Tombstone</option>
                  <option value="livestock">Livestock</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={editItem.model}
                    onChange={(e) => setEditItem({ ...editItem, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={editItem.color}
                    onChange={(e) => setEditItem({ ...editItem, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={editItem.sku}
                    onChange={(e) => setEditItem({ ...editItem, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editItem.location}
                    onChange={(e) => setEditItem({ ...editItem, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={editItem.low_stock_threshold}
                    onChange={(e) => setEditItem({ ...editItem, low_stock_threshold: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editItem.notes}
                  onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Additional notes about this item"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => deleteInventoryItem(editItem.id)}
                className="px-4 py-2 text-red-600 hover:text-red-800 font-semibold border border-red-200 rounded-lg hover:bg-red-50"
              >
                Delete Item
              </button>
              <div className="space-x-3">
                <button
                  onClick={() => { setShowEditForm(false); setEditItem(null); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateInventoryItem(editItem)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' ? (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Stock Take History</h2>
            <button
              onClick={fetchHistory}
              className="px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Refresh
            </button>
          </div>
          {loadingHistory ? (
            <div className="p-4 text-center text-gray-600">Loading history...</div>
          ) : historyList.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No completed stock takes found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Taken By</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Total Items</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-700">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm text-gray-700">{item.created_by || 'Unknown'}</td>
                      <td className="p-3 text-sm text-gray-700">{item.total_items}</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs uppercase font-bold">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => alert(`View details for ${item.id} feature coming soon`)}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'usage' ? (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-red-800">Coffin Usage History</h2>
              {groupByCase && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Total Coffins: {usageTotals.grand_total || 0}</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Cases: {usageTotals.case_count || 0}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={usageFrom}
                onChange={(e) => setUsageFrom(e.target.value)}
                className="px-2 py-1 border rounded"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={usageTo}
                onChange={(e) => setUsageTo(e.target.value)}
                className="px-2 py-1 border rounded"
              />
              <button
                onClick={() => { if (groupByCase) fetchUsageByCase(); else fetchMovements(); }}
                className="px-3 py-1 rounded bg-gray-200 text-gray-800"
              >
                Apply
              </button>
              <label className="flex items-center gap-1 text-sm ml-2">
                <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
                Include archived
              </label>
              <button
                onClick={() => { const next = !groupByCase; setGroupByCase(next); next ? fetchUsageByCase() : fetchMovements(); }}
                className={`px-3 py-1 rounded ${groupByCase ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                {groupByCase ? 'Grouped by Case' : 'List Movements'}
              </button>
            </div>
          </div>
          {!groupByCase && (loadingMovements ? (
            <div className="p-4 text-center text-gray-600">Loading usage...</div>
          ) : movements.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No movements found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Item</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Movement</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Change</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Prev → New</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Case</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-700">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="p-3 text-sm text-gray-800">{m.name}{m.color ? ` • ${m.color}` : ''}</td>
                      <td className="p-3 text-sm">{m.movement_type}</td>
                      <td className="p-3 text-sm">{m.quantity_change}</td>
                      <td className="p-3 text-sm">{m.previous_quantity} → {m.new_quantity}</td>
                      <td className="p-3 text-sm">{m.case_number ? `${m.case_number} • ${m.deceased_name || ''}` : '—'}</td>
                      <td className="p-3 text-sm">{m.recorded_by || 'system'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {groupByCase && (loadingUsageByCase ? (
            <div className="p-4 text-center text-gray-600">Loading summary...</div>
          ) : usageByCase.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No coffin usage found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 text-left font-semibold text-gray-700">Case</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Deceased</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Items</th>
                    <th className="p-3 text-left font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {usageByCase.map(row => (
                    <tr key={row.case_id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-800">{row.case_number}</td>
                      <td className="p-3 text-sm text-gray-700">{row.deceased_name}</td>
                      <td className="p-3 text-sm text-gray-700">
                        {(Array.isArray(row.items) ? row.items : []).map((it, idx) => (
                          <span key={idx} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded">
                            {it.name}{it.color ? ` • ${it.color}` : ''} × {it.quantity}
                          </span>
                        ))}
                      </td>
                      <td className="p-3 text-sm text-gray-800 font-semibold">{row.total_coffins || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
          {/* INVENTORY TABLE */}
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

                  <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-gray-500">
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
                          <span>{item.sku && `SKU: ${item.sku}`}</span>
                          {item.model && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Model: {item.model}</span>
                          )}
                          {item.color && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Color: {item.color}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{item.location}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-600 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded" title={item.notes}>
                            <span className="font-medium text-yellow-700">📝 Note:</span>{' '}
                            {item.notes.length > 60 ? `${item.notes.substring(0, 60)}...` : item.notes}
                          </div>
                        )}
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
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.available_quantity <= 0
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

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                            title="Edit item details and notes"
                          >
                            Edit
                          </button>
                          {item.category === 'coffin' && (
                            <button
                              onClick={() => openUsageLogModal(item)}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                            >
                              Log Usage
                            </button>
                          )}
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
                            Stock
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
                            +Qty
                          </button>
                          <button
                            onClick={async () => {
                              const val = prompt(`Set low stock alert for "${item.name}" (current: ${item.low_stock_threshold})`);
                              if (val !== null) {
                                const parsed = parseInt(val);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  const result = await updateInventoryItem({ id: item.id, low_stock_threshold: parsed });
                                  if (!result.success) alert(`Error: ${result.error}`);
                                }
                              }
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                          >
                            Threshold
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Usage Log Modal */}
      {usageModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-red-800 mb-4">Log Usage: {usageModal.item?.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date Used (For History)</label>
                <input
                  type="date"
                  value={usageModal.date}
                  onChange={(e) => setUsageModal({ ...usageModal, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity Used</label>
                <input
                  type="number"
                  min="1"
                  value={usageModal.quantity}
                  onChange={(e) => setUsageModal({ ...usageModal, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Case Number (Optional)</label>
                <input
                  type="text"
                  value={usageModal.caseNumber}
                  onChange={(e) => setUsageModal({ ...usageModal, caseNumber: e.target.value })}
                  placeholder="e.g. EC2025/001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-500 mt-1">Links usage to a specific funeral case.</p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setUsageModal({ ...usageModal, open: false })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={submitUsageLog}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                >
                  Confirm Usage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
