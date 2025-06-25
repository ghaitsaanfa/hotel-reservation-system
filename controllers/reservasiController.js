const pool = require('../config/database');

// Helper function to safely parse date strings without timezone issues
function parseLocalDate(dateInput) {
    if (!dateInput) return null;
    
    // If it's already a Date object, return it
    if (dateInput instanceof Date) {
        return dateInput;
    }
    
    // If it's not a string, try to convert it to string first
    if (typeof dateInput !== 'string') {
        try {
            // Handle cases where dateInput might be a number (timestamp) or other types
            if (typeof dateInput === 'number') {
                return new Date(dateInput);
            }
            dateInput = String(dateInput);
        } catch (e) {
            console.error('Cannot convert date input to string:', dateInput, typeof dateInput);
            return null;
        }
    }
    
    try {
        // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss' formats
        const dateOnly = dateInput.split('T')[0];
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            console.error('Invalid date format:', dateOnly);
            return null;
        }
        
        const [year, month, day] = dateOnly.split('-').map(num => parseInt(num, 10));
        
        // Validate parsed values
        if (isNaN(year) || isNaN(month) || isNaN(day) || 
            year < 1900 || year > 2100 || 
            month < 1 || month > 12 || 
            day < 1 || day > 31) {
            console.error('Invalid date values:', { year, month, day });
            return null;
        }
        
        return new Date(year, month - 1, day);
    } catch (error) {
        console.error('Error parsing date:', dateInput, error);
        return null;
    }
}

// Get all reservations
const getAllReservasi = async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.*,
                t.nama as tamu_nama,
                t.no_hp as tamu_no_hp,
                t.email as tamu_email,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga,
                res.nama as resepsionis_nama,
                p.jumlah_bayar,
                p.status_pembayaran
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            LEFT JOIN kamar k ON r.id_kamar = k.id_kamar
            LEFT JOIN resepsionis res ON r.id_resepsionis = res.id_resepsionis
            LEFT JOIN pembayaran p ON r.id_reservasi = p.id_reservasi
            ORDER BY r.tanggal_reservasi DESC
        `);

        // Process the data to match expected format
        const processedRows = result.rows.map(row => ({
            ...row,
            nama_tamu: row.tamu_nama,
            no_hp_tamu: row.tamu_no_hp,
            email_tamu: row.tamu_email,
            no_kamar: row.no_kamar,
            tipe_kamar: row.kamar_tipe,
            harga: row.kamar_harga || 0,
            nama_resepsionis: row.resepsionis_nama,
            total_tagihan: row.jumlah_bayar || 
                          (row.kamar_harga ? 
                           Math.ceil((new Date(row.tanggal_checkout) - new Date(row.tanggal_checkin)) / (1000 * 60 * 60 * 24)) * row.kamar_harga * 1.1 : 0),
            status_pembayaran: row.status_pembayaran || 'Belum Lunas',
            no_kamar_assigned: ['Dikonfirmasi', 'Check-In', 'Check-Out'].includes(row.status_reservasi) ? row.no_kamar : null
        }));

        res.json({
            message: 'Reservations retrieved successfully',
            data: processedRows
        });

        // Debug: Log first reservation
        if (processedRows.length > 0) {
            console.log('Sample reservation data:', {
                id: processedRows[0].id_reservasi,
                checkin: processedRows[0].tanggal_checkin,
                checkout: processedRows[0].tanggal_checkout,
                tipe_kamar: processedRows[0].tipe_kamar
            });
        }
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ error: 'Internal server error', debug: error.message || error });
    }
};

// Get reservation by ID
const getReservasiById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                r.*,
                t.nama as tamu_nama,
                t.alamat as tamu_alamat,
                t.no_hp as tamu_no_hp,
                t.email as tamu_email,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga,
                res.nama as resepsionis_nama,
                p.id_pembayaran,
                p.jumlah_bayar,
                p.metode_pembayaran,
                p.status_pembayaran
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            LEFT JOIN kamar k ON r.id_kamar = k.id_kamar
            LEFT JOIN resepsionis res ON r.id_resepsionis = res.id_resepsionis
            LEFT JOIN pembayaran p ON r.id_reservasi = p.id_reservasi
            WHERE r.id_reservasi = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        const reservation = result.rows[0];

        // Calculate total with PPN
        const checkinDate = parseLocalDate(reservation.tanggal_checkin);
        const checkoutDate = parseLocalDate(reservation.tanggal_checkout);
        
        let durasi_menginap = 1;
        if (checkinDate && checkoutDate) {
            const diffTime = Math.abs(checkoutDate - checkinDate);
            durasi_menginap = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (durasi_menginap <= 0) durasi_menginap = 1;
        }
        
        const harga = parseFloat(reservation.kamar_harga) || 0;
        const subtotal = harga * durasi_menginap;
        const ppn = subtotal * 0.10;
        const total_biaya = subtotal + ppn;
        
        const enrichedReservation = {
            ...reservation,
            nama_tamu: reservation.tamu_nama,
            alamat: reservation.tamu_alamat,
            no_hp_tamu: reservation.tamu_no_hp,
            email_tamu: reservation.tamu_email,
            no_kamar: reservation.no_kamar,
            tipe_kamar: reservation.kamar_tipe,
            harga: reservation.kamar_harga,
            nama_resepsionis: reservation.resepsionis_nama,
            id_pembayaran: reservation.id_pembayaran,
            jumlah_bayar: reservation.jumlah_bayar,
            metode_pembayaran: reservation.metode_pembayaran,
            status_pembayaran: reservation.status_pembayaran,
            durasi_menginap,
            subtotal,
            ppn,
            total_biaya
        };

        res.json({
            message: 'Reservation retrieved successfully',
            data: enrichedReservation
        });
    } catch (error) {
        console.error('Get reservation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new reservation
const createReservasi = async (req, res) => {
    try {
        const { id_tamu, id_kamar, tanggal_checkin, tanggal_checkout, jumlah_tamu, id_resepsionis } = req.body;

        if (!id_tamu || !id_kamar || !tanggal_checkin || !tanggal_checkout) {
            return res.status(400).json({ error: 'Guest, room, check-in and check-out dates are required' });
        }

        // Validate dates
        const checkinDate = parseLocalDate(tanggal_checkin);
        const checkoutDate = parseLocalDate(tanggal_checkout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkinDate < today) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }

        if (checkoutDate <= checkinDate) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date' });
        }

        // Check if room exists and is available
        const roomResult = await pool.query('SELECT * FROM kamar WHERE id_kamar = $1', [id_kamar]);

        if (roomResult.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const roomData = roomResult.rows[0];

        if (roomData.status !== 'Tersedia') {
            return res.status(400).json({ error: 'Room is not available' });
        }

        // Check room capacity
        if (jumlah_tamu > roomData.kapasitas_maks) {
            return res.status(400).json({ error: 'Number of guests exceeds room capacity' });
        }

        // Check if room is available for selected dates
        const conflictsResult = await pool.query(`
            SELECT id_reservasi 
            FROM reservasi 
            WHERE id_kamar = $1 
            AND status_reservasi IN ('Dikonfirmasi', 'Check-In')
            AND tanggal_checkin < $2
            AND tanggal_checkout > $3
        `, [id_kamar, tanggal_checkout, tanggal_checkin]);

        if (conflictsResult.rows.length > 0) {
            return res.status(400).json({ error: 'Room is not available for selected dates' });
        }

        // Create reservation
        const newReservationResult = await pool.query(`
            INSERT INTO reservasi (
                id_tamu, 
                id_kamar, 
                tanggal_checkin, 
                tanggal_checkout, 
                jumlah_tamu, 
                id_resepsionis, 
                status_reservasi
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `, [id_tamu, id_kamar, tanggal_checkin, tanggal_checkout, jumlah_tamu || 1, id_resepsionis || null, 'Belum Bayar']);

        // Get full reservation data with joins
        const fullReservationResult = await pool.query(`
            SELECT 
                r.*,
                t.nama as tamu_nama,
                t.email as tamu_email,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN kamar k ON r.id_kamar = k.id_kamar
            WHERE r.id_reservasi = $1
        `, [newReservationResult.rows[0].id_reservasi]);

        const newReservation = fullReservationResult.rows[0];

        const responseData = {
            ...newReservation,
            nama_tamu: newReservation.tamu_nama,
            email_tamu: newReservation.tamu_email,
            no_kamar: newReservation.no_kamar,
            tipe_kamar: newReservation.kamar_tipe,
            harga: newReservation.kamar_harga
        };

        res.status(201).json({
            message: 'Reservation created successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Create reservation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new reservation with automatic room assignment
const createReservasiWithAutoAssignment = async (req, res) => {
    try {
        console.log('createReservasiWithAutoAssignment: Received data:', req.body);
        
        const { 
            id_tamu, 
            tipe_kamar, 
            tanggal_checkin, 
            tanggal_checkout, 
            jumlah_dewasa = 2, 
            jumlah_anak = 0,
            total_biaya,
            nama_tamu,
            email_tamu,
            telepon_tamu,
            permintaan_khusus,
            status_reservasi = 'Belum Bayar'
        } = req.body;

        console.log('Extracted values:', { id_tamu, tipe_kamar, tanggal_checkin, tanggal_checkout });

        // Improved validation with specific error messages
        if (!id_tamu) {
            return res.status(400).json({ error: 'ID tamu diperlukan' });
        }
        if (!tipe_kamar) {
            return res.status(400).json({ error: 'Tipe kamar harus dipilih' });
        }
        if (!tanggal_checkin) {
            return res.status(400).json({ error: 'Tanggal check-in harus diisi' });
        }
        if (!tanggal_checkout) {
            return res.status(400).json({ error: 'Tanggal check-out harus diisi' });
        }

        // Validate dates
        const checkinDate = parseLocalDate(tanggal_checkin);
        const checkoutDate = parseLocalDate(tanggal_checkout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkinDate < today) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }

        if (checkoutDate <= checkinDate) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date' });
        }

        // Find available room of the specified type
        const availableRoomsResult = await pool.query(`
            SELECT id_kamar, no_kamar, tipe, kapasitas_maks
            FROM kamar 
            WHERE tipe = $1 
            AND status = 'Tersedia'
            ORDER BY no_kamar
            LIMIT 1
        `, [tipe_kamar]);

        if (availableRoomsResult.rows.length === 0) {
            return res.status(400).json({ error: `No available ${tipe_kamar} rooms for selected dates` });
        }

        const selectedRoom = availableRoomsResult.rows[0];
        const totalGuests = parseInt(jumlah_dewasa) + parseInt(jumlah_anak);

        // Check room capacity
        if (totalGuests > selectedRoom.kapasitas_maks) {
            return res.status(400).json({ error: 'Number of guests exceeds room capacity' });
        }

        // Create reservation
        const newReservationResult = await pool.query(`
            INSERT INTO reservasi (
                id_tamu, 
                id_kamar, 
                tanggal_checkin, 
                tanggal_checkout, 
                jumlah_tamu, 
                status_reservasi
            ) VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `, [id_tamu, selectedRoom.id_kamar, tanggal_checkin, tanggal_checkout, totalGuests, 'Belum Bayar']);

        // Get full reservation data with joins
        const fullReservationResult = await pool.query(`
            SELECT 
                r.*,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga
            FROM reservasi r
            JOIN kamar k ON r.id_kamar = k.id_kamar
            WHERE r.id_reservasi = $1
        `, [newReservationResult.rows[0].id_reservasi]);

        const newReservation = fullReservationResult.rows[0];

        const responseData = {
            ...newReservation,
            no_kamar: newReservation.no_kamar,
            tipe_kamar: newReservation.kamar_tipe,
            harga: newReservation.kamar_harga
        };

        res.status(201).json({
            message: 'Reservation created successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Create reservation with auto assignment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update reservation status
const updateReservasiStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status_reservasi, id_resepsionis } = req.body;

        console.log('🔍 updateReservasiStatus called with:', {
            id,
            status_reservasi,
            id_resepsionis
        });

        if (!status_reservasi) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Validate status values
        const validStatuses = ['Belum Bayar', 'Menunggu Konfirmasi', 'Dikonfirmasi', 'Check-In', 'Check-Out', 'Dibatalkan'];
        if (!validStatuses.includes(status_reservasi)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        // Check payment status if trying to confirm reservation
        if (status_reservasi === 'Dikonfirmasi') {
            const paymentResult = await pool.query(`
                SELECT status_pembayaran 
                FROM pembayaran 
                WHERE id_reservasi = $1 
                ORDER BY tanggal_bayar DESC 
                LIMIT 1
            `, [id]);

            if (paymentResult.rows.length === 0) {
                return res.status(400).json({ 
                    error: 'Tidak dapat mengkonfirmasi reservasi. Pembayaran belum dibuat.' 
                });
            }

            const paymentStatus = paymentResult.rows[0].status_pembayaran;
            if (paymentStatus === 'Menunggu Verifikasi') {
                return res.status(400).json({ 
                    error: 'Tidak dapat mengkonfirmasi reservasi. Pembayaran masih menunggu verifikasi.' 
                });
            }

            if (paymentStatus !== 'Lunas') {
                return res.status(400).json({ 
                    error: 'Tidak dapat mengkonfirmasi reservasi. Pembayaran belum lunas.' 
                });
            }

            // Auto-assign room when confirming
            const currentReservationResult = await pool.query(`
                SELECT r.*, k.tipe, k.no_kamar
                FROM reservasi r
                JOIN kamar k ON r.id_kamar = k.id_kamar
                WHERE r.id_reservasi = $1
            `, [id]);

            if (currentReservationResult.rows.length > 0) {
                const currentReservation = currentReservationResult.rows[0];

                // Find available room of the same type
                const availableRoomsResult = await pool.query(`
                    SELECT id_kamar, no_kamar, tipe
                    FROM kamar 
                    WHERE tipe = $1 
                    AND status = 'Tersedia'
                    ORDER BY no_kamar
                    LIMIT 1
                `, [currentReservation.tipe]);

                if (availableRoomsResult.rows.length === 0) {
                    return res.status(400).json({ 
                        error: `Tidak dapat mengkonfirmasi reservasi. Tidak ada kamar ${currentReservation.tipe} yang tersedia.` 
                    });
                }

                // Update reservation with assigned room
                await pool.query(
                    'UPDATE reservasi SET id_kamar = $1 WHERE id_reservasi = $2',
                    [availableRoomsResult.rows[0].id_kamar, id]
                );

                console.log(`✅ Room auto-assigned: ${availableRoomsResult.rows[0].tipe} - ${availableRoomsResult.rows[0].no_kamar}`);
            }
        }

        // Update reservation status
        const result = await pool.query(`
            UPDATE reservasi 
            SET status_reservasi = $1, id_resepsionis = $2 
            WHERE id_reservasi = $3 
            RETURNING *
        `, [status_reservasi, id_resepsionis, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        // Update room status based on reservation status
        const reservationData = result.rows[0];
        if (reservationData.id_kamar) {
            let roomStatus = 'Tersedia';
            if (status_reservasi === 'Dikonfirmasi') {
                roomStatus = 'Dipesan';
            } else if (status_reservasi === 'Check-In') {
                roomStatus = 'Ditempati';
            }

            await pool.query(
                'UPDATE kamar SET status = $1 WHERE id_kamar = $2',
                [roomStatus, reservationData.id_kamar]
            );
        }

        res.json({ 
            message: 'Reservation status updated successfully',
            status: status_reservasi 
        });

    } catch (error) {
        console.error('Update reservation status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update reservation
const updateReservasi = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_tamu, id_kamar, tipe_kamar, tanggal_checkin, tanggal_checkout, jumlah_tamu, status_reservasi, id_resepsionis } = req.body;

        console.log('Update reservation - Request params:', req.params);
        console.log('Update reservation - Request body:', req.body);

        // Validate required fields
        if (!id_tamu || !tanggal_checkin || !tanggal_checkout) {
            console.error('Validation failed - missing required fields:', {
                id_tamu: !!id_tamu,
                tanggal_checkin: !!tanggal_checkin,
                tanggal_checkout: !!tanggal_checkout
            });
            return res.status(400).json({ error: 'Guest, check-in and check-out dates are required' });
        }

        // Validate ID format
        if (!id || isNaN(parseInt(id))) {
            console.error('Invalid reservation ID:', id);
            return res.status(400).json({ error: 'Invalid reservation ID' });
        }

        // Clean up data types
        const cleanedData = {
            id_tamu: parseInt(id_tamu) || null,
            id_kamar: id_kamar ? parseInt(id_kamar) : null,
            tipe_kamar: tipe_kamar || null,
            tanggal_checkin,
            tanggal_checkout,
            jumlah_tamu: parseInt(jumlah_tamu) || 1,
            status_reservasi: status_reservasi || 'Belum Bayar',
            id_resepsionis: id_resepsionis && id_resepsionis !== '' ? parseInt(id_resepsionis) : null
        };

        console.log('Cleaned data:', cleanedData);

        if (!cleanedData.id_tamu) {
            console.error('id_tamu is null or invalid after cleaning:', id_tamu);
            return res.status(400).json({ error: 'Valid guest ID is required' });
        }

        // If tipe_kamar is provided but no specific room (id_kamar), find available room
        let finalIdKamar = cleanedData.id_kamar;
        
        if (cleanedData.tipe_kamar && !cleanedData.id_kamar) {
            console.log('Auto-assigning room for type:', cleanedData.tipe_kamar);
            
            const availableRoomsResult = await pool.query(`
                SELECT id_kamar, no_kamar, tipe
                FROM kamar 
                WHERE tipe = $1 
                AND status = 'Tersedia'
                ORDER BY no_kamar
                LIMIT 1
            `, [cleanedData.tipe_kamar]);

            console.log('Available rooms found:', availableRoomsResult.rows.length);
            if (availableRoomsResult.rows.length === 0) {
                return res.status(400).json({ error: `No available ${cleanedData.tipe_kamar} rooms for selected dates` });
            }

            finalIdKamar = availableRoomsResult.rows[0].id_kamar;
            console.log(`Auto-assigned room: ${availableRoomsResult.rows[0].no_kamar} (${availableRoomsResult.rows[0].tipe}) for reservation ${id}`);
        }

        // Check if manually selected room is available (excluding current reservation)
        if (finalIdKamar) {
            console.log('Checking room availability for room ID:', finalIdKamar);
            const roomCheckResult = await pool.query(`
                SELECT id_reservasi 
                FROM reservasi 
                WHERE id_kamar = $1 
                AND id_reservasi != $2 
                AND status_reservasi IN ('Dikonfirmasi', 'Check-In')
                AND tanggal_checkin < $3
                AND tanggal_checkout > $4
            `, [finalIdKamar, id, cleanedData.tanggal_checkout, cleanedData.tanggal_checkin]);

            console.log('Room availability check result:', roomCheckResult.rows.length);
            if (roomCheckResult.rows.length > 0) {
                return res.status(400).json({ error: 'Room is not available for selected dates' });
            }
        }

        console.log('Executing UPDATE query with parameters:', [
            cleanedData.id_tamu, 
            finalIdKamar, 
            cleanedData.tanggal_checkin, 
            cleanedData.tanggal_checkout, 
            cleanedData.jumlah_tamu, 
            cleanedData.status_reservasi, 
            cleanedData.id_resepsionis, 
            id
        ]);

        const result = await pool.query(`
            UPDATE reservasi 
            SET id_tamu = $1, id_kamar = $2, tanggal_checkin = $3, tanggal_checkout = $4, 
                jumlah_tamu = $5, status_reservasi = $6, id_resepsionis = $7
            WHERE id_reservasi = $8 
            RETURNING *
        `, [
            cleanedData.id_tamu, 
            finalIdKamar, 
            cleanedData.tanggal_checkin, 
            cleanedData.tanggal_checkout, 
            cleanedData.jumlah_tamu, 
            cleanedData.status_reservasi, 
            cleanedData.id_resepsionis, 
            id
        ]);

        console.log('UPDATE query result:', result.rows.length);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        // Get updated reservation data to return
        const updatedReservationResult = await pool.query(`
            SELECT 
                r.*,
                t.nama as tamu_nama,
                t.no_hp as tamu_no_hp,
                t.email as tamu_email,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            LEFT JOIN kamar k ON r.id_kamar = k.id_kamar
            WHERE r.id_reservasi = $1
        `, [id]);

        res.json({ 
            message: 'Reservation updated successfully',
            data: updatedReservationResult.rows[0]
        });
    } catch (error) {
        console.error('Update reservation error:', error);
        console.error('Update reservation error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            debug: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Delete reservation
const deleteReservasi = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM reservasi WHERE id_reservasi = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        res.json({ message: 'Reservation deleted successfully' });
    } catch (error) {
        console.error('Delete reservation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get reservations by date range
const getReservasiByDateRange = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const result = await pool.query(`
            SELECT 
                r.*,
                t.nama as tamu_nama,
                t.no_hp as tamu_no_hp,
                t.email as tamu_email,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            LEFT JOIN kamar k ON r.id_kamar = k.id_kamar
            WHERE r.tanggal_checkin >= $1 
            AND r.tanggal_checkout <= $2
            ORDER BY r.tanggal_checkin
        `, [start_date, end_date]);

        res.json({
            message: 'Reservations by date range retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get reservations by date range error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get reservations by tamu ID for user dashboard
const getReservasiByTamu = async (req, res) => {
    try {
        const { id_tamu } = req.params;

        if (!id_tamu) {
            return res.status(400).json({ 
                error: 'ID Tamu is required',
                message: 'ID Tamu diperlukan untuk mengambil data reservasi'
            });
        }

        console.log('Fetching reservations for tamu ID:', id_tamu);

        const result = await pool.query(`
            SELECT 
                r.*,
                t.nama as tamu_nama,
                t.no_hp as tamu_no_hp,
                t.email as tamu_email,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga,
                k.deskripsi_kamar,
                k.kapasitas_maks,
                res.nama as resepsionis_nama,
                p.id_pembayaran,
                p.jumlah_bayar,
                p.metode_pembayaran,
                p.status_pembayaran
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            LEFT JOIN kamar k ON r.id_kamar = k.id_kamar
            LEFT JOIN resepsionis res ON r.id_resepsionis = res.id_resepsionis
            LEFT JOIN pembayaran p ON r.id_reservasi = p.id_reservasi
            WHERE r.id_tamu = $1
            ORDER BY r.tanggal_reservasi DESC, r.tanggal_checkin DESC
        `, [id_tamu]);

        console.log('Found reservations:', result.rows.length);

        // Process reservations to add cost calculations
        const processedReservations = result.rows.map(row => {
            try {
                // Calculate duration
                const checkinDate = parseLocalDate(row.tanggal_checkin);
                const checkoutDate = parseLocalDate(row.tanggal_checkout);

                let diffDays = 1;
                if (checkinDate && checkoutDate) {
                    const diffTime = Math.abs(checkoutDate - checkinDate);
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 0) diffDays = 1;
                }

                // Calculate costs
                const harga = parseFloat(row.kamar_harga) || 0;
                const subtotal = harga * diffDays;
                const ppn = subtotal * 0.10;
                const totalBiaya = subtotal + ppn;

                return {
                    ...row,
                    nama_tamu: row.tamu_nama,
                    no_hp_tamu: row.tamu_no_hp,
                    email_tamu: row.tamu_email,
                    no_kamar: row.no_kamar,
                    tipe_kamar: row.kamar_tipe,
                    harga: row.kamar_harga,
                    deskripsi_kamar: row.deskripsi_kamar,
                    kapasitas_maks: row.kapasitas_maks,
                    nama_resepsionis: row.resepsionis_nama,
                    id_pembayaran: row.id_pembayaran,
                    jumlah_bayar: row.jumlah_bayar,
                    metode_pembayaran: row.metode_pembayaran,
                    status_pembayaran: row.status_pembayaran,
                    durasi_menginap: diffDays,
                    subtotal: subtotal,
                    ppn: ppn,
                    total_biaya: totalBiaya
                };
            } catch (calcError) {
                console.error('Error calculating reservation details:', calcError);
                
                const defaultHarga = parseFloat(row.kamar_harga) || 0;
                const defaultSubtotal = defaultHarga * 1;
                const defaultPpn = defaultSubtotal * 0.10;
                const defaultTotal = defaultSubtotal + defaultPpn;
                
                return {
                    ...row,
                    durasi_menginap: 1,
                    subtotal: defaultSubtotal,
                    ppn: defaultPpn,
                    total_biaya: defaultTotal
                };
            }
        });

        res.json({
            message: 'User reservations retrieved successfully',
            data: processedReservations
        });
    } catch (error) {
        console.error('Get user reservations error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Gagal mengambil data reservasi: ' + error.message
        });
    }
};

// Cancel reservation (update status to 'Dibatalkan')
const cancelReservasi = async (req, res) => {
    try {
        const { id } = req.params;
        const { alasan_pembatalan } = req.body;

        // Check if reservation exists and can be cancelled
        const reservationCheckResult = await pool.query('SELECT * FROM reservasi WHERE id_reservasi = $1', [id]);

        if (reservationCheckResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        const reservation = reservationCheckResult.rows[0];

        // Check if reservation can be cancelled
        if (reservation.status_reservasi === 'Check-In' || reservation.status_reservasi === 'Selesai') {
            return res.status(400).json({ 
                error: 'Cannot cancel reservation that is already checked in or completed' 
            });
        }

        if (reservation.status_reservasi === 'Dibatalkan') {
            return res.status(400).json({ error: 'Reservation is already cancelled' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Update reservation status to 'Dibatalkan'
            const result = await client.query(
                'UPDATE reservasi SET status_reservasi = $1 WHERE id_reservasi = $2 RETURNING *',
                ['Dibatalkan', id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Failed to cancel reservation' });
            }

            // Cancel any existing payments for this reservation
            await client.query(
                "UPDATE pembayaran SET status_pembayaran = 'Belum Lunas' WHERE id_reservasi = $1 AND status_pembayaran != 'Lunas'",
                [id]
            );

            await client.query('COMMIT');

            // Get updated reservation data
            const updatedReservationResult = await pool.query(`
                SELECT 
                    r.*,
                    t.nama as tamu_nama,
                    t.email as tamu_email,
                    k.no_kamar,
                    k.tipe as kamar_tipe,
                    k.harga as kamar_harga
                FROM reservasi r
                JOIN tamu t ON r.id_tamu = t.id_tamu
                LEFT JOIN kamar k ON r.id_kamar = k.id_kamar
                WHERE r.id_reservasi = $1
            `, [id]);

            const updatedReservation = updatedReservationResult.rows[0];

            res.json({
                message: 'Reservation cancelled successfully',
                data: {
                    ...updatedReservation,
                    nama_tamu: updatedReservation.tamu_nama,
                    email_tamu: updatedReservation.tamu_email,
                    no_kamar: updatedReservation.no_kamar,
                    tipe_kamar: updatedReservation.kamar_tipe,
                    harga: updatedReservation.kamar_harga
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Cancel reservation error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

module.exports = {
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
};
