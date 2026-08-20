let items = [];
let selectedProductId = null;
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

document.getElementById('productSearch').addEventListener('input', async function() {
    const q = this.value.trim();
    const resultsDiv = document.getElementById('productResults');
    if (!q) { resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; return; }
    try {
        const res = await fetch(API_BASE + '/api/products/search?q=' + encodeURIComponent(q), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const products = await res.json();
        resultsDiv.innerHTML = '';
        if (products.length === 0) {
            resultsDiv.innerHTML = '<div class="product-result-item">No products found</div>';
        } else {
            products.forEach(p => {
                const div = document.createElement('div');
                div.className = 'product-result-item';
                div.textContent = p.name + (p.variant ? ' - ' + p.variant : '') + ' (₹' + p.price + ')';
                div.onclick = () => selectProduct(p);
                resultsDiv.appendChild(div);
            });
        }
        resultsDiv.style.display = 'block';
    } catch (err) {
        console.error('Product search failed:', err);
    }
});

function selectProduct(p) {
    document.getElementById('itemDesc').value = p.name + (p.variant ? ' - ' + p.variant : '');
    document.getElementById('itemPrice').value = p.price;
    document.getElementById('itemCGST').value = p.gst / 2;
    document.getElementById('itemSGST').value = p.gst / 2;
    selectedProductId = p._id;
    document.getElementById('productSearch').value = '';
    document.getElementById('productResults').innerHTML = '';
    document.getElementById('productResults').style.display = 'none';
    document.getElementById('itemQty').focus();
}

function addItem() {
    const desc = document.getElementById('itemDesc').value.trim();
    const qty = parseInt(document.getElementById('itemQty').value);
    const price = parseFloat(document.getElementById('itemPrice').value);
    const discount = parseFloat(document.getElementById('itemDiscount').value) || 0;
    const cgst = parseFloat(document.getElementById('itemCGST').value) || 0;
    const sgst = parseFloat(document.getElementById('itemSGST').value) || 0;

    if (!desc || isNaN(qty) || qty < 1 || isNaN(price) || price < 0) {
        alert('Please enter valid item details.');
        return;
    }

    items.push({ desc, qty, price, discount, cgst, sgst, productId: selectedProductId });
    selectedProductId = null;

    document.getElementById('itemDesc').value = '';
    document.getElementById('itemQty').value = 1;
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemDiscount').value = '';
    document.getElementById('itemCGST').value = '';
    document.getElementById('itemSGST').value = '';
    document.getElementById('itemDesc').focus();

    renderItems();
}

function removeItem(index) {
    items.splice(index, 1);
    renderItems();
}

function renderItems() {
    const tbody = document.querySelector('#itemsTable tbody');
    tbody.innerHTML = '';

    let grossTotal = 0, totalDiscount = 0, totalCGST = 0, totalSGST = 0;

    items.forEach((item, i) => {
        const originalTotal = item.qty * item.price;
        const discountAmount = originalTotal * (item.discount / 100);
        const baseTotal = originalTotal - discountAmount;
        const cgstAmount = baseTotal * (item.cgst / 100);
        const sgstAmount = baseTotal * (item.sgst / 100);
        const itemTotal = baseTotal + cgstAmount + sgstAmount;

        grossTotal += originalTotal;
        totalDiscount += discountAmount;
        totalCGST += cgstAmount;
        totalSGST += sgstAmount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td><td>${item.desc}</td><td>${item.qty}</td>
            <td>₹${item.price.toFixed(2)}</td><td>${item.discount}%</td>
            <td>${item.cgst}%</td><td>${item.sgst}%</td><td>₹${itemTotal.toFixed(2)}</td>
            <td><button onclick="removeItem(${i})">X</button></td>
        `;
        tbody.appendChild(tr);
    });

    const grandTotal = grossTotal - totalDiscount + totalCGST + totalSGST;

    document.getElementById('subtotal').textContent = grossTotal.toFixed(2);
    document.getElementById('discountTotal').textContent = totalDiscount.toFixed(2);
    document.getElementById('cgstTotal').textContent = totalCGST.toFixed(2);
    document.getElementById('sgstTotal').textContent = totalSGST.toFixed(2);
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
}

function generateQuotation() {
    const quotationDate = document.getElementById('quotationDate').value;
    const clientName = document.getElementById('clientName').value.trim();
    const clientAdd = document.getElementById('clientAdd').value.trim();

    if (!quotationDate || !clientName || !clientAdd || items.length === 0) {
        alert('Please fill all quotation details and add at least one item.');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Saving...';

    fetch(API_BASE + '/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
            date: quotationDate, clientName, clientAddress: clientAdd,
            items, subtotal: parseFloat(document.getElementById('subtotal').textContent),
            totalDiscount: parseFloat(document.getElementById('discountTotal').textContent),
            totalCGST: parseFloat(document.getElementById('cgstTotal').textContent),
            totalSGST: parseFloat(document.getElementById('sgstTotal').textContent),
            grandTotal: parseFloat(document.getElementById('grandTotal').textContent)
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert('Could not save quotation: ' + data.error);
        } else {
            document.getElementById('quotationNo').value = data.quotationNo;
            renderOutput(data);
        }
    })
    .catch(err => {
        alert('Could not save quotation. Please check your internet connection and try again.');
        console.error('Save failed:', err);
    })
    .finally(() => {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Quotation';
    });
}

function renderOutput(q) {
    const sellerDetails = `
        <div style="font-size:14px;">
            <strong>Kumawat Enterprises</strong><br>
            SHOP NO-4 PRATAP NAGAR-302033<br>
            kumawatenterprises@gmail.com<br>
            GSTIN: 27DPAUC1177K1OZ
        </div>`;

    let rows = '';
    q.items.forEach((item, i) => {
        const originalTotal = item.qty * item.price;
        const discountAmount = originalTotal * (item.discount / 100);
        const baseTotal = originalTotal - discountAmount;
        const cgstAmount = baseTotal * (item.cgst / 100);
        const sgstAmount = baseTotal * (item.sgst / 100);
        const itemTotal = baseTotal + cgstAmount + sgstAmount;
        rows += `
            <tr>
                <td>${i + 1}</td><td>${item.desc}</td><td>${item.qty}</td>
                <td>₹${item.price.toFixed(2)}</td><td>${item.discount}%</td>
                <td>${item.cgst}%</td><td>${item.sgst}%</td><td>₹${itemTotal.toFixed(2)}</td>
            </tr>`;
    });

    document.getElementById('quotationOutput').innerHTML = `
        <div style="padding:20px; border: 1px dashed #000; margin-bottom: 30px;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                <div style="font-size:14px;">
                    <strong>Quotation #${q.quotationNo}</strong><br>
                    Date: ${new Date(q.date).toLocaleDateString()}
                </div>
                <div>Client Details:<br>${q.clientId.name}<br></div>
                ${sellerDetails}
            </div>
            <table style="width:100%;margin-top:10px;border-collapse:collapse;" border="1">
                <tr>
                    <th>S.No.</th><th>Description</th><th>Qty</th><th>Unit Price (₹)</th>
                    <th>Discount %</th><th>CGST %</th><th>SGST %</th><th>Total (₹)</th>
                </tr>
                ${rows}
            </table>
            <div style="text-align:right;margin-top:10px;font-size:14px;">
                Subtotal: ₹${q.subtotal.toFixed(2)}<br>
                Total Discount: ₹${q.totalDiscount.toFixed(2)}<br>
                Total CGST: ₹${q.totalCGST.toFixed(2)}<br>
                Total SGST: ₹${q.totalSGST.toFixed(2)}<br>
                <strong>Grand Total: ₹${q.grandTotal.toFixed(2)}</strong>
            </div>
        </div>`;
    document.getElementById('quotationOutput').style.display = 'block';
    document.getElementById('printBtn').disabled = false;
}

function printQuotation() {
    window.print();
}

function resetQuotation() {
    document.getElementById('quotationDate').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('clientAdd').value = '';
    document.getElementById('itemDesc').value = '';
    document.getElementById('itemQty').value = 1;
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemDiscount').value = '';
    document.getElementById('itemCGST').value = '';
    document.getElementById('itemSGST').value = '';
    items = [];
    renderItems();
    document.getElementById('quotationOutput').style.display = 'none';
    document.getElementById('printBtn').disabled = true;
    loadNextNumber();
}

function loadNextNumber() {
    fetch(API_BASE + '/api/quotations/next-number', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(data => { document.getElementById('quotationNo').value = data.quotationNo; })
    .catch(err => console.error('Could not load next quotation number:', err));
}

function setupKeyboardNavigation() {
    const fields = ['quotationDate','clientName','clientAdd','productSearch','itemDesc','itemQty','itemPrice','itemDiscount','itemCGST','itemSGST'];
    for (let i = 0; i < fields.length; i++) {
        const current = document.getElementById(fields[i]);
        const nextId = fields[i + 1];
        current.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (nextId) document.getElementById(nextId).focus();
                else document.getElementById('addBtn').click();
            }
        });
    }
}

window.onload = function () {
    setupKeyboardNavigation();
    loadNextNumber();
};

renderItems();