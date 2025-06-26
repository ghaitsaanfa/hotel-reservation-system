const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        // Get total kamar
        const totalKamarResult = await pool.query('SELECT COUNT(*) FROM kamar');
        const totalKamar = parseInt(totalKamarResult.rows[0].count);
        
        // Get kamar tersedia
        const kamarTersediaResult = await pool.query("SELECT COUNT(*) FROM kamar WHERE status = 'Tersedia'");
        const kamarTersedia = parseInt(kamarTersediaResult.rows[0].count);
        
        // Get total tamu
        const totalTamuResult = await pool.query('SELECT COUNT(*) FROM tamu');
        const totalTamu = parseInt(totalTamuResult.rows[0].count);
        
        // Get total resepsionis
        const totalResepsionisResult = await pool.query('SELECT COUNT(*) FROM resepsionis');
        const totalResepsionis = parseInt(totalResepsionisResult.rows[0].count);
        
        // Get total reservasi hari ini
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const reservasiHariIniResult = await pool.query(
            'SELECT COUNT(*) FROM reservasi WHERE tanggal_reservasi >= $1 AND tanggal_reservasi < $2',
            [today, tomorrowStr]
        );
        const reservasiHariIni = parseInt(reservasiHariIniResult.rows[0].count);
        
        // Get total reservasi aktif
        const reservasiAktifResult = await pool.query(
            "SELECT COUNT(*) FROM reservasi WHERE status_reservasi IN ('Dikonfirmasi', 'Check-In')"
        );
        const reservasiAktif = parseInt(reservasiAktifResult.rows[0].count);
        
        // Get pendapatan bulan ini
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthStr = nextMonth.toISOString().slice(0, 7);
        
        const pembayaranResult = await pool.query(
            "SELECT SUM(jumlah_bayar) as total FROM pembayaran WHERE status_pembayaran = 'Lunas' AND tanggal_bayar >= $1 AND tanggal_bayar < $2",
            [currentMonth + '-01', nextMonthStr + '-01']
        );
        
        const pendapatanBulan = parseFloat(pembayaranResult.rows[0].total) || 0;
        
        // Get reservasi terbaru
        const reservasiTerbaruResult = await pool.query(`
            SELECT 
                r.*,
                t.nama as nama_tamu,
                k.no_kamar,
                k.tipe
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN kamar k ON r.id_kamar = k.id_kamar
            ORDER BY r.tanggal_reservasi DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                totalKamar: totalKamar,
                kamarTersedia: kamarTersedia,
                totalTamu: totalTamu,
                totalResepsionis: totalResepsionis,
                reservasiHariIni: reservasiHariIni,
                reservasiAktif: reservasiAktif,
                pendapatanBulan: pendapatanBulan,
                reservasiTerbaru: reservasiTerbaruResult.rows
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

// Login admin
const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const result = await pool.query('SELECT * FROM admin WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, admin.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id_admin, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'hotel-reservation-secret-key-2024',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            admin: {
                id: admin.id_admin,
                nama: admin.nama,
                username: admin.username
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Register admin baru
const registerAdmin = async (req, res) => {
    try {
        const { nama, username, password } = req.body;

        if (!nama || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO admin (nama, username, password) VALUES ($1, $2, $3) RETURNING id_admin',
            [nama, username, hashedPassword]
        );

        res.status(201).json({
            message: 'Admin registered successfully',
            id: result.rows[0].id_admin
        });
    } catch (error) {
        console.error('Register error:', error);
        
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all admins
const getAllAdmins = async (req, res) => {
    try {
        const result = await pool.query('SELECT id_admin, nama, username FROM admin ORDER BY nama');

        res.json({
            message: 'Admins retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update admin
const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, username, password } = req.body;

        let query = 'UPDATE admin SET nama = $1, username = $2';
        let params = [nama, username];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = $3 WHERE id_admin = $4 RETURNING *';
            params.push(hashedPassword, id);
        } else {
            query += ' WHERE id_admin = $3 RETURNING *';
            params.push(id);
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        res.json({ message: 'Admin updated successfully' });
    } catch (error) {
        console.error('Update admin error:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete admin
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM admin WHERE id_admin = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDashboardStats,
    loginAdmin,
    registerAdmin,
    getAllAdmins,
    updateAdmin,
    deleteAdmin
};
