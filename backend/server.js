require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const invoiceRoutes = require('./routes/invoiceRoutes');
const authRoutes = require('./routes/authRoutes');
const verifyToken = require('./middleware/authMiddleware');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); 
app.use('/api/auth', authRoutes);
app.use('/api/invoices', verifyToken, invoiceRoutes);
const PORT = process.env.PORT || 5000;

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("✅ MongoDB Connected Successfully");

        app.get("/", (req, res) => {
            res.send("Backend is running!");
        });

        app.listen(PORT, () => {
            console.log(`🚀 Server started on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error("❌ MongoDB Connection Failed");
        console.error(err);
    }
}

connectDB();