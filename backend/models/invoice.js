const mongoose = require('mongoose');

// This describes the shape of ONE item inside the items array.
// It does NOT get its own mongoose.model() — it only exists inside an Invoice.
const itemSchema = new mongoose.Schema({
    desc: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 }
}, { _id: false });

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
        ref: 'client',
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
        ref: 'user'
    }
}, { timestamps: true });

module.exports = mongoose.model('invoice', invoiceSchema);