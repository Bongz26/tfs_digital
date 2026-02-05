/**
 * Script to create the first admin user
 * Run: node server/database/create-admin-user.js
 * 
 * This script creates an admin user directly via Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

// Initialize database pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials!');
    console.error('');
    console.error('Please set the following in your server/.env file:');
    console.error('  SUPABASE_URL=your_supabase_url');
    console.error('  SUPABASE_SERVICE_KEY=your_service_role_key');
    console.error('');
    console.error('You can find the Service Role Key in:');
    console.error('  Supabase Dashboard → Settings → API → Service Role Key');
    console.error('');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function createAdminUser() {
    console.log('');
    console.log('🔐 Create Admin User for TFS Digital');
    console.log('=====================================');
    console.log('');

    try {
        // Get user details
        const email = await question('Email address: ');
        const password = await question('Password (min 6 characters): ');
        const fullName = await question('Full name: ');
        const phone = await question('Phone number (optional): ');

        if (!email || !password) {
            console.error('❌ Email and password are required');
            process.exit(1);
        }

        if (password.length < 6) {
            console.error('❌ Password must be at least 6 characters');
            process.exit(1);
        }

        console.log('');
        console.log('Creating admin user...');

        // Create user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: fullName || email.split('@')[0]
            }
        });

        if (authError) {
            console.error('❌ Error creating auth user:', authError.message);
            process.exit(1);
        }

        console.log('✅ Auth user created:', authData.user.id);

        // Create user profile with admin role
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO user_profiles (user_id, email, full_name, phone, role, active)
                 VALUES ($1, $2, $3, $4, 'admin', true)
                 ON CONFLICT (user_id) DO UPDATE SET role = 'admin'`,
                [authData.user.id, email, fullName || email.split('@')[0], phone || null]
            );
            console.log('✅ User profile created with admin role');
        } finally {
            client.release();
        }

        console.log('');
        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('📝 Login Details:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: (the one you entered)`);
        console.log(`   Role: admin`);
        console.log('');
        console.log('You can now login at: http://localhost:3000/login');
        console.log('');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

createAdminUser();

