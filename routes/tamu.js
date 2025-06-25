const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Get all tamu
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tamu ORDER BY id_tamu ASC');

        res.json({
            success: true,
            data: result.rows || []
        });
    } catch (error) {
        console.error('Error fetching tamu:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search tamu
router.get('/search', async (req, res) => {
    try {
        const { q, nama, email, no_hp } = req.query;
        
        let sqlQuery = 'SELECT * FROM tamu WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        if (q) {
            sqlQuery += ` AND (nama ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR no_hp ILIKE $${paramIndex})`;
            params.push(`%${q}%`);
            paramIndex++;
        } else {
            if (nama) {
                sqlQuery += ` AND nama ILIKE $${paramIndex}`;
                params.push(`%${nama}%`);
                paramIndex++;
            }
            if (email) {
                sqlQuery += ` AND email ILIKE $${paramIndex}`;
                params.push(`%${email}%`);
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
