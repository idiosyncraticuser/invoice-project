const express = require('express');
const router = express.Router();
const Invoice = require('../models/invoice');
const Client = require('../models/client');

// Check if an invoice number already exists (used before saving)
router.get('/check/:invoiceNo', async (req, res) => {
    try {
        const existing = await Invoice.findOne({ invoiceNo: req.params.invoiceNo });
        res.json({ exists: !!existing });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save a new invoice
router.post('/', async (req, res) => {
    try {
        const { invoiceNo, date, clientName, clientAddress, items,
                subtotal, totalDiscount, totalCGST, totalSGST, grandTotal } = req.body;

        // Reject duplicate invoice numbers (the real, database-level check from FR-6)
        const existing = await Invoice.findOne({ invoiceNo });
        if (existing) {
            return res.status(400).json({ error: 'Invoice number already exists' });
        }

        // Find an existing client with this name, or create a new one
        let client = await Client.findOne({ name: clientName });
        if (!client) {
            client = await Client.create({ name: clientName, address: clientAddress });
        }

        const newInvoice = await Invoice.create({
            invoiceNo, date, clientId: client._id, items,
            subtotal, totalDiscount, totalCGST, totalSGST, grandTotal
        });

        res.status(201).json(newInvoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all invoices (basic list, newest first)
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find().populate('clientId').sort({ createdAt: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search invoices by invoice number, client name, or date range
router.get('/search', async (req, res) => {
    try {
        const { invoiceNo, clientName, from, to } = req.query;
        let filter = {};

        if (invoiceNo) filter.invoiceNo = { $regex: invoiceNo, $options: 'i' };
        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to) filter.date.$lte = new Date(to);
        }

        let invoices = await Invoice.find(filter).populate('clientId').sort({ createdAt: -1 });

        if (clientName) {
            invoices = invoices.filter(inv =>
                inv.clientId.name.toLowerCase().includes(clientName.toLowerCase())
            );
        }

        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get one invoice by its database ID (must stay AFTER /search, or Express will
// mistake the word "search" itself for an :id value)
router.get('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('clientId');
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;