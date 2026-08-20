require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

async function createAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);

    const username = process.env.ADMIN_USERNAME;
    const plainPassword = process.env.ADMIN_PASSWORD;

    if (!username || !plainPassword) {
        console.log('❌ ADMIN_USERNAME or ADMIN_PASSWORD missing from .env');
        return process.exit(1);
    }

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