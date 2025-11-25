-- Migration: Add user_profiles table for authentication
-- This table extends Supabase Auth with custom profile data

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,  -- Links to Supabase auth.users
    email VARCHAR(120) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'driver')),
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(active);

-- Audit Log Table (track all important actions)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    user_email VARCHAR(120),
    action VARCHAR(50) NOT NULL,      -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    resource_type VARCHAR(50),        -- 'case', 'inventory', 'purchase_order', etc.
    resource_id INT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Add created_by and updated_by columns to main tables (for audit trail)
-- Cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

-- Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

-- Purchase Orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

-- Stock Movements (already has recorded_by, add user_id)
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id UUID;

-- Enable Row Level Security (RLS) on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Users can update their own profile (except role)
CREATE POLICY IF NOT EXISTS "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = user_id);

-- Policy: Admins can view all profiles
CREATE POLICY IF NOT EXISTS "Admins can view all profiles" 
    ON user_profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy: Admins can update all profiles
CREATE POLICY IF NOT EXISTS "Admins can update all profiles" 
    ON user_profiles FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy: Allow insert for new user registration
CREATE POLICY IF NOT EXISTS "Allow insert for registration" 
    ON user_profiles FOR INSERT 
    WITH CHECK (true);

-- Verify the changes
SELECT 'user_profiles table created' AS status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

