# Purchase Order Supplier Integration & Manual Email Entry

## Overview

The Purchase Order system now supports:
1. **Manual Email Entry** - Override supplier email from database for specific POs
2. **Supplier System Integration** - Connect with supplier systems (like 4POS) to automatically fetch items

## Features Added

### 1. Manual Email Entry

**What it does:**
- Allows you to enter a different email address for a specific PO, even if the supplier has an email in the database
- Useful when a supplier has multiple email addresses or you need to send to a specific contact

**How to use:**
1. Create a new Purchase Order
2. Select the supplier from dropdown
3. Check "Use different email address for this PO"
4. Enter the email address
5. The PO will be sent to this email instead of the supplier's default email

**Database Changes:**
- Added `manual_supplier_email` field to `purchase_orders` table
- Email priority: `manual_supplier_email` > `supplier.email` (from database)

### 2. Supplier System Integration

**What it does:**
- Connect with supplier systems (like 4POS) to automatically fetch available items
- When creating a PO, you can pull items directly from the supplier's system

**Database Changes:**
Added to `suppliers` table:
- `supplier_system_type` - Type of system (e.g., '4POS', 'MANUAL', 'OTHER')
- `supplier_system_id` - Supplier ID in their system
- `supplier_api_endpoint` - API endpoint to fetch items
- `supplier_api_key` - API key for authentication

**How to set up:**

1. **Add supplier with integration:**
```sql
UPDATE suppliers 
SET 
  supplier_system_type = '4POS',
  supplier_system_id = 'SUPPLIER-123',
  supplier_api_endpoint = 'https://api.4pos.com/suppliers/SUPPLIER-123/items',
  supplier_api_key = 'your-api-key-here'
WHERE name = 'Supplier Name';
```

2. **Use the integration:**
- When creating a PO, if supplier has integration, you can fetch items from their system
- API endpoint: `GET /api/purchase-orders/suppliers/:supplierId/items`
- Returns items available from that supplier

**API Response Format:**
```json
{
  "success": true,
  "items": [
    {
      "id": "item-123",
      "name": "Pine Coffin",
      "price": 2500.00,
      "available": true
    }
  ],
  "supplier_system": "4POS",
  "message": "Items fetched from 4POS system"
}
```

## Implementation Details

### Frontend Changes

**File: `client/src/components/PurchaseOrders/POForm.jsx`**
- Added checkbox to toggle manual email entry
- Added email input field (shown when checkbox is checked)
- Sends `manual_supplier_email` in PO creation request

### Backend Changes

**File: `server/routes/purchaseOrders.js`**
- Updated PO creation to accept `manual_supplier_email`
- Updated email sending to use `COALESCE(po.manual_supplier_email, s.email)` - uses manual email if provided, otherwise database email
- Added endpoint: `GET /api/purchase-orders/suppliers/:supplierId/items` to fetch items from supplier systems
- Updated suppliers endpoint to return integration fields

**File: `server/database/schema.sql`**
- Added `manual_supplier_email` to `purchase_orders` table
- Added integration fields to `suppliers` table

## Usage Examples

### Example 1: Manual Email Entry

**Scenario:** Supplier "ABC Coffins" has email `orders@abc.co.za` in database, but for this specific PO you need to send to `urgent@abc.co.za`

1. Create PO
2. Select "ABC Coffins" as supplier
3. Check "Use different email address for this PO"
4. Enter `urgent@abc.co.za`
5. PO will be sent to `urgent@abc.co.za` instead of `orders@abc.co.za`

### Example 2: Supplier System Integration

**Scenario:** Supplier "4POS Supplier" has 4POS integration

1. Supplier is configured with:
   - `supplier_system_type = '4POS'`
   - `supplier_api_endpoint = 'https://api.4pos.com/items'`
   - `supplier_api_key = 'abc123'`

2. When creating PO:
   - Frontend can call: `GET /api/purchase-orders/suppliers/1/items`
   - System fetches items from 4POS API
   - Items are returned and can be added to PO

3. Items from supplier system can be matched with your inventory or added as new items

## Migration Notes

### Database Migration

If you have an existing database, run these SQL commands:

```sql
-- Add manual email field to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS manual_supplier_email VARCHAR(120);

-- Add integration fields to suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS supplier_system_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS supplier_system_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS supplier_api_endpoint VARCHAR(255),
ADD COLUMN IF NOT EXISTS supplier_api_key VARCHAR(255);
```

## Future Enhancements

Potential improvements:
1. **UI for Supplier Integration Setup** - Form to configure supplier integrations
2. **Item Mapping** - Map supplier system items to your inventory items
3. **Automatic Price Sync** - Sync prices from supplier system
4. **Order Status Tracking** - Track order status through supplier system API
5. **Multiple Integration Types** - Support for different supplier systems (not just 4POS)

## Testing

### Test Manual Email Entry

1. Create a PO with a supplier that has email in database
2. Check "Use different email address"
3. Enter a test email
4. Send PO
5. Verify email goes to the manual email, not database email

### Test Supplier Integration

1. Configure a supplier with integration fields
2. Call `GET /api/purchase-orders/suppliers/:id/items`
3. Verify items are fetched from supplier system
4. Test error handling (invalid API, no integration, etc.)

## Notes

- Manual email is per-PO, not per-supplier
- Supplier integration is optional - suppliers without integration work as before
- API keys should be stored securely (consider encryption)
- Supplier system API should return items in a consistent format

