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

// Debug route for testing kamar endpoint (remove in production)
router.get('/debug/all', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Debug: Kamar route is accessible',
            timestamp: new Date().toISOString(),
            debug: 'Simple test without database query'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug route for testing pool import
router.get('/debug/pool', async (req, res) => {
    try {
        const databaseConfig = require('../config/database');
        
        res.json({
            success: true,
            message: 'Database config loaded in kamar route',
            hasPool: typeof databaseConfig.pool !== 'undefined',
            hasQuery: typeof databaseConfig.pool?.query !== 'undefined',
            exports: Object.keys(databaseConfig),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

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

module.exports = router;
