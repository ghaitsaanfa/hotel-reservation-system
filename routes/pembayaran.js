const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getAllPembayaran,
    getPembayaranById,
    getPembayaranByReservasi,
    createPembayaran,
    updatePembayaranStatus,
    updatePembayaran,
    deletePembayaran,
    getPembayaranSummary
} = require('../controllers/pembayaranController');

// Fungsi helper untuk menghitung PPN
const calculatePPN = (req, res) => {
    try {
        const { subtotal } = req.body;
        
        if (!subtotal || isNaN(subtotal)) {
            return res.status(400).json({ error: 'Valid subtotal is required' });
        }
        
        const ppn_rate = 0.10;
        const subtotal_amount = parseFloat(subtotal);
        const ppn_amount = subtotal_amount * ppn_rate;
        const total_dengan_ppn = subtotal_amount + ppn_amount;
        
        res.json({
            message: 'PPN calculation successful',
            calculation: {
                subtotal: subtotal_amount,
                ppn_rate: `${ppn_rate * 100}%`,
                ppn_amount: ppn_amount,
                total_dengan_ppn: total_dengan_ppn
            }
        });
    } catch (error) {
        console.error('PPN calculation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Public routes for guest payments
router.post('/calculate-ppn', calculatePPN); // Endpoint untuk menghitung PPN
router.get('/reservasi/:id_reservasi', getPembayaranByReservasi); // Allow guests to check payment status
router.post('/', createPembayaran); // Allow guests to create payments

// Protected routes (require authentication)
router.get('/', authenticateToken, getAllPembayaran);
router.get('/summary', authenticateToken, getPembayaranSummary);
router.get('/:id', authenticateToken, getPembayaranById);
router.put('/:id/status', authenticateToken, updatePembayaranStatus); // Changed from PATCH to PUT
router.patch('/:id/status', authenticateToken, updatePembayaranStatus); // Keep both for compatibility
router.put('/:id', authenticateToken, updatePembayaran);
router.delete('/:id', authenticateToken, deletePembayaran);

// The duplicate route is removed as it's already handled by controller function above

module.exports = router;
