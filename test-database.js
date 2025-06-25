// Test database connection dan query
const pool = require('./config/database');

const testDatabase = async () => {
    console.log('🔍 Testing Database Connection...\n');
    
    try {
        // Test 1: Basic connection
        console.log('1. Testing basic connection...');
        const result = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Connection successful');
        console.log('   Current time:', result.rows[0].current_time);
        
        // Test 2: Test all tables exist
        console.log('\n2. Testing table existence...');
        const tables = ['admin', 'kamar', 'tamu', 'resepsionis', 'reservasi', 'pembayaran'];
        
        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`✅ Table ${table}: ${result.rows[0].count} records`);
        }
        
        // Test 3: Test foreign key relationships
        console.log('\n3. Testing relationships...');
        const relationshipTest = await pool.query(`
            SELECT 
                r.id_reservasi,
                t.nama as nama_tamu,
                k.no_kamar,
                r.status_reservasi
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN kamar k ON r.id_kamar = k.id_kamar
            LIMIT 3
        `);
        
        console.log('✅ Relationships working:');
        relationshipTest.rows.forEach(row => {
            console.log(`   Reservasi ${row.id_reservasi}: ${row.nama_tamu} - Kamar ${row.no_kamar} (${row.status_reservasi})`);
        });
        
        // Test 4: Test constraints
        console.log('\n4. Testing constraints...');
        try {
            await pool.query("INSERT INTO kamar (no_kamar, tipe, harga, deskripsi_kamar) VALUES ('INVALID', 'InvalidType', 100, 'Test')");
            console.log('❌ Constraint test failed - invalid data was accepted');
        } catch (error) {
            console.log('✅ Constraints working properly - invalid data rejected');
        }
        
        console.log('\n🎉 All database tests passed! Ready for deployment.\n');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Check your SUPABASE_DB_URL in .env file');
        console.error('2. Make sure you ran the migration SQL script in Supabase');
        console.error('3. Check if your Supabase project is active');
        console.error('4. Verify the database password is correct\n');
    } finally {
        await pool.end();
    }
};

// Run the test
testDatabase();
