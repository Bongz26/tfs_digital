/**
 * Authentication Middleware
 * Uses Supabase Auth to verify JWT tokens
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin Client (with service role key for admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

const getSupabase = () => {
  if (!supabase && supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
};

/**
 * Middleware to require authentication
 * Verifies the JWT token from Authorization header
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid authorization token'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = getSupabase();

    if (!supabaseClient) {
      console.error('❌ Supabase client not initialized - check SUPABASE_URL and SUPABASE_SERVICE_KEY');
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }

    // Verify the token and get user
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      console.warn('⚠️ Invalid token:', error?.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: 'Please login again'
      });
    }

    // Fetch user profile with role
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error fetching user profile:', profileError);
    }

    // Attach user and profile to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'staff', // Default role
      full_name: profile?.full_name || user.email,
      profile: profile
    };

    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: err.message
    });
  }
};

/**
 * Middleware to require specific role(s)
 * Must be used AFTER requireAuth
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = getSupabase();

    if (!supabaseClient) {
      req.user = null;
      return next();
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      req.user = null;
      return next();
    }

    // Fetch user profile
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'staff',
      full_name: profile?.full_name || user.email,
      profile: profile
    };

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// Role constants
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STOCK_MANAGER: 'stock_manager',
  STAFF: 'staff',
  DRIVER: 'driver'
};

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  admin: 4,
  manager: 3,
  stock_manager: 2,
  staff: 2,
  driver: 1
};

/**
 * Check if user has at least the minimum required role level
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `This action requires at least ${minRole} role`
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
  requireMinRole,
  optionalAuth,
  ROLES,
  getSupabase
};

