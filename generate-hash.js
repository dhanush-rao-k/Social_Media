const bcrypt = require('bcrypt');

// Generate hash for "password123"
const password = 'password123';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error generating hash:', err);
        return;
    }
    
    console.log('\n=================================');
    console.log('Password Hash Generator');
    console.log('=================================');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('=================================\n');
    console.log('Copy this hash to your schema.sql file');
    console.log('to replace the placeholder hash in the sample data.\n');
});
