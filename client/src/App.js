// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ConsultationForm from './ConsultationForm';
import Dashboard from './pages/Dashboard';
import CaseDetails from './pages/CaseDetails';
import ActiveCases from './pages/ActiveCases'; 
import StockManagement from './pages/StockManagement';
import PurchaseOrdersPage from './pages/purchaseOrders';
import './index.css';

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-red-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Mobile Header */}
        <div className="flex justify-between items-center py-3 sm:py-4 md:py-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-red-800">T</span>
            </div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate">
              Thusanang Funeral Services
            </h1>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded hover:bg-red-700 transition"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-4 lg:space-x-8 pb-4 md:pb-6">
          <Link 
            to="/" 
            className={`px-3 py-2 rounded transition ${
              isActive('/') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
            }`}
          >
            Intake
          </Link>
          <Link 
            to="/dashboard" 
            className={`px-3 py-2 rounded transition ${
              isActive('/dashboard') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            to="/active-cases" 
            className={`px-3 py-2 rounded transition ${
              isActive('/active-cases') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
            }`}
          >
            Active Cases
          </Link>
          <Link 
            to="/stock" 
            className={`px-3 py-2 rounded transition flex items-center ${
              isActive('/stock') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
            }`}
          >
            <span className="mr-2">📦</span> Stock Management
          </Link>
          <Link 
            to="/purchase" 
            className={`px-3 py-2 rounded transition ${
              isActive('/purchase') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
            }`}
          >
            Purchase Orders
          </Link>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${
                isActive('/') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
            >
              Intake
            </Link>
            <Link 
              to="/dashboard" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${
                isActive('/dashboard') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to="/active-cases" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${
                isActive('/active-cases') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
            >
              Active Cases
            </Link>
            <Link 
              to="/stock" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition flex items-center ${
                isActive('/stock') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
            >
              <span className="mr-2">📦</span> Stock Management
            </Link>
            <Link 
              to="/purchase" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${
                isActive('/purchase') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
            >
              Purchase Orders
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <Navigation />

      {/* 🔻 ROUTES */}
      <Routes>
        <Route path="/" element={<ConsultationForm onSubmit={console.log} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cases/:id" element={<CaseDetails />} />
        <Route path="/active-cases" element={<ActiveCases />} /> {/* ✅ NEW */}
        <Route path="/stock" element={<StockManagement />} />
        <Route path="/purchase" element={<PurchaseOrdersPage/>}/>
      </Routes>
    </Router>
  );
}

export default App;
