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

module.exports = router;
