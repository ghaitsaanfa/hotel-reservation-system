const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function addTestUsers() {
    try {
        console.log('🔧 Adding test users to database...');

        // Hash for password "123456"
        const passwordHash = '$2a$10$Hs2pD7Ce4YD191RDYJHWJuKdgBP4cnDGxOvbXTWOpPCeLEfXRqCaa';
        
        // Add simple resepsionis user
        try {
            await pool.query(
                'INSERT INTO resepsionis (nama, no_hp, email, username, password) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING',
                ['Test Resepsionis', '0812345678', 'resepsionis@test.com', 'resepsionis', passwordHash]
            );
            console.log('✅ Added resepsionis user: username="resepsionis", password="123456"');
        } catch (err) {
            console.log('⚠️  Resepsionis user already exists or error:', err.message);
        }

        // Add simple tamu user  
        try {
            await pool.query(
                'INSERT INTO tamu (nama, alamat, no_hp, email, username, password) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO NOTHING',
                ['Test Tamu', 'Jakarta', '081234567890', 'tamu@test.com', 'tamu', passwordHash]
            );
            console.log('✅ Added tamu user: username="tamu", password="123456"');
        } catch (err) {
            console.log('⚠️  Tamu user already exists or error:', err.message);
        }

        console.log('🎉 Test users setup completed!');
        console.log('\n🔑 Available credentials:');
        console.log('  Admin: username="admin", password="123456"');
        console.log('  Resepsionis: username="resepsionis", password="123456"');  
        console.log('  Tamu: username="tamu", password="123456"');

    } catch (error) {
        console.error('❌ Error adding test users:', error);
    } finally {
        process.exit();
    }
}

addTestUsers();
