const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login resepsionis
const loginResepsionis = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const result = await pool.query('SELECT * FROM resepsionis WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const resepsionis = result.rows[0];

        const isValidPassword = await bcrypt.compare(password, resepsionis.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: resepsionis.id_resepsionis, username: resepsionis.username, role: 'resepsionis' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            resepsionis: {
                id: resepsionis.id_resepsionis,
                nama: resepsionis.nama,
                username: resepsionis.username,
                email: resepsionis.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all resepsionis
const getAllResepsionis = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id_resepsionis, nama, no_hp, email, username 
            FROM resepsionis 
            ORDER BY nama
        `);

        res.json({
            message: 'Resepsionis retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get resepsionis by ID
const getResepsionisById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT id_resepsionis, nama, no_hp, email, username 
            FROM resepsionis 
            WHERE id_resepsionis = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resepsionis not found' });
        }

        res.json({
            message: 'Resepsionis retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new resepsionis
const createResepsionis = async (req, res) => {
    try {
        const { nama, no_hp, email, username, password } = req.body;

        if (!nama || !username || !password) {
            return res.status(400).json({ error: 'Name, username, and password are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(`
            INSERT INTO resepsionis (nama, no_hp, email, username, password) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id_resepsionis
        `, [nama, no_hp, email, username, hashedPassword]);

        res.status(201).json({
            message: 'Resepsionis created successfully',
            id: result.rows[0].id_resepsionis
        });
    } catch (error) {
        console.error('Create resepsionis error:', error);
        
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update resepsionis
const updateResepsionis = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, no_hp, email, username, password } = req.body;

        let updateQuery;
        let params;
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery = `
                UPDATE resepsionis 
                SET nama = $1, no_hp = $2, email = $3, username = $4, password = $5 
                WHERE id_resepsionis = $6 
                RETURNING id_resepsionis
            `;
            params = [nama, no_hp, email, username, hashedPassword, id];
        } else {
            updateQuery = `
                UPDATE resepsionis 
                SET nama = $1, no_hp = $2, email = $3, username = $4 
                WHERE id_resepsionis = $5 
                RETURNING id_resepsionis
            `;
            params = [nama, no_hp, email, username, id];
        }

        const result = await pool.query(updateQuery, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resepsionis not found' });
        }

        res.json({ message: 'Resepsionis updated successfully' });
    } catch (error) {
        console.error('Update resepsionis error:', error);
        
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete resepsionis
const deleteResepsionis = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM resepsionis WHERE id_resepsionis = $1 RETURNING id_resepsionis', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resepsionis not found' });
        }

        res.json({ message: 'Resepsionis deleted successfully' });
    } catch (error) {
        console.error('Delete resepsionis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get dashboard statistics for receptionist
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get room statistics
        const roomResult = await pool.query('SELECT status FROM kamar');

        const roomStats = {
            total_rooms: roomResult.rows.length,
            available_rooms: roomResult.rows.filter(r => r.status === 'Tersedia').length,
            occupied_rooms: roomResult.rows.filter(r => r.status === 'Ditempati').length,
            maintenance_rooms: roomResult.rows.filter(r => r.status === 'Maintenance').length
        };

        // Get reservation statistics for today
        const reservationResult = await pool.query(`
            SELECT tanggal_checkin, tanggal_checkout, tanggal_reservasi, status_reservasi 
            FROM reservasi
        `);

        const allReservations = reservationResult.rows;
        const reservationStats = {
            checkins_today: allReservations.filter(r => 
                r.tanggal_checkin === today && r.status_reservasi === 'Dikonfirmasi'
            ).length,
            checkouts_today: allReservations.filter(r => 
                r.tanggal_checkout === today && r.status_reservasi === 'Check-In'
            ).length,
            new_reservations_24h: allReservations.filter(r => 
                r.tanggal_reservasi === today
            ).length,
            pending_confirmations: allReservations.filter(r => 
                r.status_reservasi === 'Menunggu Konfirmasi'
            ).length
        };

        // Get recent activities (reservations)
        const recentReservationsResult = await pool.query(`
            SELECT 
                r.id_reservasi,
                r.status_reservasi,
                r.tanggal_reservasi,
                r.tanggal_checkin,
                r.tanggal_checkout,
                t.nama as tamu_nama,
                k.no_kamar,
                k.tipe as kamar_tipe
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN kamar k ON r.id_kamar = k.id_kamar
            ORDER BY r.tanggal_reservasi DESC
            LIMIT 10
        `);

        const recentPaymentsResult = await pool.query(`
            SELECT 
                p.id_pembayaran,
                p.status_pembayaran,
                p.tanggal_bayar,
                p.metode_pembayaran,
                p.jumlah_bayar,
                r.id_reservasi,
                t.nama as tamu_nama
            FROM pembayaran p
            JOIN reservasi r ON p.id_reservasi = r.id_reservasi
            JOIN tamu t ON r.id_tamu = t.id_tamu
            ORDER BY p.tanggal_bayar DESC
            LIMIT 5
        `);

        res.json({
            message: 'Dashboard statistics retrieved successfully',
            data: {
                rooms: roomStats,
                reservations: reservationStats,
                recent_reservations: recentReservationsResult.rows.map(r => ({
                    id_reservasi: r.id_reservasi,
                    status_reservasi: r.status_reservasi,
                    tanggal_reservasi: r.tanggal_reservasi,
                    tanggal_checkin: r.tanggal_checkin,
                    tanggal_checkout: r.tanggal_checkout,
                    nama_tamu: r.tamu_nama,
                    no_kamar: r.no_kamar,
                    tipe_kamar: r.kamar_tipe
                })),
                recent_payments: recentPaymentsResult.rows.map(p => ({
                    id_pembayaran: p.id_pembayaran,
                    status_pembayaran: p.status_pembayaran,
                    tanggal_bayar: p.tanggal_bayar,
                    metode_pembayaran: p.metode_pembayaran,
                    jumlah_bayar: p.jumlah_bayar,
                    id_reservasi: p.id_reservasi,
                    nama_tamu: p.tamu_nama
                }))
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
};

// Get all rooms with their status and occupancy details
const getAllRooms = async (req, res) => {
    try {
        const { search, type, status, floor } = req.query;

        let query = `
            SELECT 
                id_kamar,
                no_kamar,
                tipe,
                harga,
                status,
                deskripsi_kamar,
                kapasitas_maks
            FROM kamar
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        // Apply filters
        if (search) {
            query += ` AND (no_kamar ILIKE $${paramIndex} OR tipe ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (type && type !== 'all') {
            query += ` AND tipe = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (status && status !== 'all') {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY no_kamar`;

        const roomsResult = await pool.query(query, params);

        // Get reservation data for each room
        const roomsWithReservations = await Promise.all(roomsResult.rows.map(async (room) => {
            const reservationResult = await pool.query(`
                SELECT 
                    r.id_reservasi,
                    r.tanggal_checkin,
                    r.tanggal_checkout,
                    r.status_reservasi,
                    t.nama as tamu_nama,
                    t.no_hp as tamu_no_hp
                FROM reservasi r
                JOIN tamu t ON r.id_tamu = t.id_tamu
                WHERE r.id_kamar = $1
                AND r.status_reservasi IN ('Check-In', 'Dikonfirmasi')
                AND r.tanggal_checkout >= CURRENT_DATE
                ORDER BY r.tanggal_checkin
                LIMIT 1
            `, [room.id_kamar]);

            const reservation = reservationResult.rows[0] || null;

            let status_aktual = room.status;
            if (reservation) {
                if (reservation.status_reservasi === 'Check-In') {
                    status_aktual = 'Terisi';
                } else if (reservation.status_reservasi === 'Dikonfirmasi') {
                    const today = new Date().toISOString().split('T')[0];
                    if (reservation.tanggal_checkin === today) {
                        status_aktual = 'Siap Check-in';
                    } else {
                        status_aktual = 'Dipesan';
                    }
                }
            }

            return {
                ...room,
                status_aktual,
                id_reservasi: reservation?.id_reservasi,
                tanggal_checkin: reservation?.tanggal_checkin,
                tanggal_checkout: reservation?.tanggal_checkout,
                nama_tamu: reservation?.tamu_nama,
                no_hp_tamu: reservation?.tamu_no_hp
            };
        }));

        res.json({
            message: 'Rooms retrieved successfully',
            data: roomsWithReservations
        });
    } catch (error) {
        console.error('Get all rooms error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
};

// Update room status
const updateRoomStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const validStatuses = ['Tersedia', 'Ditempati', 'Dipesan', 'Maintenance', 'Tidak Tersedia'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
            });
        }

        const result = await pool.query(
            'UPDATE kamar SET status = $1 WHERE id_kamar = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({
            message: 'Room status updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update room status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Check-in guest
const checkInGuest = async (req, res) => {
    try {
        const { reservationId } = req.params;
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Get reservation details
            const reservationResult = await client.query(`
                SELECT r.*, k.no_kamar, k.status as room_status
                FROM reservasi r
                JOIN kamar k ON r.id_kamar = k.id_kamar
                WHERE r.id_reservasi = $1
            `, [reservationId]);

            if (reservationResult.rows.length === 0) {
                return res.status(404).json({ error: 'Reservation not found' });
            }

            const reservation = reservationResult.rows[0];

            if (reservation.status_reservasi !== 'Dikonfirmasi') {
                return res.status(400).json({ error: 'Reservation is not confirmed' });
            }

            // Update reservation status to Check-In
            await client.query(
                'UPDATE reservasi SET status_reservasi = $1 WHERE id_reservasi = $2',
                ['Check-In', reservationId]
            );

            // Update room status to Ditempati
            await client.query(
                'UPDATE kamar SET status = $1 WHERE id_kamar = $2',
                ['Ditempati', reservation.id_kamar]
            );

            await client.query('COMMIT');

            res.json({
                message: 'Guest checked in successfully',
                data: {
                    id_reservasi: reservationId,
                    no_kamar: reservation.no_kamar,
                    status: 'Check-In'
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Check-out guest
const checkOutGuest = async (req, res) => {
    try {
        const { reservationId } = req.params;
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Get reservation details
            const reservationResult = await client.query(`
                SELECT r.*, k.no_kamar
                FROM reservasi r
                JOIN kamar k ON r.id_kamar = k.id_kamar
                WHERE r.id_reservasi = $1
            `, [reservationId]);

            if (reservationResult.rows.length === 0) {
                return res.status(404).json({ error: 'Reservation not found' });
            }

            const reservation = reservationResult.rows[0];

            if (reservation.status_reservasi !== 'Check-In') {
                return res.status(400).json({ error: 'Guest is not checked in' });
            }

            // Update reservation status to Check-Out
            await client.query(
                'UPDATE reservasi SET status_reservasi = $1 WHERE id_reservasi = $2',
                ['Check-Out', reservationId]
            );

            // Update room status to Tersedia
            await client.query(
                'UPDATE kamar SET status = $1 WHERE id_kamar = $2',
                ['Tersedia', reservation.id_kamar]
            );

            await client.query('COMMIT');

            res.json({
                message: 'Guest checked out successfully',
                data: {
                    id_reservasi: reservationId,
                    no_kamar: reservation.no_kamar,
                    status: 'Check-Out'
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    loginResepsionis,
    getAllResepsionis,
    getResepsionisById,
    createResepsionis,
    updateResepsionis,
    deleteResepsionis,
    getDashboardStats,
    getAllRooms,
    updateRoomStatus,
    checkInGuest,
    checkOutGuest
};
