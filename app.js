const express = require('express');
const path = require('path');
const cors = require('cors'); 

const authRoutes = require('./routes/authRoutes'); // Import auth routes
const tamuRoutes = require('./routes/tamu.js'); // Import tamu routes
const kamarRoutes = require('./routes/kamar.js'); // Import kamar routes
const reservasiRoutes = require('./routes/reservasi.js'); // Import reservasi routes
const pembayaranRoutes = require('./routes/pembayaran.js'); // Import pembayaran routes
const resepsionisRoutes = require('./routes/resepsionis.js'); // Import resepsionis routes
const adminRoutes = require('./routes/admin.js'); // Import admin routes

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes); // Use auth routes with /api/auth prefix

// Debug route untuk check available endpoints
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const basePath = middleware.regexp.source.replace('\\/?$', '').replace('^\\', '');
                    routes.push({
                        path: basePath + handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    res.json({ message: 'Available routes', routes });
});

app.use('/api/tamu', tamuRoutes); // Use tamu routes with /api/tamu prefix
app.use('/api/kamar', kamarRoutes); // Use kamar routes with /api/kamar prefix
app.use('/api/reservasi', reservasiRoutes); // Use reservasi routes with /api/reservasi prefix
app.use('/api/pembayaran', pembayaranRoutes); // Use pembayaran routes with /api/pembayaran prefix
app.use('/api/resepsionis', resepsionisRoutes); // Use resepsionis routes with /api/resepsionis prefix
app.use('/api/admin', adminRoutes); // Use admin routes with /api/admin prefix

// Test route for monitoring
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running properly',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()) + ' seconds'
    });
});

// Simple debug route to test pool import
app.get('/api/debug/pool', async (req, res) => {
    try {
        const databaseConfig = require('./config/database');
        
        res.json({
            success: true,
            message: 'Database config loaded successfully',
            hasPool: typeof databaseConfig.pool !== 'undefined',
            hasQuery: typeof databaseConfig.pool.query !== 'undefined',
            exports: Object.keys(databaseConfig),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug route untuk test reservasi tanpa auth (hapus di production)
app.get('/api/debug/reservasi', async (req, res) => {
    try {
        const { getAllReservasi } = require('./controllers/reservasiController');
        
        // Temporarily bypass auth by mocking req.user
        req.user = { id: 1, role: 'admin' };
        
        // Call controller directly
        await getAllReservasi(req, res);
    } catch (error) {
        console.error('Debug reservasi error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Debug route untuk search tamu tanpa auth (hapus di production)
app.get('/api/debug/tamu/search', async (req, res) => {
    try {
        const supabase = require('./config/database');
        
        // Get search parameters
        const query = req.query.nama || req.query.q || '';
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        // Search guests by name in tamu table using Supabase
        const { data: guests, error } = await supabase
            .from('tamu')
            .select('id_tamu, nama, alamat, no_hp, email')
            .ilike('nama', `%${query}%`)
            .order('nama', { ascending: true })
            .limit(10);

        if (error) throw error;
        
        res.json({
            success: true,
            data: guests,
            message: 'Guests retrieved successfully'
        });
        
    } catch (error) {
        console.error('Debug tamu search error:', error);
        res.status(500).json({
            success: false,
            message: 'Database query failed: ' + error.message
        });
    }
});

// Debug route untuk available kamar tanpa auth (hapus di production)
app.get('/api/debug/kamar/available', async (req, res) => {
    try {
        const supabase = require('./config/database');
        const { checkin, checkout, tipe } = req.query;

        let query = supabase
            .from('kamar')
            .select('*')
            .eq('status', 'Tersedia');

        // Filter by room type if specified
        if (tipe) {
            query = query.eq('tipe', tipe);
        }

        if (checkin && checkout) {
            // Get conflicting reservations
            const { data: conflicts, error: conflictError } = await supabase
                .from('reservasi')
                .select('id_kamar')
                .in('status_reservasi', ['Dikonfirmasi', 'Check-In'])
                .or(`and(tanggal_checkin.lte.${checkin},tanggal_checkout.gt.${checkin}),and(tanggal_checkin.lt.${checkout},tanggal_checkout.gte.${checkout}),and(tanggal_checkin.gte.${checkin},tanggal_checkout.lte.${checkout})`);

            if (conflictError) throw conflictError;

            const conflictingRoomIds = conflicts.map(r => r.id_kamar);
            if (conflictingRoomIds.length > 0) {
                query = query.not('id_kamar', 'in', `(${conflictingRoomIds.join(',')})`);
            }
        }

        const { data: rooms, error } = await query.order('no_kamar');

        if (error) throw error;

        res.json({
            message: 'Available rooms retrieved successfully',
            data: rooms
        });
        
    } catch (error) {
        console.error('Debug kamar available error:', error);
        res.status(500).json({
            message: 'Database query failed: ' + error.message
        });
    }
});

// Debug route for creating new reservations
app.post('/api/debug/reservasi/create', async (req, res) => {
    try {
        const supabase = require('./config/database');
        const { tamu, reservasi } = req.body;
        
        console.log('📝 Received reservation data:', JSON.stringify(req.body, null, 2));
        
        // Validate required fields
        if (!tamu || !reservasi) {
            return res.status(400).json({
                success: false,
                message: 'Data tamu dan reservasi diperlukan'
            });
        }

        if (!tamu.nama || !tamu.no_hp) {
            return res.status(400).json({
                success: false,
                message: 'Nama dan no HP tamu harus diisi'
            });
        }

        if (!reservasi.id_kamar || !reservasi.tanggal_checkin || !reservasi.tanggal_checkout) {
            return res.status(400).json({
                success: false,
                message: 'ID kamar, tanggal check-in dan check-out harus diisi'
            });
        }

        let tamuId = tamu.id_tamu;

        // If no guest ID provided, create new guest or find existing one
        if (!tamuId) {
            // Check if guest already exists by phone number
            const { data: existingGuest, error: guestError } = await supabase
                .from('tamu')
                .select('id_tamu')
                .eq('no_hp', tamu.no_hp)
                .single();

            if (guestError && guestError.code !== 'PGRST116') {
                throw guestError;
            }

            if (existingGuest) {
                tamuId = existingGuest.id_tamu;
                console.log('Found existing guest:', tamuId);
            } else {
                // Create new guest
                const { data: newGuest, error: insertError } = await supabase
                    .from('tamu')
                    .insert({
                        nama: tamu.nama,
                        email: tamu.email || null,
                        no_hp: tamu.no_hp,
                        alamat: tamu.alamat || null
                    })
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                
                tamuId = newGuest.id_tamu;
                console.log('Created new guest:', tamuId);
            }
        }

        // Create reservation
        const { data: newReservation, error: reservationError } = await supabase
            .from('reservasi')
            .insert({
                id_tamu: tamuId,
                id_kamar: parseInt(reservasi.id_kamar),
                tanggal_reservasi: new Date().toISOString(),
                tanggal_checkin: reservasi.tanggal_checkin,
                tanggal_checkout: reservasi.tanggal_checkout,
                jumlah_tamu: parseInt(reservasi.jumlah_tamu) || 1,
                status_reservasi: reservasi.status_reservasi || 'Belum Bayar'
            })
            .select()
            .single();
        
        if (reservationError) throw reservationError;
        
        console.log('✅ Reservation created with ID:', newReservation.id_reservasi);

        // Update room status to 'Dipesan' (booked)
        const { error: updateError } = await supabase
            .from('kamar')
            .update({ status: 'Dipesan' })
            .eq('id_kamar', parseInt(reservasi.id_kamar));

        if (updateError) throw updateError;

        // Get complete reservation data for response
        const { data: completeReservation, error: completeError } = await supabase
            .from('reservasi')
            .select(`
                *,
                tamu:id_tamu (
                    nama,
                    email,
                    no_hp,
                    alamat
                ),
                kamar:id_kamar (
                    no_kamar,
                    tipe,
                    harga,
                    kapasitas_maks,
                    deskripsi_kamar
                )
            `)
            .eq('id_reservasi', newReservation.id_reservasi)
            .single();

        if (completeError) throw completeError;

        // Calculate total cost
        const checkinDate = new Date(completeReservation.tanggal_checkin);
        const checkoutDate = new Date(completeReservation.tanggal_checkout);
        const jumlahMalam = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        const totalBiaya = jumlahMalam * completeReservation.kamar.harga * 1.10;

        res.status(201).json({
            success: true,
            data: {
                ...completeReservation,
                nama_tamu: completeReservation.tamu.nama,
                email_tamu: completeReservation.tamu.email,
                no_hp_tamu: completeReservation.tamu.no_hp,
                alamat_tamu: completeReservation.tamu.alamat,
                no_kamar: completeReservation.kamar.no_kamar,
                tipe_kamar: completeReservation.kamar.tipe,
                harga_kamar: completeReservation.kamar.harga,
                jumlah_malam: jumlahMalam,
                total_biaya: totalBiaya
            },
            message: 'Reservasi berhasil dibuat',
            reservation_id: newReservation.id_reservasi,
            guest_id: tamuId
        });

    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat reservasi: ' + error.message
        });
    }
});

// Debug route for updating reservation status
app.put('/api/debug/reservasi/:id/status', async (req, res) => {
    try {
        const { updateReservasiStatus } = require('./controllers/reservasiController');
        
        // Log original request
        console.log('📝 Debug route received:', {
            id: req.params.id,
            body: req.body,
            headers: req.headers['content-type']
        });
        
        // Temporarily bypass auth by mocking req.user
        req.user = { id: 1, role: 'resepsionis' };
        req.body.status_reservasi = req.body.status; // Map status to status_reservasi
        req.body.id_resepsionis = 1; // Default resepsionis ID for debug
        
        console.log('📝 Debug route after mapping:', {
            id: req.params.id,
            status: req.body.status,
            status_reservasi: req.body.status_reservasi,
            id_resepsionis: req.body.id_resepsionis
        });
        
        // Call controller directly which handles auto-assignment
        await updateReservasiStatus(req, res);
    } catch (error) {
        console.error('Debug update reservation status error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

// Simplified debug route for updating reservation status (skip payment validation)
app.put('/api/debug/reservasi/:id/status-simple', async (req, res) => {
    try {
        const supabase = require('./config/database');
        const reservationId = req.params.id;
        const { status } = req.body;
        
        console.log('📝 Simple status update:', { reservationId, status });
        
        // Validate required fields
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status reservasi diperlukan'
            });
        }

        // Validate status values
        const validStatuses = ['Belum Bayar', 'Menunggu Konfirmasi', 'Dikonfirmasi', 'Check-In', 'Check-Out', 'Dibatalkan'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status tidak valid'
            });
        }

        // Check if reservation exists
        const { data: existingReservation, error: findError } = await supabase
            .from('reservasi')
            .select('*')
            .eq('id_reservasi', reservationId)
            .single();

        if (findError) {
            return res.status(404).json({
                success: false,
                message: 'Reservasi tidak ditemukan'
            });
        }

        // Auto-assign room if status is changed to 'Dikonfirmasi'
        if (status === 'Dikonfirmasi') {
            // Find available room of the same type
            const { data: roomInfo } = await supabase
                .from('kamar')
                .select('tipe')
                .eq('id_kamar', existingReservation.id_kamar)
                .single();

            const { data: availableRooms, error: roomError } = await supabase
                .from('kamar')
                .select('id_kamar, no_kamar, tipe')
                .eq('tipe', roomInfo.tipe)
                .eq('status', 'Tersedia')
                .order('no_kamar')
                .limit(1);

            if (!roomError && availableRooms.length > 0) {
                // Update reservation with the assigned room
                await supabase
                    .from('reservasi')
                    .update({ id_kamar: availableRooms[0].id_kamar })
                    .eq('id_reservasi', reservationId);
                
                console.log(`✅ Room auto-assigned: ${availableRooms[0].tipe} - ${availableRooms[0].no_kamar}`);
            }
        }

        // Update reservation status
        const { error: updateError } = await supabase
            .from('reservasi')
            .update({ status_reservasi: status })
            .eq('id_reservasi', reservationId);

        if (updateError) throw updateError;

        // Get updated reservation data
        const { data: updatedReservation, error: getError } = await supabase
            .from('reservasi')
            .select(`
                *,
                tamu:id_tamu (nama, email, no_hp),
                kamar:id_kamar (no_kamar, tipe, harga)
            `)
            .eq('id_reservasi', reservationId)
            .single();

        if (getError) throw getError;

        console.log('✅ Status updated successfully:', status);

        res.json({
            success: true,
            data: {
                ...updatedReservation,
                nama_tamu: updatedReservation.tamu.nama,
                email_tamu: updatedReservation.tamu.email,
                no_hp_tamu: updatedReservation.tamu.no_hp,
                no_kamar: updatedReservation.kamar.no_kamar,
                tipe_kamar: updatedReservation.kamar.tipe,
                harga_kamar: updatedReservation.kamar.harga
            },
            message: `Status reservasi berhasil diubah menjadi ${status}`
        });

    } catch (error) {
        console.error('❌ Error updating reservation status (simple):', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengubah status reservasi: ' + error.message
        });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'Server berjalan dengan baik!', timestamp: new Date() });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Fallback untuk SPA (jika diperlukan nanti, untuk sekarang tidak terlalu krusial karena multiple HTML files)
// app.get('*', (req, res) => {
//   if (!req.path.startsWith('/api/')) {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
//   } else {
//     next(); // Lanjutkan ke handler 404 jika itu rute API yang tidak dikenal
//   }
// });

// Remove the app.listen from here if server.js is your main entry point
// app.listen(PORT, () => {
//     console.log(`Server berjalan di http://localhost:${PORT}`);
//     console.log(`Folder public disajikan dari: ${path.join(__dirname, 'public')}`);
// });

module.exports = app; // Ensure app is exported