const express = require('express');
const router = express.Router();
const Quotation = require('../models/quotation');
const Client = require('../models/client');
const Counter = require('../models/counter');

router.post('/', async (req, res) => {
    try {
        const { date, clientName, clientAddress, items,
                subtotal, totalDiscount, totalCGST, totalSGST, grandTotal } = req.body;

        const counter = await Counter.findOneAndUpdate(
            { name: 'quotationNo' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const quotationNo = 'QUO-' + String(counter.seq).padStart(4, '0');

        let client = await Client.findOne({ name: clientName });
        if (!client) {
            client = await Client.create({ name: clientName, address: clientAddress });
        }

        const newQuotation = await Quotation.create({
            quotationNo, date, clientId: client._id, items,
            subtotal, totalDiscount, totalCGST, totalSGST, grandTotal
        });

        res.status(201).json(newQuotation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/next-number', async (req, res) => {
    try {
        const counter = await Counter.findOne({ name: 'quotationNo' });
        const nextSeq = counter ? counter.seq + 1 : 1;
        res.json({ quotationNo: 'QUO-' + String(nextSeq).padStart(4, '0') });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { quotationNo, clientName, from, to } = req.query;
        let filter = {};
        if (quotationNo) filter.quotationNo = { $regex: quotationNo, $options: 'i' };
        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to) filter.date.$lte = new Date(to);
        }
        let quotations = await Quotation.find(filter).populate('clientId').sort({ createdAt: -1 });
        if (clientName) {
            quotations = quotations.filter(q =>
                q.clientId.name.toLowerCase().includes(clientName.toLowerCase())
            );
        }
        res.json(quotations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const quotations = await Quotation.find().populate('clientId').sort({ createdAt: -1 });
        res.json(quotations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id).populate('clientId');
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        res.json(quotation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;