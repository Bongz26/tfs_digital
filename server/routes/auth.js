/**
 * Authentication Routes
 * Handles user registration, login, logout, password reset
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { query } = require('../config/db');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
let supabaseAdmin = null;

const getSupabase = () => {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
};

const getSupabaseAdmin = () => {
  if (!supabaseAdmin && supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }

    // Register user with Supabase Auth
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || email.split('@')[0],
          phone: phone || null
        }
      }
    });

    if (error) {
      console.error('❌ Registration error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Create user profile
    if (data.user) {
      const adminClient = getSupabaseAdmin() || supabaseClient;
      
      const { error: profileError } = await adminClient
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: email,
          full_name: full_name || email.split('@')[0],
          phone: phone || null,
          role: 'staff', // Default role
          active: true
        });

      if (profileError) {
        console.error('⚠️ Error creating user profile:', profileError);
        // Don't fail registration if profile creation fails
      }
    }

    console.log(`✅ User registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
    });

  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: err.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login user and return session token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }

    // Login with Supabase Auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.warn(`⚠️ Login failed for ${email}:`, error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Fetch user profile
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    // Check if user is active
    if (profile && !profile.active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Update last login
    if (profile) {
      await supabaseClient
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', data.user.id);
    }

    console.log(`✅ User logged in: ${email}`);
    try {
      await query(
        `INSERT INTO audit_log (user_id, user_email, action, resource_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [data.user.id, email, 'login', 'auth', req.ip, req.headers['user-agent']]
      );
    } catch (e) {
      console.warn('Audit log failed (login):', e.message);
    }

    res.json({
      success: true,
      message: 'Login successful',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || data.user.email,
        role: profile?.role || 'staff',
        phone: profile?.phone
      }
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: err.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const supabaseClient = getSupabase();
    
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }

    console.log(`✅ User logged out: ${req.user.email}`);
    try {
      await query(
        `INSERT INTO audit_log (user_id, user_email, action, resource_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.email, 'logout', 'auth', req.ip, req.headers['user-agent']]
      );
    } catch (e) {
      console.warn('Audit log failed (logout):', e.message);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user's profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        phone: req.user.profile?.phone,
        created_at: req.user.profile?.created_at
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

/**
 * PUT /api/auth/me
 * Update current user's profile
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return res.status(500).json({
        success: false,
        error: 'Service unavailable'
      });
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseClient
      .from('user_profiles')
      .update(updates)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Profile update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }

    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return res.status(500).json({
        success: false,
        error: 'Service unavailable'
      });
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
    });

    if (error) {
      console.error('❌ Password reset error:', error);
      // Don't reveal if email exists
    }

    // Always return success to prevent email enumeration
    try {
      await query(
        `INSERT INTO audit_log (user_email, action, resource_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [email, 'password_reset_requested', 'auth', req.ip, req.headers['user-agent']]
      );
    } catch (e) {
      console.warn('Audit log failed (reset request):', e.message);
    }
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to send reset email'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const authHeader = req.headers.authorization;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      return res.status(500).json({
        success: false,
        error: 'Admin service unavailable'
      });
    }

    const { data: userData, error: getError } = await adminClient.auth.getUser(token);
    if (getError || !userData?.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userData.user.id, { password });
    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message
      });
    }

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

    try {
      await query(
        `INSERT INTO audit_log (user_id, user_email, action, resource_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userData.user.id, userData.user.email, 'reset_password', 'auth', req.ip, req.headers['user-agent']]
      );
    } catch (e) {
      console.warn('Audit log failed (reset password):', e.message);
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Password reset failed'
    });
  }
});

// ============= ADMIN ROUTES =============

/**
 * GET /api/auth/users
 * Get all users (Admin only)
 */
router.get('/users', requireAuth, requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const supabaseClient = getSupabase();
    
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      users: data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * PUT /api/auth/users/:id/role
 * Update user role (Admin only)
 */
router.put('/users/:id/role', requireAuth, requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Prevent changing own role
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own role'
      });
    }

    const supabaseClient = getSupabase();
    
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ User ${id} role changed to ${role} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User role updated',
      user: data
    });

    try {
      await query(
        `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.user.id, req.user.email, 'update_role', 'user', data.user_id, null, JSON.stringify({ role }), req.ip, req.headers['user-agent']]
      );
    } catch (e) {
      console.warn('Audit log failed (update role):', e.message);
    }

  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

/**
 * PUT /api/auth/users/:id/status
 * Activate/deactivate user (Admin only)
 */
router.put('/users/:id/status', requireAuth, requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // Prevent deactivating self
    if (id === req.user.id && active === false) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
    }

    const supabaseClient = getSupabase();
    
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('user_id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ User ${id} ${active ? 'activated' : 'deactivated'} by ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${active ? 'activated' : 'deactivated'}`,
      user: data
    });

    try {
      await query(
        `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.user.id, req.user.email, 'update_status', 'user', data.user_id, JSON.stringify({ active }), req.ip, req.headers['user-agent']]
      );
    } catch (e) {
      console.warn('Audit log failed (update status):', e.message);
    }

  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
});

/**
 * POST /api/auth/users/create
 * Create a new user (Admin only)
 */
router.post('/users/create', requireAuth, requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const validRoles = Object.values(ROLES);
    const userRole = validRoles.includes(role) ? role : 'staff';

    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      return res.status(500).json({
        success: false,
        error: 'Admin service unavailable. Set SUPABASE_SERVICE_KEY in environment.'
      });
    }

    // Create user with admin client
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || email.split('@')[0]
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Create user profile with role
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        user_id: data.user.id,
        email: email,
        full_name: full_name || email.split('@')[0],
        phone: phone || null,
        role: userRole,
        active: true
      });

    if (profileError) {
      console.error('⚠️ Error creating user profile:', profileError);
    }

    console.log(`✅ User created by admin: ${email} (role: ${userRole})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole
      }
    });

    try {
      await query(
        `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.user.id, req.user.email, 'create_user', 'user', data.user.id, JSON.stringify({ role: userRole }), req.ip, req.headers['user-agent']]
      );
    } catch (e) {
      console.warn('Audit log failed (create user):', e.message);
    }

  } catch (err) {
    console.error('❌ Create user error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

module.exports = router;

