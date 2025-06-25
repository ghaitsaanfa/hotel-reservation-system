const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hotel-reservation-secret-key-2024';

// Login endpoint with detailed logging
router.post('/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt received:', {
            body: { ...req.body, password: '[HIDDEN]' }
        });

        const { username, password, role } = req.body;

        // Validate input
        if (!username || !password) {
            console.log('❌ Missing credentials');
            return res.status(400).json({
                success: false,
                error: 'Username dan password harus diisi'
            });
        }

        console.log('🔍 Searching for user:', { username, role });

        let user = null;
        let userRole = '';

        // Try different tables based on role or search all
        const searchTables = role ? [role] : ['admin', 'resepsionis', 'tamu'];

        for (const tableName of searchTables) {
            console.log(`🔍 Checking table: ${tableName}`);
            
            try {
                // Select appropriate fields for each table
                let selectQuery = '';
                let idField = '';
                
                if (tableName === 'admin') {
                    selectQuery = 'SELECT id_admin, nama, username, password, created_at FROM admin WHERE username = $1';
                    idField = 'id_admin';
                } else if (tableName === 'resepsionis') {
                    selectQuery = 'SELECT id_resepsionis, nama, username, email, password, no_hp, alamat, created_at FROM resepsionis WHERE username = $1';
                    idField = 'id_resepsionis';
                } else if (tableName === 'tamu') {
                    selectQuery = 'SELECT id_tamu, nama, username, email, password, no_hp, alamat, created_at FROM tamu WHERE username = $1';
                    idField = 'id_tamu';
                }

                const result = await pool.query(selectQuery, [username]);

                console.log(`📊 Query result for ${tableName}:`, { 
                    found: result.rows.length > 0,
                    rows: result.rows.length
                });

                if (result.rows.length > 0) {
                    user = result.rows[0];
                    user.idField = idField; // Store the ID field name for later use
                    userRole = tableName;
                    console.log('✅ User found in table:', tableName);
                    break;
                }
            } catch (queryError) {
                console.log(`⚠️ Query error for ${tableName}:`, queryError.message);
                continue;
            }
        }

        if (!user) {
            console.log('❌ User not found');
            return res.status(401).json({
                success: false,
                error: 'Username tidak ditemukan'
            });
        }

        console.log('🔒 Verifying password...');
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return res.status(401).json({
                success: false,
                error: 'Password salah'
            });
        }

        console.log('✅ Password valid, generating token...');

        // Generate JWT token
        const tokenPayload = {
            id: user[user.idField] || user.id,
            username: user.username,
            role: userRole,
            nama: user.nama
        };

        console.log('🎟️ Token payload:', tokenPayload);

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Remove password from response
        delete user.password;

        const responseData = {
            success: true,
            message: 'Login berhasil',
            token,
            user: {
                ...user,
                role: userRole
            }
        };

        console.log('✅ Login successful for user:', user.username);

        res.json(responseData);

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan server: ' + error.message
        });
    }
});

// Register endpoint for tamu
router.post('/register', async (req, res) => {
    try {
        console.log('📝 Register attempt:', req.body);

        const { nama, email, username, password, no_hp, alamat } = req.body;

        if (!nama || !email || !username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Nama, email, username, dan password harus diisi'
            });
        }

        // Check if username or email already exists
        const existingUserResult = await pool.query(
            'SELECT username, email FROM tamu WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Username atau email sudah terdaftar'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const insertResult = await pool.query(
            `INSERT INTO tamu (nama, email, username, password, no_hp, alamat) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nama, email, username, hashedPassword, no_hp, alamat]
        );

        if (insertResult.rows.length === 0) {
            throw new Error('Failed to create user');
        }

        const newUser = insertResult.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: newUser.id_tamu,
                username: newUser.username,
                role: 'tamu',
                nama: newUser.nama
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        delete newUser.password;

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil',
            token,
            user: {
                ...newUser,
                role: 'tamu'
            }
        });

    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan server: ' + error.message
        });
    }
});

module.exports = router;
