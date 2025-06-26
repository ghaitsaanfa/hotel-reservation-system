const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const {
    loginAdmin,
    registerAdmin,
    getAllAdmins,
    updateAdmin,
    deleteAdmin
} = require('../controllers/adminController');

// Dashboard stats
router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
    try {
        // Get basic counts using PostgreSQL
        const [kamarResult, tamuResult, reservasiResult, resepsionisResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM kamar'),
            pool.query('SELECT COUNT(*) as count FROM tamu'),
            pool.query('SELECT COUNT(*) as count FROM reservasi'),
            pool.query('SELECT COUNT(*) as count FROM resepsionis')
        ]);

        const stats = {
            totalKamar: parseInt(kamarResult.rows[0].count) || 0,
            kamarTersedia: 0,
            totalTamu: parseInt(tamuResult.rows[0].count) || 0,
            reservasiAktif: 0,
            totalResepsionis: parseInt(resepsionisResult.rows[0].count) || 0,
            reservasiHariIni: 0,
            pendapatanBulan: 0,
            reservasiTerbaru: []
        };

        // Calculate available rooms
        const availableRoomsResult = await pool.query("SELECT COUNT(*) as count FROM kamar WHERE status = 'Tersedia'");
        stats.kamarTersedia = parseInt(availableRoomsResult.rows[0].count) || 0;

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Debug route for testing dashboard stats (remove in production)
router.get('/debug/dashboard/stats', async (req, res) => {
    try {
        // Get basic counts using PostgreSQL
        const [kamarResult, tamuResult, reservasiResult, resepsionisResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM kamar'),
            pool.query('SELECT COUNT(*) as count FROM tamu'),
            pool.query('SELECT COUNT(*) as count FROM reservasi'),
            pool.query('SELECT COUNT(*) as count FROM resepsionis')
        ]);

        const stats = {
            totalKamar: parseInt(kamarResult.rows[0].count) || 0,
            kamarTersedia: 0,
            totalTamu: parseInt(tamuResult.rows[0].count) || 0,
            reservasiAktif: 0,
            totalResepsionis: parseInt(resepsionisResult.rows[0].count) || 0,
            reservasiHariIni: 0,
            pendapatanBulan: 0,
            reservasiTerbaru: []
        };

        // Calculate available rooms
        const availableRoomsResult = await pool.query("SELECT COUNT(*) as count FROM kamar WHERE status = 'Tersedia'");
        stats.kamarTersedia = parseInt(availableRoomsResult.rows[0].count) || 0;

        res.json({
            success: true,
            data: stats,
            debug: 'This endpoint works without authentication'
        });
    } catch (error) {
        console.error('Error fetching debug dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Public routes
router.post('/login', loginAdmin);

// Protected routes (require admin authentication)
router.post('/register', authenticateAdmin, registerAdmin);
router.get('/', authenticateAdmin, getAllAdmins);
router.put('/:id', authenticateAdmin, updateAdmin);
router.delete('/:id', authenticateAdmin, deleteAdmin);

module.exports = router;
