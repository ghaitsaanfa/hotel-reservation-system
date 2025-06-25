const express = require('express');
const router = express.Router();
// Import controllers instead of direct database access
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('🔧 Auth routes loaded');

// Login Route
router.post('/login', async (req, res) => {
    const { emailOrUsername, password } = req.body;
    console.log('[LOGIN] Login attempt:', { emailOrUsername, password: '***' });

    if (!emailOrUsername || !password) {
        return res.status(400).json({ message: 'Email/Username and password are required.' });
    }

    try {
        let user = null;
        let userRole = null;
        let userId = null;
        let userName = null;
        let userEmail = null;

        // 1. Check Tamu table
        console.log('[LOGIN] Checking tamu table...');
        const tamuResult = await pool.query(
            'SELECT id_tamu, nama, username, email, password FROM tamu WHERE email = $1 OR username = $1',
            [emailOrUsername]
        );

        console.log('[LOGIN] Tamu query result:', tamuResult.rows.length, 'rows found');
        
        if (tamuResult.rows.length > 0) {
            user = tamuResult.rows[0];
            userRole = 'tamu';
            userId = user.id_tamu;
            userName = user.nama;
            userEmail = user.email;
            console.log('[LOGIN] Found user in tamu table:', userName);
        }

        // 2. If not in Tamu, check Resepsionis table
        if (!user) {
            console.log('[LOGIN] Checking resepsionis table...');
            const resepsionisResult = await pool.query(
                'SELECT id_resepsionis, nama, username, email, password FROM resepsionis WHERE email = $1 OR username = $1',
                [emailOrUsername]
            );

            console.log('[LOGIN] Resepsionis query result:', resepsionisResult.rows.length, 'rows found');
            
            if (resepsionisResult.rows.length > 0) {
                user = resepsionisResult.rows[0];
                userRole = 'resepsionis';
                userId = user.id_resepsionis;
                userName = user.nama;
                userEmail = user.email;
                console.log('[LOGIN] Found user in resepsionis table:', userName);
            }
        }

        // 3. If not in Tamu or Resepsionis, check Admin table
        if (!user) {
            console.log('[LOGIN] Checking admin table...');
            const adminResult = await pool.query(
                'SELECT id_admin, nama, username, password FROM admin WHERE username = $1',
                [emailOrUsername]
            );

            console.log('[LOGIN] Admin query result:', adminResult.rows.length, 'rows found');
            
            if (adminResult.rows.length > 0) {
                user = adminResult.rows[0];
                userRole = 'admin';
                userId = user.id_admin;
                userName = user.nama;
                console.log('[LOGIN] Found user in admin table:', userName);
                console.log('[LOGIN] Admin password hash preview:', user.password ? user.password.substring(0, 20) + '...' : 'null');
            }
        }

        // 4. Handle User Not Found
        if (!user) {
            console.log('[LOGIN] User not found in any table');
            return res.status(404).json({ message: 'User not found. Please check your credentials or register.' });
        }

        console.log('[LOGIN] User found:', { role: userRole, name: userName, id: userId });

        // 5. Password Verification
        const storedPasswordHash = user.password;
        console.log('[LOGIN] Password verification for role:', userRole);
        console.log('[LOGIN] Stored hash exists:', !!storedPasswordHash);
        console.log('[LOGIN] Hash preview:', storedPasswordHash ? storedPasswordHash.substring(0, 20) + '...' : 'null');
        
        const isMatch = await bcrypt.compare(password, storedPasswordHash);
        console.log('[LOGIN] Password match result:', isMatch);

        if (!isMatch) {
            console.log('[LOGIN] Password verification failed');
            return res.status(401).json({ message: 'Invalid credentials. Please check your password.' });
        }

        // 6. Handle Successful Login: Generate JWT
        console.log('[LOGIN] Password verified successfully. Generating JWT...');
        const tokenPayload = {
            id: userId,
            username: user.username,
            role: userRole,
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'YOUR_SECRET_KEY', { expiresIn: '1h' });

        console.log('[LOGIN] Login successful for user:', userName, 'Role:', userRole);
        
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: userId,
                nama: userName,
                username: user.username,
                email: userEmail,
                role: userRole
            }
        });    
    } catch (error) {
        console.error('[LOGIN] Login error:', error);
        console.error('[LOGIN] Error stack:', error.stack);
        res.status(500).json({ message: 'Server error during login. Please try again later.' });
    }
});

// Registration Route for Tamu (Guest)
router.post('/register', async (req, res) => {
    console.log('[REGISTER /api/auth/register] Route hit.');
    const { nama, email, no_hp, username, password, alamat } = req.body;
    console.log('[REGISTER] Request body:', req.body);

    // Basic validation
    if (!nama || !email || !no_hp || !username || !password) {
        console.log('[REGISTER] Validation failed: Missing required fields.');
        return res.status(400).json({ message: 'Nama, email, no_hp, username, and password are required.' });
    }

    try {
        console.log('[REGISTER] Inside try block. Checking for existing user...');
        
        // Check if username or email already exists in tamu table
        const existingUserResult = await pool.query(
            'SELECT username, email FROM tamu WHERE username = $1 OR email = $2',
            [username, email]
        );

        console.log('[REGISTER] Existing user check result:', existingUserResult.rows);

        if (existingUserResult.rows.length > 0) {
            const existing = existingUserResult.rows[0];
            if (existing.username === username) {
                console.log('[REGISTER] Username already exists.');
                return res.status(409).json({ message: 'Username already exists.' });
            }
            if (existing.email === email) {
                console.log('[REGISTER] Email already registered.');
                return res.status(409).json({ message: 'Email already registered.' });
            }
        }

        console.log('[REGISTER] Hashing password...');
        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('[REGISTER] Password hashed.');

        console.log('[REGISTER] Inserting new tamu into database...');
        // Insert new tamu (guest)
        const insertResult = await pool.query(
            `INSERT INTO tamu (nama, email, no_hp, username, password, alamat) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_tamu`,
            [nama, email, no_hp, username, hashedPassword, alamat]
        );

        console.log('[REGISTER] Database insert result:', insertResult.rows);

        if (insertResult.rows.length > 0) {
            const newUserId = insertResult.rows[0].id_tamu;
            console.log('[REGISTER] Registration successful. User ID:', newUserId);
            res.status(201).json({ 
                message: 'Registration successful! You can now login.', 
                userId: newUserId 
            });
        } else {
            console.error('[REGISTER] Failed to register user - no result returned.');
            throw new Error('Failed to register user.');
        }

    } catch (error) {
        console.error('[REGISTER] Error caught in registration route:', error);
        
        // Handle unique constraint violations for PostgreSQL
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('username')) {
                console.log('[REGISTER] Unique constraint violation for username.');
                return res.status(409).json({ message: 'Username already taken.' });
            }
            if (error.constraint && error.constraint.includes('email')) {
                console.log('[REGISTER] Unique constraint violation for email.');
                return res.status(409).json({ message: 'Email already in use.' });
            }
            if (error.constraint && error.constraint.includes('no_hp')) {
                console.log('[REGISTER] Unique constraint violation for no_hp.');
                return res.status(409).json({ message: 'Phone number already registered.' });
            }
            // Generic unique constraint error
            return res.status(409).json({ message: 'This information is already registered.' });
        }
        
        console.log('[REGISTER] Sending generic 500 error response.');
        res.status(500).json({ message: 'Server error during registration. Please try again later.' });
    }
});

module.exports = router;
