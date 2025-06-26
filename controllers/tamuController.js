const { pool } = require('../config/database');

// Get all guests
const getAllTamu = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tamu ORDER BY nama');

        res.json({
            message: 'Guests retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get guests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get guest by ID
const getTamuById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT * FROM tamu WHERE id_tamu = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        res.json({
            message: 'Guest retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get guest error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Search guest by email or phone
const searchTamu = async (req, res) => {
    try {
        const { email, no_hp, nama } = req.query;

        let query = 'SELECT * FROM tamu WHERE 1=1';
        let params = [];
        let paramIndex = 1;

        if (email) {
            query += ` AND email ILIKE $${paramIndex}`;
            params.push(`%${email}%`);
            paramIndex++;
        }

        if (no_hp) {
            query += ` AND no_hp ILIKE $${paramIndex}`;
            params.push(`%${no_hp}%`);
            paramIndex++;
        }

        if (nama) {
            query += ` AND nama ILIKE $${paramIndex}`;
            params.push(`%${nama}%`);
            paramIndex++;
        }

        query += ' ORDER BY nama';

        const result = await pool.query(query, params);

        res.json({
            message: 'Search completed successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Search guests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new guest
const createTamu = async (req, res) => {
    try {
        const { nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir } = req.body;

        if (!nama || !email || !no_hp) {
            return res.status(400).json({ error: 'Name, email, and phone number are required' });
        }

        const result = await pool.query(`
            INSERT INTO tamu (nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `, [nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir]);

        res.status(201).json({
            message: 'Guest created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create guest error:', error);
        
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (error.constraint && error.constraint.includes('no_hp')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update guest
const updateTamu = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir } = req.body;

        const result = await pool.query(`
            UPDATE tamu 
            SET nama = $1, email = $2, no_hp = $3, alamat = $4, jenis_kelamin = $5, tgl_lahir = $6 
            WHERE id_tamu = $7 
            RETURNING *
        `, [nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        res.json({
            message: 'Guest updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update guest error:', error);
        
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (error.constraint && error.constraint.includes('no_hp')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete guest
const deleteTamu = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM tamu WHERE id_tamu = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        res.json({ message: 'Guest deleted successfully' });
    } catch (error) {
        console.error('Delete guest error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get guest reservations summary
const getTamuReservationsSummary = async (req, res) => {
    try {
        const { id } = req.params;

        // Get active reservations
        const activeResult = await pool.query(`
            SELECT r.*, k.no_kamar, k.tipe 
            FROM reservasi r
            JOIN kamar k ON r.id_kamar = k.id_kamar
            WHERE r.id_tamu = $1 
            AND r.status_reservasi IN ('Dikonfirmasi', 'Check-In', 'Menunggu Konfirmasi')
            ORDER BY r.tanggal_checkin
        `, [id]);

        // Get past reservations
        const pastResult = await pool.query(`
            SELECT r.*, k.no_kamar, k.tipe 
            FROM reservasi r
            JOIN kamar k ON r.id_kamar = k.id_kamar
            WHERE r.id_tamu = $1 
            AND r.status_reservasi IN ('Check-Out', 'Dibatalkan')
            ORDER BY r.tanggal_checkout DESC
            LIMIT 10
        `, [id]);

        res.json({
            message: 'Reservations summary retrieved successfully',
            data: {
                active_reservations: activeResult.rows,
                past_reservations: pastResult.rows
            }
        });
    } catch (error) {
        console.error('Get reservations summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get guest profile (for authenticated guest)
const getTamuProfile = async (req, res) => {
    try {
        const tamuId = req.user.id; // From JWT middleware

        const result = await pool.query(`
            SELECT id_tamu, nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir 
            FROM tamu 
            WHERE id_tamu = $1
        `, [tamuId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({
            message: 'Profile retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update guest profile (for authenticated guest)
const updateTamuProfile = async (req, res) => {
    try {
        const tamuId = req.user.id; // From JWT middleware
        const { nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir } = req.body;

        const result = await pool.query(`
            UPDATE tamu 
            SET nama = $1, email = $2, no_hp = $3, alamat = $4, jenis_kelamin = $5, tgl_lahir = $6 
            WHERE id_tamu = $7 
            RETURNING *
        `, [nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir, tamuId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Get updated profile without sensitive data
        const updatedResult = await pool.query(`
            SELECT id_tamu, nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir 
            FROM tamu 
            WHERE id_tamu = $1
        `, [tamuId]);

        res.json({
            message: 'Profile updated successfully',
            data: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (error.constraint && error.constraint.includes('no_hp')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all guests with pagination and search (for admin)
const getAllTamuForAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT t.*, 
                   COUNT(r.id_reservasi) as total_reservations,
                   MAX(r.tanggal_reservasi) as last_reservation_date
            FROM tamu t
            LEFT JOIN reservasi r ON t.id_tamu = r.id_tamu
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (t.nama ILIKE $${paramIndex} OR t.email ILIKE $${paramIndex} OR t.no_hp ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` GROUP BY t.id_tamu ORDER BY t.nama LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM tamu WHERE 1=1';
        let countParams = [];
        
        if (search) {
            countQuery += ' AND (nama ILIKE $1 OR email ILIKE $1 OR no_hp ILIKE $1)';
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            message: 'Guests retrieved successfully',
            data: result.rows,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total: totalCount,
                total_pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get all guests for admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get guest by ID with reservations (for admin)
const getTamuByIdForAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT * FROM tamu WHERE id_tamu = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        res.json({
            message: 'Guest retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get guest by ID for admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get reservations summary for a guest (for admin)
const getReservationsSummary = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                r.*,
                k.no_kamar,
                k.tipe,
                k.harga,
                p.status_pembayaran,
                p.jumlah_bayar,
                p.metode_pembayaran
            FROM reservasi r
            JOIN kamar k ON r.id_kamar = k.id_kamar
            LEFT JOIN pembayaran p ON r.id_reservasi = p.id_reservasi
            WHERE r.id_tamu = $1
            ORDER BY r.tanggal_reservasi DESC
        `, [id]);

        res.json({
            message: 'Reservations summary retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get reservations summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update guest by admin
const updateTamuByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir } = req.body;

        const result = await pool.query(`
            UPDATE tamu 
            SET nama = $1, email = $2, no_hp = $3, alamat = $4, jenis_kelamin = $5, tgl_lahir = $6 
            WHERE id_tamu = $7 
            RETURNING *
        `, [nama, email, no_hp, alamat, jenis_kelamin, tgl_lahir, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        res.json({
            message: 'Guest updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update guest by admin error:', error);
        
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (error.constraint && error.constraint.includes('no_hp')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete guest by admin
const deleteTamuByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if guest has active reservations
        const activeReservationsResult = await pool.query(`
            SELECT id_reservasi 
            FROM reservasi 
            WHERE id_tamu = $1 
            AND status_reservasi IN ('Dikonfirmasi', 'Check-In', 'Menunggu Konfirmasi')
        `, [id]);

        if (activeReservationsResult.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete guest with active reservations',
                active_reservations: activeReservationsResult.rows.length
            });
        }

        const result = await pool.query('DELETE FROM tamu WHERE id_tamu = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        res.json({ message: 'Guest deleted successfully' });
    } catch (error) {
        console.error('Delete guest by admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllTamu,
    getTamuById,
    searchTamu,
    createTamu,
    updateTamu,
    deleteTamu,
    getTamuReservationsSummary,
    getTamuProfile,
    updateTamuProfile,
    getAllTamuForAdmin,
    getTamuByIdForAdmin,
    getReservationsSummary,
    updateTamuByAdmin,
    deleteTamuByAdmin
};
