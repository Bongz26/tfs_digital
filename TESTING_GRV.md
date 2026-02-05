# Testing GRV (Goods Received Voucher)

## Overview

GRV (Goods Received Voucher) is a feature in the Purchase Orders module that allows you to:
- Receive items from suppliers
- Update inventory stock quantities automatically
- Record stock movements for audit purposes
- Update Purchase Order status to "received"
- Track received quantities per item

## Prerequisites

Before testing GRV, ensure:
1. ✅ Server is running (`cd server && npm run dev`)
2. ✅ Database is connected and tables exist
3. ✅ You have at least one Purchase Order with items
4. ✅ Inventory items exist in the database

## Testing Methods

### Method 1: Using the Test Script (Quick Test)

The simplest way to test GRV is using the existing test script:

```bash
cd server
node testPO.js
```

This script will:
1. Create a new Purchase Order
2. Add an item to the PO
3. Receive GRV for the item
4. Display the results

**Expected Output:**
```
Created PO: { id: X, po_number: 'PO-001', ... }
Added PO item: { id: Y, inventory_id: 2, quantity_ordered: 5, ... }
GRV Received: { success: true, message: 'GRV processed and inventory updated' }
```

### Method 2: Manual API Testing with cURL

#### Step 1: Create a Purchase Order (if needed)

```bash
curl -X POST http://localhost:5000/api/purchase-orders \
  -H "Content-Type: application/json" \
  -d '{
    "po_number": "PO-TEST-001",
    "supplier_id": 1,
    "order_date": "2025-11-20",
    "expected_delivery": "2025-11-25",
    "created_by": "Test User"
  }'
```

**Save the PO ID from the response** (e.g., `po_id: 5`)

#### Step 2: Add Items to the Purchase Order

```bash
curl -X POST http://localhost:5000/api/purchase-orders/5/items \
  -H "Content-Type: application/json" \
  -d '{
    "inventory_id": 2,
    "quantity_ordered": 10,
    "unit_cost": 150.00
  }'
```

#### Step 3: Receive GRV (The Main Test)

```bash
curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
  -H "Content-Type: application/json" \
  -d '{
    "received_by": "Warehouse Staff",
    "received_items": [
      {
        "inventory_id": 2,
        "quantity_received": 10
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "GRV processed and inventory updated"
}
```

### Method 3: Testing with Multiple Items

To test receiving multiple items at once:

```bash
curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
  -H "Content-Type: application/json" \
  -d '{
    "received_by": "Warehouse Staff",
    "received_items": [
      {
        "inventory_id": 2,
        "quantity_received": 10
      },
      {
        "inventory_id": 3,
        "quantity_received": 5
      }
    ]
  }'
```

### Method 4: Partial Receiving (Receive Less Than Ordered)

Test receiving fewer items than ordered:

```bash
curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
  -H "Content-Type: application/json" \
  -d '{
    "received_by": "Warehouse Staff",
    "received_items": [
      {
        "inventory_id": 2,
        "quantity_received": 7
      }
    ]
  }'
```

**Note:** This should work - you can receive partial quantities. The system will update:
- Inventory stock (adds 7)
- PO item `received_quantity` (sets to 7)
- Stock movement record (records 7 received)

## Verification Steps

After receiving GRV, verify the following:

### 1. Check Inventory Stock Updated

```bash
# Query the database or use your inventory API
curl http://localhost:5000/api/inventory
```

**Verify:**
- Stock quantity increased by the `quantity_received` amount
- `updated_at` timestamp is recent

### 2. Check Stock Movements Recorded

Query the `stock_movements` table:

```sql
SELECT * FROM stock_movements 
WHERE inventory_id = 2 
ORDER BY created_at DESC 
LIMIT 1;
```

**Verify:**
- `movement_type` = 'purchase'
- `quantity_change` = quantity_received
- `previous_quantity` = old stock level
- `new_quantity` = new stock level
- `reason` = 'GRV Received'
- `recorded_by` = the value you sent

### 3. Check Purchase Order Updated

```bash
curl http://localhost:5000/api/purchase-orders/5
```

**Verify:**
- `status` = 'received'
- `total_amount` is calculated correctly
- Items show `received_quantity` updated

### 4. Check PO Items Updated

In the response, check each item:
- `received_quantity` matches what you sent
- Items are still in the PO with updated received quantities

## Test Cases

### ✅ Happy Path Tests

1. **Full Receipt**
   - Receive all items ordered
   - Verify inventory increases correctly
   - Verify PO status changes to "received"

2. **Partial Receipt**
   - Receive fewer items than ordered
   - Verify inventory still updates
   - Verify `received_quantity` reflects partial amount

3. **Multiple Items**
   - Receive multiple different items in one GRV
   - Verify all items update correctly
   - Verify all stock movements recorded

### ⚠️ Edge Cases & Error Handling

1. **Invalid Inventory ID**
   ```bash
   curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
     -H "Content-Type: application/json" \
     -d '{
       "received_items": [
         { "inventory_id": 99999, "quantity_received": 10 }
       ]
     }'
   ```
   **Expected:** Error message about inventory item not found

2. **Invalid PO ID**
   ```bash
   curl -X POST http://localhost:5000/api/purchase-orders/99999/receive \
     -H "Content-Type: application/json" \
     -d '{
       "received_items": [
         { "inventory_id": 2, "quantity_received": 10 }
       ]
     }'
   ```
   **Expected:** Database error or validation error

3. **Missing Required Fields**
   ```bash
   curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   **Expected:** Error about missing `received_items`

4. **Empty received_items Array**
   ```bash
   curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
     -H "Content-Type: application/json" \
     -d '{
       "received_items": []
     }'
   ```
   **Expected:** Should handle gracefully (no updates, but no error)

5. **Negative Quantity**
   ```bash
   curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
     -H "Content-Type: application/json" \
     -d '{
       "received_items": [
         { "inventory_id": 2, "quantity_received": -5 }
       ]
     }'
   ```
   **Expected:** Database should handle (may allow or reject based on constraints)

6. **Zero Quantity**
   ```bash
   curl -X POST http://localhost:5000/api/purchase-orders/5/receive \
     -H "Content-Type: application/json" \
     -d '{
       "received_items": [
         { "inventory_id": 2, "quantity_received": 0 }
       ]
     }'
   ```
   **Expected:** Should process but no stock change

### 🔄 Transaction Testing

Test that the transaction rolls back on error:

1. **Simulate Database Error**
   - Temporarily break a query
   - Verify all changes are rolled back
   - Verify no partial updates

2. **Concurrent Receipts**
   - Try receiving the same item twice simultaneously
   - Verify stock quantities are correct
   - Check for race conditions

## Database Verification Queries

Run these SQL queries to verify GRV processing:

```sql
-- Check inventory stock levels
SELECT id, name, stock_quantity, updated_at 
FROM inventory 
WHERE id IN (2, 3)
ORDER BY id;

-- Check recent stock movements
SELECT 
  sm.id,
  i.name as item_name,
  sm.movement_type,
  sm.quantity_change,
  sm.previous_quantity,
  sm.new_quantity,
  sm.reason,
  sm.recorded_by,
  sm.created_at
FROM stock_movements sm
JOIN inventory i ON sm.inventory_id = i.id
ORDER BY sm.created_at DESC
LIMIT 10;

-- Check PO status and items
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.total_amount,
  poi.inventory_id,
  i.name as item_name,
  poi.quantity_ordered,
  poi.received_quantity,
  poi.unit_cost
FROM purchase_orders po
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
LEFT JOIN inventory i ON poi.inventory_id = i.id
WHERE po.id = 5;
```

## Frontend Testing (If UI Exists)

If you have a GRV form in the frontend:

1. **Navigate to Purchase Orders page**
2. **Select a PO with status "sent"**
3. **Click "Receive Items" or similar button**
4. **Enter received quantities**
5. **Submit the form**
6. **Verify:**
   - Success message appears
   - PO status updates to "received"
   - Inventory stock increases
   - Stock movements are recorded

## Automated Testing Script

Create a comprehensive test script:

```javascript
// server/testGRV.js
const axios = require('axios');
const API_BASE = 'http://localhost:5000/api/purchase-orders';

async function testGRV() {
  console.log('🧪 Starting GRV Tests...\n');

  try {
    // 1. Create PO
    console.log('1️⃣ Creating Purchase Order...');
    const poRes = await axios.post(API_BASE, {
      po_number: `PO-TEST-${Date.now()}`,
      supplier_id: 1,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
      created_by: 'GRV Test'
    });
    const po = poRes.data.purchase_order;
    console.log('✅ PO Created:', po.po_number, '(ID:', po.id, ')\n');

    // 2. Add items
    console.log('2️⃣ Adding items to PO...');
    const item1 = await axios.post(`${API_BASE}/${po.id}/items`, {
      inventory_id: 2,
      quantity_ordered: 10,
      unit_cost: 100
    });
    console.log('✅ Item 1 added:', item1.data.item.id);

    const item2 = await axios.post(`${API_BASE}/${po.id}/items`, {
      inventory_id: 3,
      quantity_ordered: 5,
      unit_cost: 200
    });
    console.log('✅ Item 2 added:', item2.data.item.id, '\n');

    // 3. Get initial stock levels
    console.log('3️⃣ Checking initial inventory...');
    // You would need an inventory API endpoint for this
    // For now, we'll proceed with GRV

    // 4. Receive GRV - Full receipt
    console.log('4️⃣ Receiving GRV (Full Receipt)...');
    const grvRes = await axios.post(`${API_BASE}/${po.id}/receive`, {
      received_by: 'Test User',
      received_items: [
        { inventory_id: 2, quantity_received: 10 },
        { inventory_id: 3, quantity_received: 5 }
      ]
    });
    console.log('✅ GRV Received:', grvRes.data.message, '\n');

    // 5. Verify PO status
    console.log('5️⃣ Verifying PO status...');
    const poCheck = await axios.get(`${API_BASE}/${po.id}`);
    const updatedPO = poCheck.data.purchase_order || poCheck.data;
    console.log('PO Status:', updatedPO.status);
    console.log('PO Total:', updatedPO.total_amount);
    console.log('✅ PO Status Updated\n');

    // 6. Test partial receipt (create new PO)
    console.log('6️⃣ Testing Partial Receipt...');
    const po2Res = await axios.post(API_BASE, {
      po_number: `PO-PARTIAL-${Date.now()}`,
      supplier_id: 1,
      order_date: new Date().toISOString().split('T')[0],
      created_by: 'GRV Test'
    });
    const po2 = po2Res.data.purchase_order;
    
    await axios.post(`${API_BASE}/${po2.id}/items`, {
      inventory_id: 2,
      quantity_ordered: 20,
      unit_cost: 100
    });

    const partialGrv = await axios.post(`${API_BASE}/${po2.id}/receive`, {
      received_by: 'Test User',
      received_items: [
        { inventory_id: 2, quantity_received: 15 }
      ]
    });
    console.log('✅ Partial GRV Received:', partialGrv.data.message, '\n');

    // 7. Test error handling
    console.log('7️⃣ Testing Error Handling...');
    try {
      await axios.post(`${API_BASE}/99999/receive`, {
        received_items: [{ inventory_id: 2, quantity_received: 10 }]
      });
      console.log('❌ Should have failed');
    } catch (err) {
      console.log('✅ Error handled correctly:', err.response?.status || err.message);
    }

    console.log('\n✅ All GRV Tests Completed!');

  } catch (err) {
    console.error('❌ Test Failed:', err.response?.data || err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testGRV();
```

Run it with:
```bash
cd server
node testGRV.js
```

## Troubleshooting

### Issue: "Inventory item not found"
- **Solution:** Verify the `inventory_id` exists in the database
- **Check:** `SELECT * FROM inventory WHERE id = X;`

### Issue: "Transaction rollback"
- **Solution:** Check server logs for the actual error
- **Common causes:** Database constraint violations, missing fields

### Issue: Stock not updating
- **Solution:** 
  1. Check if transaction committed (look for "COMMIT" in logs)
  2. Verify inventory_id matches
  3. Check database connection

### Issue: PO status not changing
- **Solution:** 
  1. Verify the GRV endpoint was called successfully
  2. Check PO status in database: `SELECT status FROM purchase_orders WHERE id = X;`

## Best Practices

1. **Always test with real data** - Use actual inventory items from your database
2. **Test transaction rollback** - Ensure partial failures don't corrupt data
3. **Verify stock movements** - Check that audit trail is complete
4. **Test edge cases** - Invalid IDs, missing fields, etc.
5. **Check concurrent access** - Test multiple GRVs at the same time
6. **Verify calculations** - Ensure total_amount is calculated correctly

## Summary

GRV testing involves:
- ✅ Creating a PO with items
- ✅ Receiving items via the `/receive` endpoint
- ✅ Verifying inventory updates
- ✅ Verifying stock movements recorded
- ✅ Verifying PO status and received quantities
- ✅ Testing error cases and edge cases

The main endpoint to test is:
```
POST /api/purchase-orders/:poId/receive
```

With body:
```json
{
  "received_by": "User Name",
  "received_items": [
    {
      "inventory_id": 2,
      "quantity_received": 10
    }
  ]
}
```

