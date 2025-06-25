const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection untuk migrasi minimal
const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

// Test connection
const testConnection = async () => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM admin');
        console.log('✅ Database connected successfully');
        console.log('📊 Admin count:', result.rows[0].count);
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('🔍 Check your SUPABASE_DB_URL in .env file');
    }
};

// Only test connection in development
if (process.env.NODE_ENV !== 'production') {
    testConnection();
}

module.exports = pool;
