const Counter = require("../models/counter");
const express = require("express");
const router = express.Router();
const Invoice = require("../models/invoice");
const Client = require("../models/client");

// Check if an invoice number already exists (used before saving)
router.get("/check/:invoiceNo", async (req, res) => {
  try {
    const existing = await Invoice.findOne({ invoiceNo: req.params.invoiceNo });
    res.json({ exists: !!existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a new invoice
router.post("/", async (req, res) => {
  try {
    const {
      date,
      clientName,
      clientAddress,
      items,
      subtotal,
      totalDiscount,
      totalCGST,
      totalSGST,
      grandTotal,
    } = req.body;

    // Atomically get the next invoice number — safe even if two
    // requests hit this exact line at the same time
    const counter = await Counter.findOneAndUpdate(
      { name: "invoiceNo" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const invoiceNo = "INV-" + String(counter.seq).padStart(4, "0");

    let client = await Client.findOne({ name: clientName });
    if (!client) {
      client = await Client.create({
        name: clientName,
        address: clientAddress,
      });
    }

    const newInvoice = await Invoice.create({
      invoiceNo,
      date,
      clientId: client._id,
      items,
      subtotal,
      totalDiscount,
      totalCGST,
      totalSGST,
      grandTotal,
    });

    res.status(201).json(newInvoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices (basic list, newest first)
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("clientId")
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search invoices by invoice number, client name, or date range
router.get("/search", async (req, res) => {
  try {
    const { invoiceNo, clientName, from, to } = req.query;
    let filter = {};

    if (invoiceNo) filter.invoiceNo = { $regex: invoiceNo, $options: "i" };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let invoices = await Invoice.find(filter)
      .populate("clientId")
      .sort({ createdAt: -1 });

    if (clientName) {
      invoices = invoices.filter((inv) =>
        inv.clientId.name.toLowerCase().includes(clientName.toLowerCase()),
      );
    }

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard stats — totals, monthly trend, top clients
router.get("/stats", async (req, res) => {
  try {
    const invoices = await Invoice.find().populate("clientId");

    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let thisMonthCount = 0;
    const monthlyMap = {}; // "2026-08" -> revenue
    const clientMap = {}; // client name -> revenue

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    invoices.forEach((inv) => {
      totalRevenue += inv.grandTotal;

      const invDate = new Date(inv.date);
      const monthKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + inv.grandTotal;

      if (monthKey === currentMonthKey) {
        thisMonthRevenue += inv.grandTotal;
        thisMonthCount++;
      }

      const clientName = inv.clientId ? inv.clientId.name : "Unknown";
      clientMap[clientName] = (clientMap[clientName] || 0) + inv.grandTotal;
    });

    const productRevenueMap = {};
    const productQtyMap = {};
    const gstRevenueMap = {};

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.productId ? String(item.productId) : item.desc;
        const originalTotal = item.qty * item.price;
        const discountAmount = originalTotal * (item.discount / 100);
        const baseTotal = originalTotal - discountAmount;
        const itemRevenue =
          baseTotal +
          baseTotal * (item.cgst / 100) +
          baseTotal * (item.sgst / 100);

        if (!productRevenueMap[key])
          productRevenueMap[key] = { name: item.desc, revenue: 0 };
        productRevenueMap[key].revenue += itemRevenue;

        if (!productQtyMap[key])
          productQtyMap[key] = { name: item.desc, qty: 0 };
        productQtyMap[key].qty += item.qty;

        const gstLabel = item.cgst + item.sgst + "%";
        gstRevenueMap[gstLabel] = (gstRevenueMap[gstLabel] || 0) + itemRevenue;
      });
    });

    const topProductsByRevenue = Object.values(productRevenueMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const topProductsByQty = Object.values(productQtyMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    const revenueByGST = Object.entries(gstRevenueMap)
      .sort((a, b) => b[1] - a[1])
      .map(([rate, revenue]) => ({ rate, revenue }));
    const averageInvoiceValue =
      invoices.length > 0 ? totalRevenue / invoices.length : 0;

    const monthlyRevenue = Object.keys(monthlyMap)
      .sort()
      .map((month) => ({ month, revenue: monthlyMap[month] }));

    const topClients = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));

    res.json({
      totalInvoices: invoices.length,
      totalRevenue,
      thisMonthInvoices: thisMonthCount,
      thisMonthRevenue,
      monthlyRevenue,
      topClients,
      topProductsByRevenue,
      topProductsByQty,
      revenueByGST,
      averageInvoiceValue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get one invoice by its database ID (must stay AFTER /search, or Express will
// mistake the word "search" itself for an :id value)
router.get("/next-number", async (req, res) => {
  try {
    const counter = await Counter.findOne({ name: "invoiceNo" });
    const nextSeq = counter ? counter.seq + 1 : 1;
    res.json({ invoiceNo: "INV-" + String(nextSeq).padStart(4, "0") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("clientId");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
