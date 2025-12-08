/**
 * Authentication API functions
 */

import { API_HOST } from './config';

const AUTH_URL = `${API_HOST}/api/auth`;

// Token storage keys
const TOKEN_KEY = 'tfs_access_token';
const REFRESH_TOKEN_KEY = 'tfs_refresh_token';
const USER_KEY = 'tfs_user';

/**
 * Get stored access token
 */
export const getAccessToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Get stored user
 */
export const getStoredUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

/**
 * Store auth data
 */
const storeAuthData = (session, user) => {
  if (session?.access_token) {
    localStorage.setItem(TOKEN_KEY, session.access_token);
  }
  if (session?.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Clear auth data
 */
export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getAccessToken();
};

/**
 * Create auth headers for API requests
 */
export const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Login user
 */
export const login = async (email, password) => {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  // Store auth data
  storeAuthData(data.session, data.user);

  return data;
};

/**
 * Register new user
 */
export const register = async (userData) => {
  const response = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  return data;
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    const token = getAccessToken();
    if (token) {
      await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    clearAuthData();
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async () => {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${AUTH_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthData();
    }
    return null;
  }

  const data = await response.json();
  return data.user;
};

/**
 * Update user profile
 */
export const updateProfile = async (profileData) => {
  const token = getAccessToken();
  
  const response = await fetch(`${AUTH_URL}/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Update failed');
  }

  return data;
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${AUTH_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      clearAuthData();
      return null;
    }

    const data = await response.json();
    storeAuthData(data.session, null);
    return data.session.access_token;
  } catch (err) {
    clearAuthData();
    return null;
  }
};

/**
 * Send password reset email
 */
export const forgotPassword = async (email) => {
  const response = await fetch(`${AUTH_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send reset email');
  }

  return data;
};

/**
 * Reset password with token
 */
export const resetPassword = async (password, token) => {
  const response = await fetch(`${AUTH_URL}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Password reset failed');
  }

  return data;
};

// ============= ADMIN FUNCTIONS =============

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async () => {
  const token = getAccessToken();
  
  const response = await fetch(`${AUTH_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch users');
  }

  return data.users;
};

/**
 * Create user (Admin only)
 */
export const createUser = async (userData) => {
  const token = getAccessToken();
  
  const response = await fetch(`${AUTH_URL}/users/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create user');
  }

  return data;
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (userId, role) => {
  const token = getAccessToken();
  
  const response = await fetch(`${AUTH_URL}/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ role })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update role');
  }

  return data;
};

/**
 * Update user status (Admin only)
 */
export const updateUserStatus = async (userId, active) => {
  const token = getAccessToken();
  
  const response = await fetch(`${AUTH_URL}/users/${userId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ active })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update status');
  }

  return data;
};

/**
 * Delete user (Admin only)
 */
export const deleteUser = async (userId, confirmEmail, reason) => {
  const token = getAccessToken();
  const response = await fetch(`${AUTH_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ confirm_email: confirmEmail, reason })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete user');
  }
  return data;
};

export default {
  login,
  logout,
  register,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
  getAccessToken,
  getAuthHeaders,
  isAuthenticated,
  clearAuthData,
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus
};

