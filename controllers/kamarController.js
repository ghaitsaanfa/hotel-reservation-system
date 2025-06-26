const { pool } = require('../config/database');

/*
 * ROOM AVAILABILITY LOGIC FIX
 * 
 * The room availability check has been corrected to properly handle room bookings.
 * A room is available for booking if there are no overlapping reservations.
 * 
 * Two reservations overlap if: (start1 < end2) AND (start2 < end1)
 * This means guests can book back-to-back reservations where:
 * - Check-out date of existing reservation = Check-in date of new reservation (allowed)
 * - Check-in date of existing reservation = Check-out date of new reservation (allowed)
 * 
 * Only reservations with status 'Dikonfirmasi' or 'Check-In' are considered
 * for availability checking.
 */

// Get all rooms with status from database
const getAllKamar = async (req, res) => {
    try {
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

        // Get additional info for occupied/reserved rooms
        const roomsWithInfo = await Promise.all(result.rows.map(async (room) => {
            // Check for current guest if room is occupied
            if (room.status === 'Ditempati') {
                const currentGuestResult = await pool.query(`
                    SELECT 
                        r.tanggal_checkin,
                        r.tanggal_checkout,
                        t.nama
                    FROM reservasi r
                    JOIN tamu t ON r.id_tamu = t.id_tamu
                    WHERE r.id_kamar = $1 
                    AND r.status_reservasi = 'Check-In'
                    AND r.tanggal_checkout >= CURRENT_DATE
                    AND r.tanggal_checkin <= CURRENT_DATE
                    LIMIT 1
                `, [room.id_kamar]);

                if (currentGuestResult.rows.length > 0) {
                    const guest = currentGuestResult.rows[0];
                    room.tamu_info = `${guest.nama} (${new Date(guest.tanggal_checkin).toLocaleDateString()} - ${new Date(guest.tanggal_checkout).toLocaleDateString()})`;
                }
            }

            // Check for future reservations if room is booked
            if (room.status === 'Dipesan') {
                const futureReservationResult = await pool.query(`
                    SELECT tanggal_checkin, tanggal_checkout
                    FROM reservasi
                    WHERE id_kamar = $1
                    AND status_reservasi IN ('Dikonfirmasi', 'Menunggu Konfirmasi')
                    AND tanggal_checkin > CURRENT_DATE
                    ORDER BY tanggal_checkin
                    LIMIT 1
                `, [room.id_kamar]);

                if (futureReservationResult.rows.length > 0) {
                    const reservation = futureReservationResult.rows[0];
                    room.reservasi_info = `Reservasi: ${new Date(reservation.tanggal_checkin).toLocaleDateString()} - ${new Date(reservation.tanggal_checkout).toLocaleDateString()}`;
                }
            }

            return room;
        }));

        console.log(`Retrieved ${result.rows.length} rooms`);

        res.json({
            message: 'Rooms retrieved successfully',
            data: roomsWithInfo
        });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Get available rooms
const getAvailableKamar = async (req, res) => {
    try {
        const { checkin, checkout, tipe } = req.query;

        let query = 'SELECT * FROM kamar WHERE status = $1';
        let params = ['Tersedia'];

        // Filter by room type if specified
        if (tipe) {
            query += ' AND tipe = $2';
            params.push(tipe);
        }

        if (checkin && checkout) {
            // Get conflicting reservations
            const conflictResult = await pool.query(`
                SELECT id_kamar 
                FROM reservasi 
                WHERE status_reservasi IN ('Dikonfirmasi', 'Check-In')
                AND tanggal_checkin < $1
                AND tanggal_checkout > $2
            `, [checkout, checkin]);

            const conflictingRoomIds = conflictResult.rows.map(r => r.id_kamar);
            
            if (conflictingRoomIds.length > 0) {
                query += ` AND id_kamar NOT IN (${conflictingRoomIds.map((_, i) => `$${params.length + 1 + i}`).join(',')})`;
                params.push(...conflictingRoomIds);
            }
        }

        query += ' ORDER BY no_kamar';

        const result = await pool.query(query, params);

        res.json({
            message: 'Available rooms retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get available rooms error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Get room by ID
const getKamarById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('SELECT * FROM kamar WHERE id_kamar = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({
            message: 'Room retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get room by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new room
const createKamar = async (req, res) => {
    try {
        const { no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks } = req.body;

        // Validate required fields
        if (!no_kamar || !tipe || !harga || !status || !deskripsi_kamar || !kapasitas_maks) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if room number already exists
        const existingResult = await pool.query('SELECT id_kamar FROM kamar WHERE no_kamar = $1', [no_kamar]);

        if (existingResult.rows.length > 0) {
            return res.status(400).json({ error: 'Room number already exists' });
        }

        const result = await pool.query(`
            INSERT INTO kamar (no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `, [no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks]);

        res.status(201).json({
            message: 'Room created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create room error:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Room number already exists' });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update room
const updateKamar = async (req, res) => {
    try {
        const { id } = req.params;
        const { no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks } = req.body;

        // Validate required fields
        if (!no_kamar || !tipe || !harga || !status || !deskripsi_kamar || !kapasitas_maks) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if room exists
        const existingResult = await pool.query('SELECT id_kamar FROM kamar WHERE id_kamar = $1', [id]);

        if (!existingResult.rows || existingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Check if room number is taken by another room
        const duplicateResult = await pool.query(
            'SELECT id_kamar FROM kamar WHERE no_kamar = $1 AND id_kamar != $2',
            [no_kamar, id]
        );

        if (duplicateResult.rows && duplicateResult.rows.length > 0) {
            return res.status(400).json({ error: 'Room number already exists' });
        }

        const result = await pool.query(`
            UPDATE kamar 
            SET no_kamar = $1, tipe = $2, harga = $3, status = $4, deskripsi_kamar = $5, kapasitas_maks = $6
            WHERE id_kamar = $7 
            RETURNING *
        `, [no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks, id]);

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({
            message: 'Room updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update room error:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Room number already exists' });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete room
const deleteKamar = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if room has active reservations
        const activeReservationsResult = await pool.query(`
            SELECT id_reservasi 
            FROM reservasi 
            WHERE id_kamar = $1 
            AND status_reservasi IN ('Dikonfirmasi', 'Check-In', 'Menunggu Konfirmasi')
        `, [id]);

        if (activeReservationsResult.rows && activeReservationsResult.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete room with active reservations' });
        }

        const result = await pool.query('DELETE FROM kamar WHERE id_kamar = $1 RETURNING *', [id]);

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get available room types with counts for date range
const getAvailableRoomTypes = async (req, res) => {
    try {
        const { checkin, checkout } = req.query;

        if (!checkin || !checkout) {
            return res.status(400).json({ error: 'Check-in and check-out dates are required' });
        }

        // Validate dates
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkinDate < today) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }

        if (checkoutDate <= checkinDate) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date' });
        }

        // Get all rooms
        const allRoomsResult = await pool.query('SELECT * FROM kamar WHERE status = $1', ['Tersedia']);

        // Get conflicting reservations
        const conflictsResult = await pool.query(`
            SELECT id_kamar 
            FROM reservasi 
            WHERE status_reservasi IN ('Dikonfirmasi', 'Check-In')
            AND tanggal_checkin < $1
            AND tanggal_checkout > $2
        `, [checkout, checkin]);

        const conflictingRoomIds = conflictsResult.rows.map(r => r.id_kamar);

        // Group by room type and calculate availability
        const roomTypeMap = {};
        allRoomsResult.rows.forEach(room => {
            if (!roomTypeMap[room.tipe]) {
                roomTypeMap[room.tipe] = {
                    tipe: room.tipe,
                    harga: room.harga,
                    total_rooms: 0,
                    available_count: 0,
                    kapasitas_maks: room.kapasitas_maks,
                    deskripsi_kamar: room.deskripsi_kamar
                };
            }
            roomTypeMap[room.tipe].total_rooms++;
            if (!conflictingRoomIds.includes(room.id_kamar)) {
                roomTypeMap[room.tipe].available_count++;
            }
        });

        const availableTypes = Object.values(roomTypeMap)
            .filter(type => type.available_count > 0)
            .sort((a, b) => a.harga - b.harga);

        res.json({
            message: 'Available room types retrieved successfully',
            data: availableTypes,
            checkin,
            checkout
        });
    } catch (error) {
        console.error('Get available room types error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Auto-update room status based on reservations
const autoUpdateKamarStatus = async () => {
    try {
        console.log('Running auto-update room status...');
        
        const today = new Date().toISOString().split('T')[0];

        // Get rooms that should be 'Ditempati' (checked-in guests)
        const occupiedRoomsResult = await pool.query(`
            SELECT DISTINCT id_kamar 
            FROM reservasi 
            WHERE status_reservasi = 'Check-In'
            AND tanggal_checkin <= $1
            AND tanggal_checkout >= $1
        `, [today]);

        // Get rooms that should be 'Dipesan' (confirmed future reservations)
        const bookedRoomsResult = await pool.query(`
            SELECT DISTINCT id_kamar 
            FROM reservasi 
            WHERE status_reservasi IN ('Dikonfirmasi', 'Menunggu Konfirmasi')
            AND tanggal_checkin > $1
        `, [today]);

        // Update occupied rooms
        if (occupiedRoomsResult.rows.length > 0) {
            const occupiedRoomIds = occupiedRoomsResult.rows.map(r => r.id_kamar);
            await pool.query(
                `UPDATE kamar SET status = 'Ditempati' WHERE id_kamar = ANY($1) AND status != 'Ditempati'`,
                [occupiedRoomIds]
            );
        }

        // Update booked rooms
        if (bookedRoomsResult.rows.length > 0) {
            const bookedRoomIds = bookedRoomsResult.rows.map(r => r.id_kamar);
            await pool.query(
                `UPDATE kamar SET status = 'Dipesan' WHERE id_kamar = ANY($1) AND status NOT IN ('Ditempati', 'Maintenance')`,
                [bookedRoomIds]
            );
        }

        // Update available rooms (rooms without active/future reservations)
        const allActiveRoomsResult = await pool.query(`
            SELECT DISTINCT id_kamar 
            FROM reservasi 
            WHERE (
                status_reservasi = 'Check-In' 
                AND tanggal_checkin <= $1 
                AND tanggal_checkout >= $1
            ) OR (
                status_reservasi IN ('Dikonfirmasi', 'Menunggu Konfirmasi') 
                AND tanggal_checkin > $1
            )
        `, [today]);

        const activeRoomIds = allActiveRoomsResult.rows.map(r => r.id_kamar);

        if (activeRoomIds.length > 0) {
            await pool.query(
                `UPDATE kamar SET status = 'Tersedia' WHERE status IN ('Dipesan', 'Ditempati') AND id_kamar != ALL($1)`,
                [activeRoomIds]
            );
        } else {
            await pool.query(`UPDATE kamar SET status = 'Tersedia' WHERE status IN ('Dipesan', 'Ditempati')`);
        }
        
        console.log('Auto-update room status completed');
        
    } catch (error) {
        console.error('Error in auto-update room status:', error);
    }
};

// Update room status only
const updateKamarStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate required fields
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Validate status values
        const validStatuses = ['Tersedia', 'Ditempati', 'Dipesan', 'Maintenance', 'Tidak Tersedia'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
            });
        }

        // Check if room exists and get current status
        const existingResult = await pool.query('SELECT id_kamar, status FROM kamar WHERE id_kamar = $1', [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const existing = existingResult.rows[0];

        // Update room status
        const result = await pool.query(
            'UPDATE kamar SET status = $1 WHERE id_kamar = $2 RETURNING *',
            [status, id]
        );

        res.json({
            message: 'Room status updated successfully',
            data: {
                id_kamar: id,
                status: status,
                previous_status: existing.status
            }
        });
    } catch (error) {
        console.error('Update room status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllKamar,
    getAvailableKamar,
    getAvailableRoomTypes,
    getKamarById,
    createKamar,
    updateKamar,
    updateKamarStatus,
    deleteKamar,
    autoUpdateKamarStatus
};
