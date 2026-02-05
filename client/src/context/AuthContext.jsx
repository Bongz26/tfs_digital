/**
 * Authentication Context
 * Provides authentication state and functions to the entire app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  getStoredUser,
  isAuthenticated as checkAuth,
  getAccessToken
} from '../api/auth';

// Create context
const AuthContext = createContext(null);

// Role constants
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  DRIVER: 'driver'
};

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  admin: 4,
  manager: 3,
  staff: 2,
  driver: 1
};

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we have a token
        if (checkAuth()) {
          // Try to get user from storage first (faster)
          const storedUser = getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          }
          
          // Then verify with server and update
          const serverUser = await getCurrentUser();
          if (serverUser) {
            setUser(serverUser);
          } else if (!storedUser) {
            // No valid user, clear state
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login function
   */
  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await apiLogin(email, password);
      setUser(result.user);
      return { success: true, user: result.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiLogout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const serverUser = await getCurrentUser();
      if (serverUser) {
        setUser(serverUser);
      }
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }, []);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role) => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  /**
   * Check if user has at least minimum role level
   */
  const hasMinRole = useCallback((minRole) => {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= requiredLevel;
  }, [user]);

  /**
   * Check if user is admin
   */
  const isAdmin = useCallback(() => {
    return hasRole(ROLES.ADMIN);
  }, [hasRole]);

  /**
   * Check if user is manager or above
   */
  const isManagerOrAbove = useCallback(() => {
    return hasMinRole(ROLES.MANAGER);
  }, [hasMinRole]);

  // Context value
  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    hasRole,
    hasMinRole,
    isAdmin,
    isManagerOrAbove,
    getAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Higher-order component for protected routes
 */
export function withAuth(Component, options = {}) {
  const { requiredRole, redirectTo = '/login' } = options;
  
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, user, loading, hasMinRole } = useAuth();
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      window.location.href = redirectTo;
      return null;
    }
    
    if (requiredRole && !hasMinRole(requiredRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} user={user} />;
  };
}

export default AuthContext;

