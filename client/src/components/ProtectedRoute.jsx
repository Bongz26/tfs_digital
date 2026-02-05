/**
 * Protected Route Component
 * Wraps routes that require authentication
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';

/**
 * ProtectedRoute - Requires user to be authenticated
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {string} props.requiredRole - Minimum required role (optional)
 * @param {string[]} props.allowedRoles - Specific allowed roles (optional)
 */
export default function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const { isAuthenticated, loading, user, hasMinRole, hasRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && !hasMinRole(requiredRole)) {
    return <AccessDenied requiredRole={requiredRole} userRole={user?.role} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    if (!hasAllowedRole) {
      return <AccessDenied allowedRoles={allowedRoles} userRole={user?.role} />;
    }
  }

  return children;
}

/**
 * Access Denied Component
 */
function AccessDenied({ requiredRole, allowedRoles, userRole }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>

          {/* Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-500 mb-1">Your role:</p>
            <p className="font-medium text-gray-800 capitalize">{userRole || 'Unknown'}</p>
            
            {requiredRole && (
              <>
                <p className="text-sm text-gray-500 mt-3 mb-1">Required role:</p>
                <p className="font-medium text-gray-800 capitalize">{requiredRole} or higher</p>
              </>
            )}
            
            {allowedRoles && (
              <>
                <p className="text-sm text-gray-500 mt-3 mb-1">Allowed roles:</p>
                <p className="font-medium text-gray-800 capitalize">{allowedRoles.join(', ')}</p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href="/dashboard"
              className="block w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition"
            >
              Go to Dashboard
            </a>
            <a
              href="/"
              className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AdminRoute - Shorthand for admin-only routes
 */
export function AdminRoute({ children }) {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * ManagerRoute - Shorthand for manager or higher routes
 */
export function ManagerRoute({ children }) {
  return (
    <ProtectedRoute requiredRole={ROLES.MANAGER}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * StaffRoute - Shorthand for staff or higher routes
 */
export function StaffRoute({ children }) {
  return (
    <ProtectedRoute requiredRole={ROLES.STAFF}>
      {children}
    </ProtectedRoute>
  );
}

