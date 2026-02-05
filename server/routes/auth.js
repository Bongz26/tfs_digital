/**
 * Authentication Routes
 * Handles user registration, login, logout, password reset
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

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

async function findUserByEmail(adminClient, email) {
  const target = String(email || '').toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 15; page++) {
    try {
      const { data } = await adminClient.auth.admin.listUsers({ page, perPage });
      const match = (data?.users || []).find(u => String(u.email || '').toLowerCase() === target);
      if (match) return match;
      if (!data || !Array.isArray(data.users) || data.users.length < perPage) break;
    } catch (e) {
      console.warn('⚠️  [findUserByEmail] listUsers failed', { page, error: e?.message });
      break;
    }
  }
  return null;
}

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

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return res.status(500).json({
        success: false,
        error: 'Service unavailable'
      });
    }

    const { error } = await supabaseClient.auth.updateUser({
      password
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

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

    console.log('📥 [CreateUser] Request received', {
      email,
      full_name: full_name || null,
      phone: phone || null,
      role: userRole
    });

    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      return res.status(500).json({
        success: false,
        error: 'Admin service unavailable. Set SUPABASE_SERVICE_KEY in environment.'
      });
    }

    // Check if user already exists in Supabase Auth and reactivate/update if so
    let existingUser = await findUserByEmail(adminClient, email);
    if (existingUser) {
      console.log('🔎 [CreateUser] Existing auth user found', { id: existingUser.id, email: existingUser.email });
    } else {
      console.log('🔎 [CreateUser] No existing auth user found for email');
    }

    if (existingUser) {
      // Update existing user with new password and metadata, and ensure profile exists
      console.log('♻️ [CreateUser] Updating existing auth user');
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: {
          full_name: full_name || existingUser.user_metadata?.full_name || email.split('@')[0]
        }
      });

      // Upsert profile
      const { error: profileUpsertError } = await adminClient
        .from('user_profiles')
        .upsert({
          user_id: existingUser.id,
          email: email,
          full_name: full_name || email.split('@')[0],
          phone: phone || null,
          role: userRole,
          active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (profileUpsertError) {
        console.error('⚠️ Error upserting user profile:', profileUpsertError);
      }

      console.log(`♻️ User reactivated/updated by admin: ${email} (role: ${userRole})`);
      return res.status(200).json({
        success: true,
        message: 'Existing user updated and reactivated',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: userRole
        }
      });
    }

    // Create user with admin client
    console.log('🆕 [CreateUser] Creating new auth user');
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0]
      }
    });

    if (error) {
      console.warn('⚠️  [CreateUser] createUser failed', { error: error.message });
      // If already registered, try to locate and update existing user
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('already') && msg.includes('registered')) {
        try {
          const found2 = await findUserByEmail(adminClient, email);
          if (found2) {
            console.log('♻️ [CreateUser] Found existing user after create failure, updating');
            await adminClient.auth.admin.updateUserById(found2.id, {
              password,
              user_metadata: { full_name: full_name || email.split('@')[0] }
            });
            const { error: profileUpsertError2 } = await adminClient
              .from('user_profiles')
              .upsert({
                user_id: found2.id,
                email,
                full_name: full_name || email.split('@')[0],
                phone: phone || null,
                role: userRole,
                active: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });
            if (profileUpsertError2) console.error('⚠️  [CreateUser] Profile upsert error:', profileUpsertError2);
            return res.status(200).json({
              success: true,
              message: 'Existing user updated and reactivated',
              user: { id: found2.id, email: found2.email, role: userRole }
            });
          }
        } catch (e2) {
          console.warn('⚠️  [CreateUser] Fallback update failed', { error: e2?.message });
        }
      }
      return res.status(400).json({ success: false, error: error.message });
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

  } catch (err) {
    console.error('❌ Create user error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Permanently delete a user (Admin only)
 * Requires confirmation: provide `confirm_email` in body matching the user's email
 * Safety: cannot delete self
 */
router.delete('/users/:id', requireAuth, requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm_email, reason } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, error: 'User id is required' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      return res.status(500).json({ success: false, error: 'Admin service unavailable. Set SUPABASE_SERVICE_KEY in environment.' });
    }

    // Fetch user profile to verify email
    const { data: profile, error: profileErr } = await adminClient
      .from('user_profiles')
      .select('user_id, email, full_name, role, active, created_at')
      .eq('user_id', id)
      .single();

    if (profileErr && profileErr.code !== 'PGRST116') {
      return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }

    const emailToCheck = profile?.email;
    if (!emailToCheck) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!confirm_email || String(confirm_email).toLowerCase() !== String(emailToCheck).toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Confirmation email does not match user email' });
    }

    // Delete from Supabase Auth
    const { error: delErr } = await adminClient.auth.admin.deleteUser(id);
    if (delErr) {
      return res.status(400).json({ success: false, error: delErr.message || 'Failed to delete auth user' });
    }

    // Remove profile row
    await adminClient.from('user_profiles').delete().eq('user_id', id);

    console.log(`🗑️ User ${id} (${emailToCheck}) deleted by ${req.user.email}${reason ? ` — reason: ${reason}` : ''}`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

module.exports = router;

