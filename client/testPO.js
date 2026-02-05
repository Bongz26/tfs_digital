// server/testPO.js
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/purchase-orders';

async function testPO() {
  try {
    // 1. Create a new Purchase Order
    const poRes = await axios.post(API_BASE, {
      po_number: 'PO-001',
      supplier_id: 1,
      order_date: '2025-11-15',
      expected_delivery: '2025-11-20',
      created_by: 'Bongz'
    });
    const po = poRes.data.purchase_order;
    console.log('Created PO:', po);

    // 2. Add items to the PO
    const itemRes = await axios.post(`${API_BASE}/${po.id}/items`, {
      inventory_id: 2,
      quantity_ordered: 5,
      unit_cost: 100
    });
    console.log('Added PO item:', itemRes.data.item);

    // 3. Receive GRV for PO
    const grvRes = await axios.post(`${API_BASE}/${po.id}/receive`, {
      received_by: 'Bongz',
      received_items: [
        { inventory_id: 2, quantity_received: 5 }
      ]
    });
    console.log('GRV Received:', grvRes.data);

    // 4. Get all Purchase Orders
    const allPOs = await axios.get(API_BASE);
    console.log('All POs:', JSON.stringify(allPOs.data.purchase_orders, null, 2));

  } catch (err) {
    console.error('Error testing PO API:', err.response?.data || err.message);
  }
}

testPO();
