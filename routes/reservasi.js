const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getAllReservasi,
    getReservasiById,
    createReservasi,
    createReservasiWithAutoAssignment,
    updateReservasiStatus,
    updateReservasi,
    deleteReservasi,
    getReservasiByDateRange,
    getReservasiByTamu,
    cancelReservasi
} = require('../controllers/reservasiController');

// Use controller functions instead of direct database queries
router.get('/', getAllReservasi);

// Public routes
router.post('/', createReservasiWithAutoAssignment); // Use new auto-assignment function as default
router.post('/manual', createReservasi); // Keep old function for manual room selection
router.get('/tamu/:id_tamu', getReservasiByTamu); // New route for user's reservations (public access for frontend)
router.get('/detail/:id', getReservasiById); // Public route for reservation details
router.patch('/:id/cancel', cancelReservasi); // Allow guests to cancel their reservations

// Debug route (temporary - remove in production)
router.get('/debug', getAllReservasi); // Debug route without authentication

// Protected routes (require authentication)
router.get('/', authenticateToken, getAllReservasi);
router.get('/date-range', authenticateToken, getReservasiByDateRange);
router.get('/:id', authenticateToken, getReservasiById);
router.patch('/:id/status', authenticateToken, updateReservasiStatus);
router.put('/:id', authenticateToken, updateReservasi);
router.delete('/:id', authenticateToken, deleteReservasi);

module.exports = router;
