// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConsultationForm from './ConsultationForm';
import Dashboard from './pages/Dashboard';  // Matches file name
import './index.css';

function App() {
  return (
    <Router>
      <nav className="bg-red-800 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-red-800">T</span>
            </div>
            <h1 className="text-2xl font-bold">Thusanang Funeral Services</h1>
          </div>
          <div className="space-x-8 text-lg">
            <Link to="/" className="hover:text-yellow-500 transition">Intake</Link>
            <Link to="/dashboard" className="hover:text-yellow-500 transition">Dashboard</Link>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<ConsultationForm onSubmit={console.log} />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;