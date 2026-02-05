// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { getAccessToken, clearAuthData } from './api/auth';
import ConsultationForm from './ConsultationForm';
import RepatriationTripSheet from './pages/RepatriationTripSheet';
import Dashboard from './pages/Dashboard';
import CaseDetails from './pages/CaseDetails';
import ActiveCases from './pages/ActiveCases';
import StockManagement from './pages/StockManagement';
import PurchaseOrdersPage from './pages/purchaseOrders';
import StockTransfers from './pages/StockTransfers';
import TestNavigation from './pages/TestNavigation';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserManagement from './pages/UserManagement';
import AirtimeRequests from './pages/AirtimeRequests';
import Roster from './pages/Roster';
import './index.css';

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Don't show navigation on login page
  if (location.pathname === '/login' || location.pathname === '/forgot-password' || location.pathname === '/reset-password') {
    return null;
  }

  return (
    <nav className="bg-red-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Mobile Header */}
        <div className="flex justify-between items-center py-3 sm:py-4 md:py-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <img src="/logo_final_transparent.png" alt="Thusanang Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" />
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate">
              Thusanang Funeral Services
            </h1>
          </div>

          {/* User Menu (Desktop) */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-red-700 transition"
                >
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-red-800">
                      {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium hidden lg:inline">
                    {user?.full_name || user?.email}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded capitalize">
                        {user?.role || 'staff'}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Login Button (if not authenticated) */}
          {!isAuthenticated && (
            <Link
              to="/login"
              className="hidden md:flex items-center px-4 py-2 bg-yellow-500 text-red-900 rounded-lg font-medium hover:bg-yellow-400 transition"
            >
              Sign In
            </Link>
          )}

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
            className={`px-3 py-2 rounded transition ${isActive('/') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            Intake
          </Link>
          <Link
            to="/dashboard"
            className={`px-3 py-2 rounded transition ${isActive('/dashboard') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            Dashboard
          </Link>
          <Link
            to="/active-cases"
            className={`px-3 py-2 rounded transition ${isActive('/active-cases') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            Active Cases
          </Link>
          <Link
            to="/stock"
            className={`px-3 py-2 rounded transition flex items-center ${isActive('/stock') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            <span className="mr-2">📦</span> Stock Management
          </Link>
          <Link
            to="/stock-transfers"
            className={`px-3 py-2 rounded transition flex items-center ${isActive('/stock-transfers') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            <span className="mr-2">🚚</span> Stock Transfers
          </Link>
          <Link
            to="/purchase"
            className={`px-3 py-2 rounded transition ${isActive('/purchase') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            Purchase Orders
          </Link>
          <Link
            to="/repatriation-trip"
            className={`px-3 py-2 rounded transition ${isActive('/repatriation-trip') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            Repatriation Trip
          </Link>
          <Link
            to="/airtime-requests"
            className={`px-3 py-2 rounded transition ${isActive('/airtime-requests') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
              }`}
          >
            Airtime Requests
          </Link>
          {/* Admin-only: Users link */}
          {isAuthenticated && user?.role === 'admin' && (
            <Link
              to="/users"
              className={`px-3 py-2 rounded transition flex items-center ${isActive('/users') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              <span className="mr-2">👥</span> Users
            </Link>
          )}
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {/* User info (mobile) */}
            {isAuthenticated && (
              <div className="px-4 py-3 border-b border-red-700 mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-red-800">
                      {user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{user?.full_name || 'User'}</p>
                    <p className="text-sm text-red-200">{user?.email}</p>
                  </div>
                </div>
              </div>
            )}

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${isActive('/') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              Intake
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${isActive('/dashboard') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              Dashboard
            </Link>
            <Link
              to="/active-cases"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${isActive('/active-cases') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              Active Cases
            </Link>
            <Link
              to="/stock"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition flex items-center ${isActive('/stock') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              <span className="mr-2">📦</span> Stock Management
            </Link>
            <Link
              to="/stock-transfers"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition flex items-center ${isActive('/stock-transfers') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              <span className="mr-2">🚚</span> Stock Transfers
            </Link>
            <Link
              to="/purchase"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${isActive('/purchase') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              Purchase Orders
            </Link>
            <Link
              to="/repatriation-trip"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${isActive('/repatriation-trip') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              Repatriation Trip
            </Link>
            <Link
              to="/airtime-requests"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded transition ${isActive('/airtime-requests') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                }`}
            >
              Airtime Requests
            </Link>
            {/* Admin-only: Users link (mobile) */}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded transition flex items-center ${isActive('/users') ? 'bg-red-700 text-yellow-400' : 'hover:text-yellow-500 hover:bg-red-700'
                  }`}
              >
                <span className="mr-2">👥</span> Users
              </Link>
            )}

            {/* Logout/Login button (mobile) */}
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left px-4 py-3 rounded text-yellow-400 hover:bg-red-700 transition"
              >
                🚪 Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 bg-yellow-500 text-red-900 rounded font-medium text-center"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </nav>
  );
}

function AppContent() {
  axios.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        clearAuthData();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
  return (
    <>
      <Navigation />

      {/* 🔻 ROUTES */}
      <Routes>
        {/* Public route - Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={
          <ProtectedRoute>
            <ConsultationForm onSubmit={console.log} />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/cases/:id" element={
          <ProtectedRoute>
            <CaseDetails />
          </ProtectedRoute>
        } />
        <Route path="/active-cases" element={
          <ProtectedRoute>
            <ActiveCases />
          </ProtectedRoute>
        } />
        <Route path="/stock" element={
          <ProtectedRoute>
            <StockManagement />
          </ProtectedRoute>
        } />
        <Route path="/stock-transfers" element={
          <ProtectedRoute>
            <StockTransfers />
          </ProtectedRoute>
        } />
        <Route path="/purchase" element={
          <ProtectedRoute>
            <PurchaseOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/test-navigation" element={
          <ProtectedRoute>
            <TestNavigation />
          </ProtectedRoute>
        } />
        <Route path="/repatriation-trip" element={
          <ProtectedRoute>
            <RepatriationTripSheet />
          </ProtectedRoute>
        } />
        <Route path="/airtime-requests" element={
          <ProtectedRoute>
            <AirtimeRequests />
          </ProtectedRoute>
        } />
        <Route path="/roster" element={
          <ProtectedRoute>
            <Roster />
          </ProtectedRoute>
        } />

        {/* Catch-all route for invalid URLs */}
        <Route path="*" element={
          <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-3xl font-bold text-red-800 mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
            <Link
              to="/dashboard"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              Go to Dashboard
            </Link>
          </div>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
