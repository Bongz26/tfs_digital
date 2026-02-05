# Purchase Order Logic & Test Cases

## 📋 Overview

The Purchase Order (PO) system manages procurement workflows from creation to delivery. This document explains the logic and provides comprehensive test cases for all scenarios.

---

## 🔄 Purchase Order Lifecycle

```
Create PO → Draft → Send to Supplier → Sent → Receive Items → Partial/Received → Completed
                ↓
             Cancelled (if needed)
```

---

## 📊 PO Status Flow

### Status Definitions

1. **`draft`** (Default)
   - Initial status when PO is created
   - Can be edited/deleted
   - No items sent to supplier yet
   - **Allowed actions:** Edit, Delete, Add Items, Remove Items, Send to Supplier

2. **`sent`**
   - PO has been emailed to supplier
   - Cannot be edited or deleted
   - **Allowed actions:** Receive GRV only

3. **`partial`**
   - Some items received, but not all
   - Automatically set when receiving partial quantities
   - **Allowed actions:** Receive more items

4. **`received`**
   - All items fully received
   - Automatically set when all items are received
   - **Allowed actions:** None (final status)

5. **`completed`**
   - PO is fully processed (optional manual status)
   - **Allowed actions:** None

6. **`cancelled`**
   - PO was cancelled
   - **Allowed actions:** None

### Status Transitions

```
draft → sent → partial → received
   ↓            ↓
cancelled   received (if all items received)
```

---

## 💰 Price Logic

### Core Principles

1. **Inventory is source of truth** - Prices are fetched from `inventory.unit_price` first
2. **Manual override** - Users can override prices when creating PO items
3. **Backend validation** - Backend always validates and corrects prices

### Price Fetching Flow

```
Frontend:
  1. User selects item from inventory
  2. System auto-fills price from inventory.unit_price
  3. User can override price if needed
  4. If price is empty/0, backend will fetch from inventory

Backend:
  1. Check if unit_cost provided and valid (> 0)
  2. If valid → use provided price
  3. If invalid/missing → fetch from inventory.unit_price
  4. If inventory price missing → use 0 (with warning)
```

### Price Scenarios

| Scenario | Frontend Behavior | Backend Behavior |
|----------|------------------|------------------|
| Item with price in inventory | Auto-fills price | Uses inventory price if not provided |
| Item without price in inventory | Shows "Auto" | Fetches from inventory, uses 0 if null |
| User provides valid price (> 0) | User enters price | Uses provided price |
| User provides invalid price (0, empty, string) | Shows as 0 | Ignores invalid, uses inventory price |
| Item not found in inventory | Error message | Returns 404 error |

---

## 🔧 API Endpoints

### 1. Create Purchase Order
**Endpoint:** `POST /api/purchase-orders`

**Request Body:**
```json
{
  "po_number": "PO-2025-001",
  "supplier_id": 1,              // Optional - if supplier exists
  "supplier_name": "ABC Supplies", // Required
  "order_date": "2025-01-15",
  "expected_delivery": "2025-01-20", // Optional
  "created_by": "user@example.com",
  "manual_supplier_email": "supplier@example.com", // Optional
  "items": [                      // Optional - can add items later
    {
      "inventory_id": 1,
      "quantity_ordered": 10,
      "unit_cost": 150.00        // Optional - will fetch from inventory if not provided
    }
  ]
}
```

**Logic:**
1. Validates required fields (`po_number`, `order_date`, `supplier_name`)
2. Resolves supplier:
   - If `supplier_id` provided → verifies exists
   - If `supplier_id` missing → searches by `supplier_name`
   - If not found → creates new supplier
3. Creates PO with status `draft`
4. For each item:
   - Fetches price from inventory
   - Uses provided `unit_cost` if valid (> 0)
   - Otherwise uses inventory price
   - Defaults to 0 if inventory price missing
5. Returns created PO with items

---

### 2. Add Item to Purchase Order
**Endpoint:** `POST /api/purchase-orders/:poId/items`

**Request Body:**
```json
{
  "inventory_id": 2,
  "quantity_ordered": 5,
  "unit_cost": 200.00  // Optional
}
```

**Logic:**
1. Validates `inventory_id` exists
2. Fetches price from inventory
3. Uses provided `unit_cost` if valid (> 0), otherwise uses inventory price
4. Adds item to existing PO
5. PO must be in `draft` status (enforced by UI, not backend)

---

### 3. Update Purchase Order
**Endpoint:** `PUT /api/purchase-orders/:id`

**Request Body:**
```json
{
  "po_number": "PO-2025-001-UPDATED",
  "order_date": "2025-01-16",
  "expected_delivery": "2025-01-21",
  "manual_supplier_email": "newemail@example.com"
}
```

**Logic:**
1. Only updates if PO status is `draft`
2. Uses `COALESCE` to update only provided fields
3. Returns updated PO or 404/400 error

---

### 4. Delete Purchase Order
**Endpoint:** `DELETE /api/purchase-orders/:id`

**Logic:**
1. Only deletes if PO status is `draft`
2. Deletes all associated items first
3. Then deletes PO
4. Returns success or error

---

### 5. Send/Process Purchase Order
**Endpoint:** `POST /api/purchase-orders/:poId/process`

**Request Body:**
```json
{
  "admin_email": "admin@example.com"  // Optional - CC copy
}
```

**Logic:**
1. Validates PO exists and has items
2. Calculates totals (subtotal, VAT 15%, total)
3. Generates HTML email with PO details
4. Sends email to supplier (from `supplier.email` or `manual_supplier_email`)
5. Sends copy to admin if `admin_email` provided
6. Updates PO status to `sent` if email sent successfully
7. Returns email status

**Requirements:**
- SMTP credentials must be configured (`SMTP_USER`, `SMTP_PASS`)
- PO must have at least one item
- Supplier must have email address

---

### 6. Receive GRV (Goods Received Voucher)
**Endpoint:** `POST /api/purchase-orders/:poId/receive`

**Request Body:**
```json
{
  "received_items": [
    {
      "inventory_id": 1,
      "quantity_received": 8,
      "new_unit_cost": 155.00  // Optional - updates inventory price
    }
  ],
  "received_by": "staff@example.com"
}
```

**Logic:**
1. For each received item:
   - Updates inventory stock: `stock_quantity = previous + quantity_received`
   - Updates inventory price if `new_unit_cost` provided
   - Creates stock movement record
   - **Increments** `received_quantity` in PO item (doesn't overwrite)
2. Checks if all items fully received:
   - If all items `received_quantity >= quantity_ordered` → status = `received`
   - If any item partially received → status = `partial`
3. Updates PO status accordingly
4. Uses database transaction (rollback on error)

**Important Notes:**
- `received_quantity` is **incremented**, not set (supports multiple GRV receipts)
- Stock is added to inventory immediately
- Price update is optional
- Status auto-updates based on completion

---

### 7. Get All Purchase Orders
**Endpoint:** `GET /api/purchase-orders`

**Logic:**
1. Fetches all POs ordered by `order_date DESC`
2. For each PO, fetches associated items with inventory details
3. Returns array of POs with nested items

---

### 8. Get Suppliers
**Endpoint:** `GET /api/purchase-orders/suppliers`

**Logic:**
1. Returns all suppliers ordered by name
2. Includes supplier system details (for API integration)

---

## ✅ Test Cases

### **TC-1: Create PO - Basic Happy Path**
**Description:** Create a PO with all required fields and items with prices

**Steps:**
1. Create PO with:
   - `po_number`: "PO-2025-001"
   - `supplier_name`: "ABC Supplies"
   - `order_date`: "2025-01-15"
   - `manual_supplier_email`: "abc@example.com"
   - `items`: [{"inventory_id": 1, "quantity_ordered": 10, "unit_cost": 150.00}]

**Expected Result:**
- ✅ PO created with status `draft`
- ✅ Supplier created/found
- ✅ Item added with correct price
- ✅ Returns 201 with PO details

**Validation:**
- Check database: `purchase_orders` table has new record
- Check `purchase_order_items` has item with `unit_cost = 150.00`
- Check `suppliers` table has supplier

---

### **TC-2: Create PO - Auto Price from Inventory**
**Description:** Create PO item without providing price (should use inventory price)

**Steps:**
1. Ensure inventory item ID 1 has `unit_price = 200.00`
2. Create PO with item: `{"inventory_id": 1, "quantity_ordered": 5, "unit_cost": 0}`

**Expected Result:**
- ✅ PO created successfully
- ✅ Item uses inventory price (200.00)
- ✅ Backend logs: "Using inventory price: R200.00"

**Validation:**
- Check `purchase_order_items.unit_cost = 200.00`
- Check backend logs for price source

---

### **TC-3: Create PO - Invalid Price Provided**
**Description:** Provide invalid price (0, empty, string), should use inventory price

**Test Cases:**
1. `unit_cost: 0` → Should use inventory price
2. `unit_cost: ""` → Should use inventory price
3. `unit_cost: null` → Should use inventory price
4. `unit_cost: "abc"` → Should use inventory price

**Expected Result:**
- ✅ PO created successfully
- ✅ Invalid price ignored
- ✅ Inventory price used
- ✅ Backend logs warning

---

### **TC-4: Create PO - Item Without Inventory Price**
**Description:** Create PO item where inventory has no price (null/0)

**Steps:**
1. Update inventory item: `unit_price = NULL`
2. Create PO with item (no `unit_cost` provided)

**Expected Result:**
- ✅ PO created successfully
- ✅ Item `unit_cost = 0`
- ✅ Backend logs: "Inventory item not found, using default price 0"

**Validation:**
- Check `purchase_order_items.unit_cost = 0`

---

### **TC-5: Create PO - Multiple Items**
**Description:** Create PO with multiple items (some with prices, some without)

**Steps:**
1. Create PO with 3 items:
   - Item 1: Has price in inventory, no `unit_cost` provided
   - Item 2: Has `unit_cost` provided (overrides inventory)
   - Item 3: No price in inventory, no `unit_cost` provided

**Expected Result:**
- ✅ All 3 items added correctly
- ✅ Item 1 uses inventory price
- ✅ Item 2 uses provided price
- ✅ Item 3 uses 0

---

### **TC-6: Create PO - Existing Supplier by ID**
**Description:** Create PO using existing supplier ID

**Steps:**
1. Ensure supplier ID 1 exists
2. Create PO with `supplier_id: 1` and `supplier_name: "Test"`

**Expected Result:**
- ✅ PO uses existing supplier ID 1
- ✅ No new supplier created

---

### **TC-7: Create PO - Existing Supplier by Name**
**Description:** Create PO with supplier name that already exists (no ID provided)

**Steps:**
1. Ensure supplier "ABC Supplies" exists (ID 1)
2. Create PO with `supplier_name: "ABC Supplies"` (no `supplier_id`)

**Expected Result:**
- ✅ PO uses existing supplier ID 1
- ✅ No duplicate supplier created

---

### **TC-8: Create PO - New Supplier Creation**
**Description:** Create PO with new supplier name

**Steps:**
1. Create PO with `supplier_name: "New Supplier XYZ"` (doesn't exist)

**Expected Result:**
- ✅ New supplier created in `suppliers` table
- ✅ PO linked to new supplier
- ✅ Supplier email set if provided

---

### **TC-9: Create PO - Missing Required Fields**
**Description:** Attempt to create PO without required fields

**Test Cases:**
1. Missing `po_number` → Should return 400 error
2. Missing `order_date` → Should return 400 error
3. Missing `supplier_name` → Should return 400 error

**Expected Result:**
- ❌ Request rejected with 400 status
- ❌ Error message indicates missing field
- ❌ No PO created

---

### **TC-10: Add Item to PO**
**Description:** Add item to existing draft PO

**Steps:**
1. Create PO (draft status)
2. Add item: `{"inventory_id": 2, "quantity_ordered": 5, "unit_cost": 200.00}`

**Expected Result:**
- ✅ Item added to PO
- ✅ Price logic applies (uses provided or inventory price)
- ✅ Returns item details

---

### **TC-11: Add Item - Invalid Inventory ID**
**Description:** Add item with non-existent inventory ID

**Steps:**
1. Add item: `{"inventory_id": 99999, "quantity_ordered": 5}`

**Expected Result:**
- ❌ Returns 404 error
- ❌ Error: "Inventory item not found"
- ❌ No item added

---

### **TC-12: Update PO - Draft Status**
**Description:** Update PO that is in draft status

**Steps:**
1. Create PO (status: `draft`)
2. Update: `{"po_number": "PO-UPDATED", "order_date": "2025-01-20"}`

**Expected Result:**
- ✅ PO updated successfully
- ✅ Fields changed as provided
- ✅ Other fields unchanged

---

### **TC-13: Update PO - Non-Draft Status**
**Description:** Attempt to update PO that is not in draft status

**Steps:**
1. Create and send PO (status: `sent`)
2. Attempt to update PO

**Expected Result:**
- ❌ Returns 404 error
- ❌ Error: "Purchase order not found or not in draft status"
- ❌ PO not updated

---

### **TC-14: Delete PO - Draft Status**
**Description:** Delete PO in draft status

**Steps:**
1. Create PO (status: `draft`) with items
2. Delete PO

**Expected Result:**
- ✅ PO deleted
- ✅ All items deleted (cascade or manual)
- ✅ Returns success message

---

### **TC-15: Delete PO - Non-Draft Status**
**Description:** Attempt to delete PO that is not in draft status

**Steps:**
1. Create and send PO (status: `sent`)
2. Attempt to delete PO

**Expected Result:**
- ❌ Returns 400 error
- ❌ Error: "Only draft purchase orders can be deleted"
- ❌ PO not deleted

---

### **TC-16: Send PO - Happy Path**
**Description:** Send PO to supplier via email

**Prerequisites:**
- SMTP configured
- PO has items
- Supplier has email

**Steps:**
1. Create PO with items (status: `draft`)
2. Send PO: `{"admin_email": "admin@example.com"}`

**Expected Result:**
- ✅ Email sent to supplier
- ✅ Copy sent to admin
- ✅ PO status updated to `sent`
- ✅ Returns email status

**Validation:**
- Check email inboxes
- Check `purchase_orders.status = 'sent'`

---

### **TC-17: Send PO - No Items**
**Description:** Attempt to send PO without items

**Steps:**
1. Create PO (no items)
2. Attempt to send PO

**Expected Result:**
- ❌ Returns 400 error
- ❌ Error: "Purchase order has no items"
- ❌ Status remains `draft`

---

### **TC-18: Send PO - No Email Configuration**
**Description:** Attempt to send PO without SMTP configuration

**Prerequisites:**
- Remove SMTP credentials from `.env`

**Steps:**
1. Create PO with items
2. Attempt to send PO

**Expected Result:**
- ❌ Returns 500 error
- ❌ Error: "Email configuration missing"
- ❌ Status remains `draft`

---

### **TC-19: Send PO - Supplier Has No Email**
**Description:** Attempt to send PO when supplier has no email

**Steps:**
1. Create PO with supplier that has no email
2. Attempt to send PO

**Expected Result:**
- ❌ Returns 400 error
- ❌ Error: "Supplier email not found"
- ❌ Status remains `draft`

---

### **TC-20: Receive GRV - Full Receipt**
**Description:** Receive all items in full quantity

**Steps:**
1. Create and send PO with:
   - Item 1: `quantity_ordered: 10`
   - Item 2: `quantity_ordered: 5`
2. Receive GRV:
   ```json
   {
     "received_items": [
       {"inventory_id": 1, "quantity_received": 10},
       {"inventory_id": 2, "quantity_received": 5}
     ],
     "received_by": "staff@example.com"
   }
   ```

**Expected Result:**
- ✅ Inventory stock increased for both items
- ✅ Stock movements created
- ✅ PO items `received_quantity` updated
- ✅ PO status = `received`
- ✅ All items show `received_quantity >= quantity_ordered`

**Validation:**
- Check inventory `stock_quantity` increased
- Check `stock_movements` table has records
- Check `purchase_order_items.received_quantity`
- Check `purchase_orders.status = 'received'`

---

### **TC-21: Receive GRV - Partial Receipt**
**Description:** Receive partial quantities (not all items fully received)

**Steps:**
1. Create and send PO with:
   - Item 1: `quantity_ordered: 10`
   - Item 2: `quantity_ordered: 5`
2. Receive GRV:
   ```json
   {
     "received_items": [
       {"inventory_id": 1, "quantity_received": 8},
       {"inventory_id": 2, "quantity_received": 5}
     ]
   }
   ```

**Expected Result:**
- ✅ Inventory stock increased
- ✅ PO status = `partial` (item 1 not fully received)
- ✅ Item 1: `received_quantity = 8`
- ✅ Item 2: `received_quantity = 5`

---

### **TC-22: Receive GRV - Multiple Receipts**
**Description:** Receive items in multiple GRV batches (incremental)

**Steps:**
1. Create and send PO: Item 1 `quantity_ordered: 10`
2. First GRV: `quantity_received: 5`
3. Second GRV: `quantity_received: 5`

**Expected Result:**
- ✅ After first GRV: `received_quantity = 5`, status = `partial`
- ✅ After second GRV: `received_quantity = 10`, status = `received`
- ✅ Stock incremented correctly (5 + 5 = 10)

**Validation:**
- Check `received_quantity` is incremented, not overwritten

---

### **TC-23: Receive GRV - Update Inventory Price**
**Description:** Receive GRV and update inventory price

**Steps:**
1. Create PO with item (inventory `unit_price = 100.00`)
2. Receive GRV with `new_unit_cost: 110.00`

**Expected Result:**
- ✅ Inventory stock increased
- ✅ Inventory `unit_price` updated to 110.00
- ✅ Stock movement recorded

**Validation:**
- Check `inventory.unit_price = 110.00`

---

### **TC-24: Receive GRV - Item Not Found**
**Description:** Receive GRV with invalid inventory ID

**Steps:**
1. Receive GRV: `{"inventory_id": 99999, "quantity_received": 5}`

**Expected Result:**
- ❌ Transaction rolled back
- ❌ Returns 500 error
- ❌ Error: "Inventory item 99999 not found"
- ❌ No changes made

---

### **TC-25: Receive GRV - Wrong Inventory ID**
**Description:** Receive GRV with inventory ID not in PO

**Steps:**
1. Create PO with item ID 1
2. Receive GRV with item ID 2 (not in PO)

**Expected Result:**
- ⚠️ Receives item (no validation against PO items)
- ✅ Stock updated for item 2
- ⚠️ PO item not updated (item 2 not in PO)

**Note:** This is current behavior - consider adding validation

---

### **TC-26: Get All POs**
**Description:** Fetch all purchase orders with items

**Steps:**
1. Create multiple POs (different statuses)
2. GET `/api/purchase-orders`

**Expected Result:**
- ✅ Returns all POs
- ✅ Each PO includes nested items
- ✅ Items include inventory details (name, SKU, current price)
- ✅ Ordered by `order_date DESC`

---

### **TC-27: Get All POs - Empty Database**
**Description:** Fetch POs when none exist

**Steps:**
1. Ensure no POs in database
2. GET `/api/purchase-orders`

**Expected Result:**
- ✅ Returns empty array: `{"success": true, "purchase_orders": []}`

---

### **TC-28: Get All POs - PO With No Items**
**Description:** Fetch POs including those without items

**Steps:**
1. Create PO without items
2. GET `/api/purchase-orders`

**Expected Result:**
- ✅ PO returned with `items: []`

---

### **TC-29: Frontend - Auto-fill Price on Item Selection**
**Description:** Test frontend auto-fill of price when item selected

**Steps:**
1. Open PO form
2. Select item from inventory dropdown
3. Observe `unit_cost` field

**Expected Result:**
- ✅ `unit_cost` auto-fills with `inventory.unit_price`
- ✅ User can override price
- ✅ If inventory has no price, field remains empty

---

### **TC-30: Frontend - Display "Auto" for Missing Prices**
**Description:** Test UI display when item has no price

**Steps:**
1. Add item to PO without price (or price = 0)
2. Observe items table

**Expected Result:**
- ✅ Unit Cost column shows "Auto" (italic, gray)
- ✅ Total column shows "TBD" (italic, gray)

---

### **TC-31: Frontend - Supplier Selection Auto-fills Email**
**Description:** Test auto-fill of supplier email when supplier selected

**Steps:**
1. Open PO form
2. Select existing supplier from dropdown
3. Observe email field

**Expected Result:**
- ✅ Email field auto-fills with `supplier.email`
- ✅ User can override email

---

### **TC-32: Frontend - Validation - Missing Required Fields**
**Description:** Test form validation for required fields

**Test Cases:**
1. Submit without PO number → Alert shown
2. Submit without supplier → Alert shown
3. Submit without email → Alert shown
4. Submit without order date → Alert shown
5. Submit without items → Alert shown

**Expected Result:**
- ❌ Form not submitted
- ❌ Alert/error message shown
- ❌ Required field highlighted

---

### **TC-33: Database Constraint - PO Status**
**Description:** Test database constraint on PO status

**Steps:**
1. Attempt to insert PO with invalid status: `status = 'invalid_status'`

**Expected Result:**
- ❌ Database error: "violates check constraint"
- ❌ Only valid statuses allowed: `draft`, `sent`, `partial`, `received`, `completed`, `cancelled`

---

### **TC-34: Concurrent Receipts - Race Condition**
**Description:** Test multiple GRV receipts happening simultaneously

**Steps:**
1. Create PO: Item 1 `quantity_ordered: 10`
2. Send two simultaneous requests:
   - Request A: `quantity_received: 5`
   - Request B: `quantity_received: 5`

**Expected Result:**
- ✅ Database transaction prevents race condition
- ✅ Final `received_quantity = 10`
- ✅ Stock correctly updated

**Note:** Transaction isolation level matters

---

### **TC-35: Email Format - HTML Content**
**Description:** Verify email contains correct HTML format

**Steps:**
1. Send PO via email
2. Check received email

**Expected Result:**
- ✅ Email is HTML formatted
- ✅ Contains PO number, supplier, date
- ✅ Items table with columns: Item, Quantity, Unit Price, Total
- ✅ Shows subtotal, VAT (15%), total
- ✅ Professional formatting

---

### **TC-36: Supplier Integration - External API**
**Description:** Test fetching items from supplier's external API

**Steps:**
1. Configure supplier with `supplier_api_endpoint`
2. GET `/api/purchase-orders/suppliers/:supplierId/items`

**Expected Result:**
- ✅ Fetches from external API if configured
- ✅ Falls back to internal inventory if API fails
- ✅ Returns items with source indicator

---

### **TC-37: Error Handling - Database Connection Lost**
**Description:** Test behavior when database connection fails during transaction

**Steps:**
1. Start creating PO
2. Simulate database disconnect mid-transaction

**Expected Result:**
- ✅ Transaction rolled back
- ✅ Error returned to client
- ✅ No partial data saved

---

### **TC-38: Edge Case - Zero Quantity**
**Description:** Test creating PO item with quantity = 0

**Steps:**
1. Create PO item: `{"inventory_id": 1, "quantity_ordered": 0}`

**Expected Result:**
- ⚠️ Current: Allowed (no validation)
- ⚠️ Consider: Add validation to prevent quantity <= 0

---

### **TC-39: Edge Case - Negative Quantity**
**Description:** Test creating PO item with negative quantity

**Steps:**
1. Create PO item: `{"inventory_id": 1, "quantity_ordered": -5}`

**Expected Result:**
- ⚠️ Current: May be allowed (frontend validation needed)
- ⚠️ Consider: Add backend validation

---

### **TC-40: Edge Case - Very Large Quantities**
**Description:** Test with very large numbers

**Steps:**
1. Create PO item: `{"quantity_ordered": 999999999}`

**Expected Result:**
- ✅ Should handle large numbers (database constraint dependent)
- ⚠️ Consider: Add reasonable limits

---

## 🔍 Test Coverage Summary

### Functional Areas

| Area | Test Cases | Coverage |
|------|-----------|----------|
| **PO Creation** | TC-1 to TC-9 | ✅ Complete |
| **Price Logic** | TC-2, TC-3, TC-4, TC-5 | ✅ Complete |
| **Item Management** | TC-10, TC-11 | ✅ Complete |
| **PO Updates** | TC-12, TC-13 | ✅ Complete |
| **PO Deletion** | TC-14, TC-15 | ✅ Complete |
| **Sending PO** | TC-16 to TC-19 | ✅ Complete |
| **Receiving GRV** | TC-20 to TC-25 | ✅ Complete |
| **Data Retrieval** | TC-26 to TC-28 | ✅ Complete |
| **Frontend** | TC-29 to TC-32 | ✅ Complete |
| **Edge Cases** | TC-33 to TC-40 | ✅ Complete |

---

## 🧪 Testing Strategy

### Manual Testing

1. **Smoke Tests** (Critical Path)
   - TC-1, TC-16, TC-20

2. **Happy Path Tests**
   - TC-1 to TC-8, TC-10, TC-12, TC-14, TC-16, TC-20

3. **Error Handling Tests**
   - TC-9, TC-11, TC-13, TC-15, TC-17 to TC-19, TC-24

4. **Edge Case Tests**
   - TC-3, TC-4, TC-22, TC-33 to TC-40

### Automated Testing

**Recommended Test Framework:** Jest + Supertest

**Test Files:**
- `server/tests/controllers/purchaseOrders.test.js`
- `server/tests/integration/purchaseOrderFlow.test.js`

**Key Tests to Automate:**
- Price fetching logic (TC-2 to TC-5)
- Status transitions (TC-20, TC-21)
- Validation (TC-9, TC-11)
- Transaction rollback (TC-24)

---

## 📝 Test Data Setup

### Prerequisites

1. **Inventory Items**
   ```sql
   INSERT INTO inventory (id, name, sku, unit_price, stock_quantity) VALUES
   (1, 'Test Item 1', 'SKU-001', 150.00, 100),
   (2, 'Test Item 2', 'SKU-002', 200.00, 50),
   (3, 'Test Item 3', 'SKU-003', NULL, 25);
   ```

2. **Suppliers**
   ```sql
   INSERT INTO suppliers (id, name, email) VALUES
   (1, 'ABC Supplies', 'abc@example.com'),
   (2, 'XYZ Corp', 'xyz@example.com');
   ```

3. **SMTP Configuration**
   - Set `SMTP_USER` and `SMTP_PASS` in `server/.env`

---

## 🐛 Known Issues & Considerations

### 1. **GRV Validation**
- Current: GRV can receive items not in PO
- Recommendation: Add validation to check item exists in PO

### 2. **Quantity Validation**
- Current: No validation for quantity <= 0
- Recommendation: Add frontend and backend validation

### 3. **Status Management**
- Current: No manual status change to `completed` or `cancelled`
- Recommendation: Add API endpoint for status updates

### 4. **Price History**
- Current: No tracking of price changes
- Recommendation: Consider adding price history table

### 5. **Partial Item Receipts**
- Current: Receives entire item quantity at once
- Recommendation: Consider per-item partial receipts

---

## 📚 Related Documentation

- `UNDERSTANDING_PURCHASE_ORDERS.md` - User guide
- `server/SETUP_PURCHASE_ORDERS.md` - Setup instructions
- `server/API.md` - API documentation
- Database schema: `server/database/schema.sql`

---

## ✅ Checklist for QA

- [ ] All happy path scenarios work
- [ ] Price logic works correctly (inventory vs provided)
- [ ] Status transitions work (draft → sent → partial → received)
- [ ] Email sending works (check inboxes)
- [ ] GRV increments stock correctly
- [ ] GRV updates PO status correctly
- [ ] Cannot edit/delete non-draft POs
- [ ] Validation errors show appropriate messages
- [ ] Database constraints enforced
- [ ] Transactions rollback on errors
- [ ] Frontend auto-fills work
- [ ] UI displays correctly for all scenarios

---

**Last Updated:** 2025-01-15
**Version:** 1.0

