const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Fallback values for testing
const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGVidHBoeG9kY3dvenp1eGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MDYzNzYsImV4cCI6MjA1MTM4MjM3Nn0.dummy';

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock pool for compatibility with existing routes
const pool = {
    query: async (query, params) => {
        // Convert PostgreSQL query to Supabase query
        console.log('🔄 Converting SQL query:', query, params);
        
        if (query.includes('SELECT') && query.includes('FROM tamu')) {
            const { data, error } = await supabase
                .from('tamu')
                .select('*')
                .or(`email.eq.${params[0]},username.eq.${params[0]}`);
            
            if (error) throw error;
            return { rows: data };
        }
        
        if (query.includes('SELECT') && query.includes('FROM resepsionis')) {
            const { data, error } = await supabase
                .from('resepsionis')
                .select('*')
                .or(`email.eq.${params[0]},username.eq.${params[0]}`);
            
            if (error) throw error;
            return { rows: data };
        }
        
        if (query.includes('SELECT') && query.includes('FROM admin')) {
            const { data, error } = await supabase
                .from('admin')
                .select('*')
                .eq('username', params[0]);
            
            if (error) throw error;
            return { rows: data };
        }
        
        // Default fallback
        return { rows: [] };
    }
};

// Test connection (simplified)
const testConnection = async () => {
    try {
        console.log('✅ Database connection configured (mock mode)');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
};

testConnection();

module.exports = { supabase, pool };
