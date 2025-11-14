// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConsultationForm from './ConsultationForm';
import Dashboard from './pages/Dashboard';
import CaseDetails from './pages/CaseDetails';
import ActiveCases from './pages/ActiveCases'; 
import StockManagement from './pages/StockManagement';
import './index.css';

function App() {
  return (
    <Router>
      {/* 🔻 NAVBAR */}
      <nav className="bg-red-800 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-red-800">T</span>
            </div>
            <h1 className="text-2xl font-bold">Thusanang Funeral Services</h1>
          </div>

          {/* 🔻 NAV LINKS */}
          <div className="space-x-8 text-lg">
            <Link to="/" className="hover:text-yellow-500 transition">Intake</Link>
            <Link to="/dashboard" className="hover:text-yellow-500 transition">Dashboard</Link>
            <Link to="/active-cases" className="hover:text-yellow-500 transition">Active Cases</Link> {/* ✅ NEW */}
            <Link to="/stock" className="flex items-center px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-700"><span className="mr-3">📦</span>Stock Management</Link>
          
          </div>
        </div>
      </nav>

      {/* 🔻 ROUTES */}
      <Routes>
        <Route path="/" element={<ConsultationForm onSubmit={console.log} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cases/:id" element={<CaseDetails />} />
        <Route path="/active-cases" element={<ActiveCases />} /> {/* ✅ NEW */}
        <Route path="/stock" element={<StockManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
