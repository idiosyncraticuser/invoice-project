const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Search must stay above any /:id-style route so Express doesn't
// mistake "search" or "all" for an id
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const products = await Product.find({
            active: true,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { sku: { $regex: q, $options: 'i' } }
            ]
        }).limit(20);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// All products including inactive ones (needed for the management
// table on products.html, so deactivated products stay visible/editable
// instead of disappearing permanently)
router.get('/all', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Active products only (for the invoice/quotation picker)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({ active: true }).sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, variant, sku, price, gst, hsn, unit } = req.body;
        if (!name || price === undefined || gst === undefined) {
            return res.status(400).json({ error: 'Name, price, and GST are required.' });
        }
        const product = await Product.create({ name, variant, sku, price, gst, hsn, unit });
        res.status(201).json(product);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'A product with this SKU already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, variant, sku, price, gst, hsn, unit, active } = req.body;
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { name, variant, sku, price, gst, hsn, unit, active },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Product not found' });
        res.json(updated);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'A product with this SKU already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
        if (!updated) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deactivated', product: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;