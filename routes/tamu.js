const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getAllTamu,
    getTamuById,
    createTamu,
    updateTamu,
    deleteTamu,
    loginTamu,
    registerTamu
} = require('../controllers/tamuController');

// Public routes
router.post('/register', registerTamu);
router.post('/login', loginTamu);

// Add the missing /all route
router.get('/all', async (req, res) => {
    try {
        const result = await pool.query('SELECT id_tamu, nama, email, no_hp, username FROM tamu ORDER BY nama');
        
        res.json({
            message: 'Tamu retrieved successfully',
            data: result.rows || []
        });
    } catch (error) {
        console.error('Get all tamu error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Protected routes
router.get('/', authenticateToken, getAllTamu);
router.get('/:id', authenticateToken, getTamuById);
router.post('/', authenticateToken, createTamu);
router.put('/:id', authenticateToken, updateTamu);
router.delete('/:id', authenticateToken, deleteTamu);

module.exports = router;
                paramIndex++;
            }
            if (no_hp) {
                sqlQuery += ` AND no_hp ILIKE $${paramIndex}`;
                params.push(`%${no_hp}%`);
                paramIndex++;
            }
        }

        const result = await pool.query(sqlQuery, params);

        res.json({
            success: true,
            data: result.rows || []
        });
    } catch (error) {
        console.error('Error searching tamu:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
