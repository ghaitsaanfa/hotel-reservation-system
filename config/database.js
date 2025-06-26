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
