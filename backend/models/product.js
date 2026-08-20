const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    variant: { type: String },
    sku: { type: String, unique: true, sparse: true },
    price: { type: Number, required: true },
    gst: { type: Number, required: true },
    hsn: { type: String },
    unit: { type: String, default: 'Piece' },
    active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);