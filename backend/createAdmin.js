require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

async function createAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);

    const username = 'rajneesh';       
    const plainPassword = 'g8k0-K$B3UmFn2L';   

    const existing = await User.findOne({ username });
    if (existing) {
        console.log('Admin already exists, nothing created.');
        return process.exit();
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await User.create({ username, passwordHash, role: 'admin' });
    console.log('✅ Admin user created:', username);
    process.exit();
}

createAdmin();