const bcrypt = require('bcryptjs');

const adminHash = '$2b$10$vc9OwV8cE8VMPTFn.nzRUeTw21qALDce.uAktwvdM6EpU12mp2zwC';

console.log('🧪 Testing admin password with different possibilities:');
const testPasswords = ['123456', 'admin', 'password', '', 'Admin123', 'admin123'];

testPasswords.forEach(pwd => {
    const result = bcrypt.compareSync(pwd, adminHash);
    console.log(`"${pwd}": ${result ? '✅' : '❌'}`);
});

// Generate new hash for 123456 to see the difference
const newHash = bcrypt.hashSync('123456', 10);
console.log('\n🔧 New hash for "123456":', newHash);
console.log('🔧 Original hash:         ', adminHash);

// Test if we can determine what the original password was
console.log('\n🔍 Trying to determine the original admin password...');
