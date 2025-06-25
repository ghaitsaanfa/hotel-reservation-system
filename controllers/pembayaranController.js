const pool = require('../config/database');

/**
 * PAYMENT CONTROLLER WITH PPN (TAX) CALCULATION
 * ============================================
 * Sistem pembayaran ini sudah termasuk PPN 10%
 * - Semua pembayaran akan otomatis ditambahkan PPN 10%
 * - Response API akan menampilkan breakdown: subtotal, PPN, dan total
 * - PPN Rate: 10% dari subtotal
 * - Total yang disimpan di database sudah termasuk PPN
 */

// Get all payments
const getAllPembayaran = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                r.id_reservasi,
                r.tanggal_checkin,
                r.tanggal_checkout,
                r.jumlah_tamu,
                t.nama as tamu_nama,
                t.email as tamu_email,
                t.no_hp as tamu_no_hp,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga,
                res.nama as resepsionis_nama
            FROM pembayaran p
            JOIN reservasi r ON p.id_reservasi = r.id_reservasi
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN kamar k ON r.id_kamar = k.id_kamar
            LEFT JOIN resepsionis res ON p.id_resepsionis = res.id_resepsionis
            ORDER BY p.tanggal_bayar DESC
        `);

        // Tambahkan breakdown PPN untuk setiap pembayaran
        const paymentsWithBreakdown = result.rows.map(payment => {
            const total_dengan_ppn = parseFloat(payment.jumlah_bayar) || 0;
            const ppn_rate = 0.10;
            const subtotal = total_dengan_ppn / (1 + ppn_rate);
            const ppn_amount = total_dengan_ppn - subtotal;

            return {
                ...payment,
                payment_breakdown: {
                    subtotal: Math.round(subtotal),
                    ppn_rate: ppn_rate,
                    ppn_amount: Math.round(ppn_amount),
                    total_dengan_ppn: total_dengan_ppn
                }
            };
        });

        res.json({
            message: 'Payments retrieved successfully',
            data: paymentsWithBreakdown
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get payment by ID
const getPembayaranById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                p.*,
                r.id_reservasi,
                r.tanggal_checkin,
                r.tanggal_checkout,
                r.jumlah_tamu,
                t.nama as tamu_nama,
                t.email as tamu_email,
                t.no_hp as tamu_no_hp,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga,
                res.nama as resepsionis_nama
            FROM pembayaran p
            JOIN reservasi r ON p.id_reservasi = r.id_reservasi
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN kamar k ON r.id_kamar = k.id_kamar
            LEFT JOIN resepsionis res ON p.id_resepsionis = res.id_resepsionis
            WHERE p.id_pembayaran = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = result.rows[0];

        // Tambahkan breakdown PPN
        const total_dengan_ppn = parseFloat(payment.jumlah_bayar) || 0;
        const ppn_rate = 0.10;
        const subtotal = total_dengan_ppn / (1 + ppn_rate);
        const ppn_amount = total_dengan_ppn - subtotal;

        const paymentWithBreakdown = {
            ...payment,
            payment_breakdown: {
                subtotal: Math.round(subtotal),
                ppn_rate: ppn_rate,
                ppn_amount: Math.round(ppn_amount),
                total_dengan_ppn: total_dengan_ppn
            }
        };

        res.json({
            message: 'Payment retrieved successfully',
            data: paymentWithBreakdown
        });
    } catch (error) {
        console.error('Get payment by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get payments by reservation ID
const getPembayaranByReservasi = async (req, res) => {
    try {
        const { reservasiId } = req.params;

        const result = await pool.query(`
            SELECT 
                p.*,
                r.id_reservasi,
                r.tanggal_checkin,
                r.tanggal_checkout,
                r.jumlah_tamu,
                t.nama as tamu_nama,
                t.email as tamu_email,
                t.no_hp as tamu_no_hp,
                k.no_kamar,
                k.tipe as kamar_tipe,
                k.harga as kamar_harga,
                res.nama as resepsionis_nama
            FROM pembayaran p
            JOIN reservasi r ON p.id_reservasi = r.id_reservasi
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN kamar k ON r.id_kamar = k.id_kamar
            LEFT JOIN resepsionis res ON p.id_resepsionis = res.id_resepsionis
            WHERE p.id_reservasi = $1
            ORDER BY p.tanggal_bayar DESC
        `, [reservasiId]);

        // Tambahkan breakdown PPN untuk setiap pembayaran
        const paymentsWithBreakdown = result.rows.map(payment => {
            const total_dengan_ppn = parseFloat(payment.jumlah_bayar) || 0;
            const ppn_rate = 0.10;
            const subtotal = total_dengan_ppn / (1 + ppn_rate);
            const ppn_amount = total_dengan_ppn - subtotal;

            return {
                ...payment,
                payment_breakdown: {
                    subtotal: Math.round(subtotal),
                    ppn_rate: ppn_rate,
                    ppn_amount: Math.round(ppn_amount),
                    total_dengan_ppn: total_dengan_ppn
                }
            };
        });

        res.json({
            message: 'Payments for reservation retrieved successfully',
            data: paymentsWithBreakdown
        });
    } catch (error) {
        console.error('Get payments by reservation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new payment
const createPembayaran = async (req, res) => {
    try {
        const { 
            id_reservasi, 
            metode_pembayaran, 
            id_resepsionis,
            catatan_pembayaran 
        } = req.body;

        if (!id_reservasi || !metode_pembayaran) {
            return res.status(400).json({ 
                error: 'Reservation ID and payment method are required' 
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check if reservation exists and get total amount
            const reservationResult = await client.query(`
                SELECT 
                    r.*,
                    k.harga,
                    k.no_kamar,
                    k.tipe
                FROM reservasi r
                JOIN kamar k ON r.id_kamar = k.id_kamar
                WHERE r.id_reservasi = $1
            `, [id_reservasi]);

            if (reservationResult.rows.length === 0) {
                return res.status(404).json({ error: 'Reservation not found' });
            }

            const reservation = reservationResult.rows[0];

            // Calculate total amount with PPN
            const checkinDate = new Date(reservation.tanggal_checkin);
            const checkoutDate = new Date(reservation.tanggal_checkout);
            const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
            
            const subtotal = reservation.harga * nights;
            const ppn_rate = 0.10;
            const ppn_amount = subtotal * ppn_rate;
            const total_dengan_ppn = subtotal + ppn_amount;

            // Create payment record
            const paymentResult = await client.query(`
                INSERT INTO pembayaran (
                    id_reservasi, 
                    jumlah_bayar, 
                    metode_pembayaran, 
                    status_pembayaran,
                    tanggal_bayar,
                    id_resepsionis,
                    catatan_pembayaran
                ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6) 
                RETURNING *
            `, [id_reservasi, total_dengan_ppn, metode_pembayaran, 'Lunas', id_resepsionis, catatan_pembayaran]);

            // Update reservation status to confirmed
            await client.query(
                'UPDATE reservasi SET status_reservasi = $1 WHERE id_reservasi = $2',
                ['Dikonfirmasi', id_reservasi]
            );

            await client.query('COMMIT');

            const payment = paymentResult.rows[0];

            // Add breakdown to response
            const paymentWithBreakdown = {
                ...payment,
                payment_breakdown: {
                    subtotal: Math.round(subtotal),
                    ppn_rate: ppn_rate,
                    ppn_amount: Math.round(ppn_amount),
                    total_dengan_ppn: total_dengan_ppn,
                    nights: nights,
                    room_rate: reservation.harga
                },
                reservation_info: {
                    no_kamar: reservation.no_kamar,
                    tipe: reservation.tipe,
                    tanggal_checkin: reservation.tanggal_checkin,
                    tanggal_checkout: reservation.tanggal_checkout
                }
            };

            res.status(201).json({
                message: 'Payment created successfully',
                data: paymentWithBreakdown
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update payment status
const updatePembayaranStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status_pembayaran } = req.body;

        if (!status_pembayaran) {
            return res.status(400).json({ error: 'Payment status is required' });
        }

        const validStatuses = ['Menunggu', 'Lunas', 'Dibatalkan', 'Refund'];
        if (!validStatuses.includes(status_pembayaran)) {
            return res.status(400).json({ 
                error: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
            });
        }

        const result = await pool.query(
            'UPDATE pembayaran SET status_pembayaran = $1 WHERE id_pembayaran = $2 RETURNING *',
            [status_pembayaran, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json({
            message: 'Payment status updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update payment
const updatePembayaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            metode_pembayaran, 
            status_pembayaran, 
            catatan_pembayaran 
        } = req.body;

        const result = await pool.query(`
            UPDATE pembayaran 
            SET metode_pembayaran = $1, status_pembayaran = $2, catatan_pembayaran = $3
            WHERE id_pembayaran = $4 
            RETURNING *
        `, [metode_pembayaran, status_pembayaran, catatan_pembayaran, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json({
            message: 'Payment updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete payment
const deletePembayaran = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM pembayaran WHERE id_pembayaran = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get payment summary/statistics
const getPembayaranSummary = async (req, res) => {
    try {
        const { year = new Date().getFullYear(), month } = req.query;

        let dateFilter = '';
        let params = [year];
        
        if (month) {
            dateFilter = 'AND EXTRACT(MONTH FROM tanggal_bayar) = $2';
            params.push(month);
        }

        const result = await pool.query(`
            SELECT 
                status_pembayaran,
                metode_pembayaran,
                COUNT(*) as jumlah_transaksi,
                SUM(jumlah_bayar) as total_amount,
                AVG(jumlah_bayar) as rata_rata_amount
            FROM pembayaran
            WHERE EXTRACT(YEAR FROM tanggal_bayar) = $1 ${dateFilter}
            GROUP BY status_pembayaran, metode_pembayaran
            ORDER BY status_pembayaran, metode_pembayaran
        `, params);

        // Get monthly summary if no month specified
        let monthlySummary = [];
        if (!month) {
            const monthlyResult = await pool.query(`
                SELECT 
                    EXTRACT(MONTH FROM tanggal_bayar) as bulan,
                    COUNT(*) as jumlah_transaksi,
                    SUM(jumlah_bayar) as total_amount
                FROM pembayaran
                WHERE EXTRACT(YEAR FROM tanggal_bayar) = $1
                GROUP BY EXTRACT(MONTH FROM tanggal_bayar)
                ORDER BY bulan
            `, [year]);
            
            monthlySummary = monthlyResult.rows;
        }

        res.json({
            message: 'Payment summary retrieved successfully',
            data: {
                summary_by_status_method: result.rows,
                monthly_summary: monthlySummary,
                period: {
                    year: parseInt(year),
                    month: month ? parseInt(month) : null
                }
            }
        });
    } catch (error) {
        console.error('Get payment summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllPembayaran,
    getPembayaranById,
    getPembayaranByReservasi,
    createPembayaran,
    updatePembayaranStatus,
    updatePembayaran,
    deletePembayaran,
    getPembayaranSummary
};
