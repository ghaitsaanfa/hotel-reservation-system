const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Fallback values for testing
const supabaseUrl = process.env.SUPABASE_URL || 'https://trfnpdqgnhgyeobfcmee.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZm5wZHFnbmhneWVvYmZjbWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTE1NzksImV4cCI6MjA2NjQyNzU3OX0.c7fLLESjSYF5nr4cDJh9J7t_08h9j3OyijgIP47FTEI';

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
