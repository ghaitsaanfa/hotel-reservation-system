const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const {
    getAllKamar,
    getAvailableKamar,
    getAvailableRoomTypes,
    getKamarById,
    createKamar,
    updateKamar,
    updateKamarStatus,
    deleteKamar
} = require('../controllers/kamarController');

// Get all kamar
router.get('/', getAllKamar);

// Public routes
router.get('/all', getAllKamar); // Add alias for /all endpoint
router.get('/available', getAvailableKamar);
router.get('/types/available', getAvailableRoomTypes);
router.get('/:id', getKamarById);

// Protected routes (require authentication)
router.post('/', authenticateAdmin, createKamar);
router.put('/:id', authenticateAdmin, updateKamar);
router.patch('/:id/status', authenticateToken, updateKamarStatus); // For resepsionis to update status
router.delete('/:id', authenticateAdmin, deleteKamar);

// Debug route for testing kamar endpoint (remove in production)
router.get('/debug/all', async (req, res) => {
    try {
        const { pool } = require('../config/database');
        
        const result = await pool.query(`
            SELECT 
                id_kamar,
                no_kamar,
                tipe,
                harga,
                kapasitas_maks,
                status,
                deskripsi_kamar
            FROM kamar 
            ORDER BY no_kamar
        `);

        console.log(`Debug: Retrieved ${result.rows.length} rooms`);

        res.json({
            success: true,
            message: 'Debug: Rooms retrieved successfully',
            data: result.rows,
            debug: 'This endpoint works without authentication'
        });
    } catch (error) {
        console.error('Debug kamar error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            debug: 'Debug endpoint for kamar'
        });
    }
});

module.exports = router;
