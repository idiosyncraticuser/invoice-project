const mongoose = require('mongoose');
const itemSchema = require('./itemSchema');

const quotationSchema = new mongoose.Schema({
    quotationNo: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    items: [itemSchema],
    subtotal: Number,
    totalDiscount: Number,
    totalCGST: Number,
    totalSGST: Number,
    grandTotal: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Quotation', quotationSchema);