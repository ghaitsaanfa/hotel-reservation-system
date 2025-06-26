const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

// Get all resepsionis (for dropdowns)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id_resepsionis, nama, email, no_hp, username FROM resepsionis ORDER BY nama');
        
        res.json({
            message: 'Resepsionis retrieved successfully',
            data: result.rows || []
        });
    } catch (error) {
        console.error('Get all resepsionis error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Get resepsionis by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM resepsionis WHERE id_resepsionis = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resepsionis not found' });
        }
        
        res.json({
            message: 'Resepsionis retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new resepsionis (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const { nama, email, no_hp, username, password } = req.body;
        
        if (!nama || !email || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO resepsionis (nama, email, no_hp, username, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nama, email, no_hp, username, hashedPassword]
        );
        
        res.status(201).json({
            message: 'Resepsionis created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update resepsionis (admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, email, no_hp, username, password } = req.body;
        
        let query = 'UPDATE resepsionis SET nama = $1, email = $2, no_hp = $3, username = $4';
        let params = [nama, email, no_hp, username];
        
        if (password) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = $5 WHERE id_resepsionis = $6 RETURNING *';
            params.push(hashedPassword, id);
        } else {
            query += ' WHERE id_resepsionis = $5 RETURNING *';
            params.push(id);
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resepsionis not found' });
        }
        
        res.json({
            message: 'Resepsionis updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete resepsionis (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM resepsionis WHERE id_resepsionis = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resepsionis not found' });
        }
        
        res.json({ message: 'Resepsionis deleted successfully' });
    } catch (error) {
        console.error('Delete resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login resepsionis
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const result = await pool.query('SELECT * FROM resepsionis WHERE username = $1 OR email = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const resepsionis = result.rows[0];
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, resepsionis.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: resepsionis.id_resepsionis, username: resepsionis.username, role: 'resepsionis' },
            process.env.JWT_SECRET || 'hotel-reservation-secret-key-2024',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            resepsionis: {
                id: resepsionis.id_resepsionis,
                nama: resepsionis.nama,
                username: resepsionis.username,
                email: resepsionis.email
            }
        });
    } catch (error) {
        console.error('Login resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public routes
router.post('/login', loginResepsionis);

// Protected routes (require authentication)
router.get('/', authenticateToken, getAllResepsionis);
router.get('/dashboard/stats', authenticateToken, getDashboardStats);
router.get('/:id', authenticateToken, getResepsionisById);

// Room management routes for receptionists
router.get('/rooms/all', authenticateToken, getAllRooms);
// router.get('/rooms/:id', authenticateToken, getRoomDetails); // Function not implemented yet
router.put('/rooms/:id/status', authenticateToken, updateRoomStatus);
router.post('/rooms/checkin', authenticateToken, checkInGuest);
router.post('/rooms/checkout', authenticateToken, checkOutGuest);

// Admin only routes
router.post('/', authenticateAdmin, createResepsionis);
router.put('/:id', authenticateAdmin, updateResepsionis);
router.delete('/:id', authenticateAdmin, deleteResepsionis);

// The duplicate route is removed as it's already handled by controller function above

// Test endpoint untuk debugging (temporary)
router.get('/rooms/test', (req, res) => {
    res.json({
        message: 'Test endpoint working',
        data: [
            {
                id_kamar: 1,
                no_kamar: '101',
                tipe: 'Standard',
                harga: 500000,
                status: 'Tersedia',
                deskripsi_kamar: 'Kamar standar dengan tempat tidur double',
                kapasitas_maks: 2,
                status_aktual: 'Tersedia',
                id_reservasi: null,
                tanggal_checkin: null,
                tanggal_checkout: null,
                status_reservasi: null,
                nama_tamu: null,
                no_hp_tamu: null,
                lantai: 1
            },
            {
                id_kamar: 2,
                no_kamar: '102',
                tipe: 'Deluxe',
                harga: 750000,
                status: 'Terisi',
                deskripsi_kamar: 'Kamar deluxe dengan view kota',
                kapasitas_maks: 2,
                status_aktual: 'Terisi',
                id_reservasi: 1,
                tanggal_checkin: '2025-06-18',
                tanggal_checkout: '2025-06-20',
                status_reservasi: 'Check-In',
                nama_tamu: 'John Doe',
                no_hp_tamu: '081234567890',
                lantai: 1
            }
        ]
    });
});

module.exports = router;
