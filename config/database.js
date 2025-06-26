const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Fallback values for testing
const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGVidHBoeG9kY3dvenp1eGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MDYzNzYsImV4cCI6MjA1MTM4MjM3Nn0.dummy';

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock pool for compatibility with existing routes
const pool = {
    query: async (query, params = []) => {
        try {
            // Convert PostgreSQL query to Supabase query
            console.log('🔄 Converting SQL query:', query, params);
            
            // Handle INSERT queries for kamar
            if (query.includes('INSERT INTO kamar')) {
                const [no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks] = params;
                
                // Check for duplicate room number first
                const { data: existing, error: checkError } = await supabase
                    .from('kamar')
                    .select('id_kamar')
                    .eq('no_kamar', no_kamar);
                
                if (checkError) throw checkError;
                
                if (existing && existing.length > 0) {
                    const error = new Error('Room number already exists');
                    error.code = '23505'; // PostgreSQL unique violation code
                    throw error;
                }
                
                // Get the highest existing ID to generate next ID
                const { data: maxIdData, error: maxIdError } = await supabase
                    .from('kamar')
                    .select('id_kamar')
                    .order('id_kamar', { ascending: false })
                    .limit(1);
                
                if (maxIdError) {
                    console.warn('Warning: Could not get max ID, using auto-generation:', maxIdError);
                }
                
                // Calculate next ID
                let nextId = 1; // Default starting ID
                if (maxIdData && maxIdData.length > 0) {
                    nextId = maxIdData[0].id_kamar + 1;
                }
                
                console.log('Generating new kamar with ID:', nextId);
                
                const { data, error } = await supabase
                    .from('kamar')
                    .insert([{
                        id_kamar: nextId, // Explicitly set the ID
                        no_kamar,
                        tipe,
                        harga,
                        status,
                        deskripsi_kamar,
                        kapasitas_maks
                    }])
                    .select();
                
                if (error) {
                    // If there's a duplicate ID error, try with a higher ID
                    if (error.code === '23505' && error.message.includes('id_kamar')) {
                        console.warn('ID collision detected, retrying with higher ID');
                        
                        // Get current max ID again and add a buffer
                        const { data: retryMaxIdData, error: retryMaxIdError } = await supabase
                            .from('kamar')
                            .select('id_kamar')
                            .order('id_kamar', { ascending: false })
                            .limit(1);
                        
                        if (!retryMaxIdError && retryMaxIdData && retryMaxIdData.length > 0) {
                            const retryNextId = retryMaxIdData[0].id_kamar + 1;
                            
                            const { data: retryData, error: retryError } = await supabase
                                .from('kamar')
                                .insert([{
                                    id_kamar: retryNextId,
                                    no_kamar,
                                    tipe,
                                    harga,
                                    status,
                                    deskripsi_kamar,
                                    kapasitas_maks
                                }])
                                .select();
                            
                            if (retryError) throw retryError;
                            return { rows: retryData || [] };
                        }
                    }
                    throw error;
                }
                
                return { rows: data || [] };
            }
            
            // Handle UPDATE queries for kamar
            if (query.includes('UPDATE kamar') && query.includes('WHERE id_kamar = $')) {
                const id = params[params.length - 1]; // ID is always the last parameter
                
                if (query.includes('SET no_kamar = $1, tipe = $2')) {
                    // Full update
                    const [no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks] = params;
                    
                    // Check for duplicate room number (excluding current room)
                    const { data: existing, error: checkError } = await supabase
                        .from('kamar')
                        .select('id_kamar')
                        .eq('no_kamar', no_kamar)
                        .neq('id_kamar', id);
                    
                    if (checkError) throw checkError;
                    
                    if (existing && existing.length > 0) {
                        const error = new Error('Room number already exists');
                        error.code = '23505';
                        throw error;
                    }
                    
                    const { data, error } = await supabase
                        .from('kamar')
                        .update({
                            no_kamar,
                            tipe,
                            harga,
                            status,
                            deskripsi_kamar,
                            kapasitas_maks
                        })
                        .eq('id_kamar', id)
                        .select();
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
                
                if (query.includes('SET status = $1')) {
                    // Status update only
                    const [status] = params;
                    
                    const { data, error } = await supabase
                        .from('kamar')
                        .update({ status })
                        .eq('id_kamar', id)
                        .select();
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
            }
            
            // Handle DELETE queries for kamar
            if (query.includes('DELETE FROM kamar WHERE id_kamar = $1')) {
                const [id] = params;
                
                const { data, error } = await supabase
                    .from('kamar')
                    .delete()
                    .eq('id_kamar', id)
                    .select();
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Handle SELECT by ID queries for kamar
            if (query.includes('SELECT') && query.includes('FROM kamar WHERE id_kamar = $1')) {
                const [id] = params;
                
                const { data, error } = await supabase
                    .from('kamar')
                    .select('*')
                    .eq('id_kamar', id);
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Handle duplicate check queries
            if (query.includes('SELECT id_kamar FROM kamar WHERE no_kamar = $1')) {
                const [no_kamar] = params;
                
                if (params.length === 1) {
                    // Simple duplicate check for new room
                    const { data, error } = await supabase
                        .from('kamar')
                        .select('id_kamar')
                        .eq('no_kamar', no_kamar);
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
            }
            
            // Handle duplicate check with exclusion
            if (query.includes('SELECT id_kamar FROM kamar WHERE no_kamar = $1 AND id_kamar != $2')) {
                const [no_kamar, id] = params;
                
                const { data, error } = await supabase
                    .from('kamar')
                    .select('id_kamar')
                    .eq('no_kamar', no_kamar)
                    .neq('id_kamar', id);
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Handle active reservations check for delete
            if (query.includes('SELECT id_reservasi FROM reservasi WHERE id_kamar = $1')) {
                const [id] = params;
                
                const { data, error } = await supabase
                    .from('reservasi')
                    .select('id_reservasi')
                    .eq('id_kamar', id)
                    .in('status_reservasi', ['Dikonfirmasi', 'Check-In', 'Menunggu Konfirmasi']);
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Handle admin dashboard stats queries
            if (query.includes('SELECT COUNT(*) FROM reservasi WHERE tanggal_reservasi')) {
                // Reservasi hari ini
                const { data, error, count } = await supabase
                    .from('reservasi')
                    .select('*', { count: 'exact', head: true })
                    .gte('tanggal_reservasi', params[0])
                    .lt('tanggal_reservasi', params[1]);
                
                if (error) throw error;
                return { rows: [{ count: count || 0 }] };
            }
            
            if (query.includes("SELECT COUNT(*) FROM reservasi WHERE status_reservasi IN ('Dikonfirmasi', 'Check-In')")) {
                // Reservasi aktif
                const { data, error, count } = await supabase
                    .from('reservasi')
                    .select('*', { count: 'exact', head: true })
                    .in('status_reservasi', ['Dikonfirmasi', 'Check-In']);
                
                if (error) throw error;
                return { rows: [{ count: count || 0 }] };
            }
            
            if (query.includes('SELECT SUM(jumlah_bayar) as total FROM pembayaran')) {
                // Pendapatan bulan ini
                const { data, error } = await supabase
                    .from('pembayaran')
                    .select('jumlah_bayar')
                    .eq('status_pembayaran', 'Lunas')
                    .gte('tanggal_bayar', params[0])
                    .lt('tanggal_bayar', params[1]);
                
                if (error) throw error;
                
                const total = data?.reduce((sum, item) => sum + (item.jumlah_bayar || 0), 0) || 0;
                return { rows: [{ total }] };
            }
            
            if (query.includes('SELECT') && query.includes('FROM reservasi r') && query.includes('JOIN tamu t') && query.includes('JOIN kamar k')) {
                // Reservasi terbaru untuk dashboard
                const { data, error } = await supabase
                    .from('reservasi')
                    .select(`
                        *,
                        tamu:id_tamu (nama),
                        kamar:id_kamar (no_kamar, tipe)
                    `)
                    .order('tanggal_reservasi', { ascending: false })
                    .limit(5);
                
                if (error) throw error;
                
                // Transform data to match expected format
                const transformedData = data?.map(item => ({
                    ...item,
                    nama_tamu: item.tamu?.nama,
                    no_kamar: item.kamar?.no_kamar,
                    tipe: item.kamar?.tipe
                })) || [];
                
                return { rows: transformedData };
            }
            
            // Handle COUNT queries for dashboard stats
            if (query.includes('COUNT(*)') && query.includes('FROM kamar')) {
                if (query.includes("WHERE status = 'Tersedia'")) {
                    const { data, error, count } = await supabase
                        .from('kamar')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'Tersedia');
                    
                    if (error) throw error;
                    return { rows: [{ count: count || 0 }] };
                } else {
                    const { data, error, count } = await supabase
                        .from('kamar')
                        .select('*', { count: 'exact', head: true });
                    
                    if (error) throw error;
                    return { rows: [{ count: count || 0 }] };
                }
            }
            
            if (query.includes('COUNT(*)') && query.includes('FROM tamu')) {
                const { data, error, count } = await supabase
                    .from('tamu')
                    .select('*', { count: 'exact', head: true });
                
                if (error) throw error;
                return { rows: [{ count: count || 0 }] };
            }
            
            if (query.includes('COUNT(*)') && query.includes('FROM reservasi')) {
                const { data, error, count } = await supabase
                    .from('reservasi')
                    .select('*', { count: 'exact', head: true });
                
                if (error) throw error;
                return { rows: [{ count: count || 0 }] };
            }
            
            if (query.includes('COUNT(*)') && query.includes('FROM resepsionis')) {
                const { data, error, count } = await supabase
                    .from('resepsionis')
                    .select('*', { count: 'exact', head: true });
                
                if (error) throw error;
                return { rows: [{ count: count || 0 }] };
            }
            
            // Handle SELECT queries for kamar
            if (query.includes('SELECT') && query.includes('FROM kamar')) {
                // Basic kamar select
                if (query.includes('ORDER BY no_kamar')) {
                    const { data, error } = await supabase
                        .from('kamar')
                        .select('id_kamar, no_kamar, tipe, harga, kapasitas_maks, status, deskripsi_kamar')
                        .order('no_kamar');
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
                
                // Available kamar
                if (query.includes("status = $1") && params[0] === 'Tersedia') {
                    const { data, error } = await supabase
                        .from('kamar')
                        .select('*')
                        .eq('status', 'Tersedia');
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
                
                // General kamar select
                const { data, error } = await supabase
                    .from('kamar')
                    .select('*');
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Handle SELECT queries for reservasi
            if (query.includes('SELECT') && query.includes('FROM reservasi')) {
                // Current guest check for occupied rooms
                if (query.includes('JOIN tamu t ON r.id_tamu = t.id_tamu') && query.includes("status_reservasi = 'Check-In'")) {
                    const kamarId = params[0];
                    const { data, error } = await supabase
                        .from('reservasi')
                        .select(`
                            tanggal_checkin,
                            tanggal_checkout,
                            tamu:id_tamu (
                                nama
                            )
                        `)
                        .eq('id_kamar', kamarId)
                        .eq('status_reservasi', 'Check-In')
                        .gte('tanggal_checkout', new Date().toISOString().split('T')[0])
                        .lte('tanggal_checkin', new Date().toISOString().split('T')[0])
                        .limit(1);
                    
                    if (error) throw error;
                    
                    // Transform data to match expected format
                    const transformedData = data?.map(item => ({
                        tanggal_checkin: item.tanggal_checkin,
                        tanggal_checkout: item.tanggal_checkout,
                        nama: item.tamu?.nama
                    })) || [];
                    
                    return { rows: transformedData };
                }
                
                // Future reservations for booked rooms
                if (query.includes("status_reservasi IN ('Dikonfirmasi', 'Menunggu Konfirmasi')")) {
                    const kamarId = params[0];
                    const { data, error } = await supabase
                        .from('reservasi')
                        .select('tanggal_checkin, tanggal_checkout')
                        .eq('id_kamar', kamarId)
                        .in('status_reservasi', ['Dikonfirmasi', 'Menunggu Konfirmasi'])
                        .gt('tanggal_checkin', new Date().toISOString().split('T')[0])
                        .order('tanggal_checkin')
                        .limit(1);
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
            }
            
            // Handle login queries
            if (query.includes('SELECT') && query.includes('FROM tamu') && params && params.length > 0) {
                const { data, error } = await supabase
                    .from('tamu')
                    .select('*')
                    .or(`email.eq.${params[0]},username.eq.${params[0]}`);
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            if (query.includes('SELECT') && query.includes('FROM resepsionis') && params && params.length > 0) {
                const { data, error } = await supabase
                    .from('resepsionis')
                    .select('*')
                    .or(`email.eq.${params[0]},username.eq.${params[0]}`);
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            if (query.includes('SELECT') && query.includes('FROM admin') && params && params.length > 0) {
                const { data, error } = await supabase
                    .from('admin')
                    .select('*')
                    .eq('username', params[0]);
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Handle SELECT queries for tamu
            if (query.includes('SELECT') && query.includes('FROM tamu')) {
                // Get all tamu for dropdown
                if (query.includes('ORDER BY nama')) {
                    const { data, error } = await supabase
                        .from('tamu')
                        .select('id_tamu, nama, email, no_hp, username')
                        .order('nama');
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
                
                // Login queries for tamu
                if (params && params.length > 0) {
                    const { data, error } = await supabase
                        .from('tamu')
                        .select('*')
                        .or(`email.eq.${params[0]},username.eq.${params[0]}`);
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
                
                // General tamu select
                const { data, error } = await supabase
                    .from('tamu')
                    .select('*');
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Handle SELECT queries for resepsionis
            if (query.includes('SELECT') && query.includes('FROM resepsionis')) {
                // Get all resepsionis for dropdown
                if (query.includes('ORDER BY nama')) {
                    const { data, error } = await supabase
                        .from('resepsionis')
                        .select('id_resepsionis, nama, email, no_hp, username')
                        .order('nama');
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
                
                // Login queries for resepsionis
                if (params && params.length > 0) {
                    const { data, error } = await supabase
                        .from('resepsionis')
                        .select('*')
                        .or(`email.eq.${params[0]},username.eq.${params[0]}`);
                    
                    if (error) throw error;
                    return { rows: data || [] };
                }
                
                // General resepsionis select
                const { data, error } = await supabase
                    .from('resepsionis')
                    .select('*');
                
                if (error) throw error;
                return { rows: data || [] };
            }
            
            // Default fallback
            console.log('⚠️ Unhandled query pattern:', query);
            return { rows: [] };
            
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
    }
};

// Test connection (simplified)
const testConnection = async () => {
    try {
        console.log('✅ Database connection configured (Supabase mode)');
        
        // Test a simple query to verify connection
        const { data, error } = await supabase
            .from('kamar')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.log('⚠️ Warning: Database test query failed:', error.message);
        } else {
            console.log('✅ Database connection test successful');
        }
    } catch (err) {
        console.error('❌ Database connection test failed:', err.message);
    }
};

testConnection();

module.exports = { supabase, pool };
