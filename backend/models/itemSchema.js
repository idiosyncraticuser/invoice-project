const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    desc: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false }
}, { _id: false });

module.exports = itemSchema;