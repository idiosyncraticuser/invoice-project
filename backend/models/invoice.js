const mongoose = require('mongoose');
const itemSchema = require('./itemSchema');

const invoiceSchema = new mongoose.Schema({
    invoiceNo: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    items: [itemSchema],
    subtotal: Number,
    totalDiscount: Number,
    totalCGST: Number,
    totalSGST: Number,
    grandTotal: Number,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);