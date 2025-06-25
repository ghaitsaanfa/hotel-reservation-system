const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const {
    loginResepsionis,
    getAllResepsionis,
    getResepsionisById,
    createResepsionis,
    updateResepsionis,
    deleteResepsionis,
    getDashboardStats,
    getAllRooms,
    updateRoomStatus,
    checkInGuest,
    checkOutGuest
} = require('../controllers/resepsionisController');

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
