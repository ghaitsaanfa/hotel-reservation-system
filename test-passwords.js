const bcrypt = require('bcryptjs');

// Test password verification
async function testPasswordVerification() {
    const plaintextPassword = '123456';
    const hashFromDatabase = '$2b$10$vc9OwV8cE8VMPTFn.nzRUeTw21qALDce.uAktwvdM6EpU12mp2zwC'; // admin password hash

    try {
        const isMatch = await bcrypt.compare(plaintextPassword, hashFromDatabase);
        console.log('🔐 Password verification test:');
        console.log('  Plaintext: "123456"');
        console.log('  Hash: ' + hashFromDatabase.substring(0, 30) + '...');
        console.log('  Match result:', isMatch);
        
        if (isMatch) {
            console.log('✅ Admin login should work with username="admin", password="123456"');
        } else {
            console.log('❌ Admin password verification failed');
        }

        // Test with password "password"
        const passwordHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
        const isPasswordMatch = await bcrypt.compare('password', passwordHash);
        console.log('\n🔐 Testing "password":');
        console.log('  Match result:', isPasswordMatch);
        
        if (isPasswordMatch) {
            console.log('✅ Tamu/Resepsionis login should work with password="password"');
        }

    } catch (error) {
        console.error('❌ Password verification failed:', error);
    }
}

testPasswordVerification();
