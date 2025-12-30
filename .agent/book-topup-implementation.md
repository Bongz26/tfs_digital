# Book Top-Up Feature Implementation Plan

## Overview
Add ability to top up case value using insurance books/policies, similar to existing cash top-up.

## Database Changes (COMPLETED ✅)
File: `server/database/migrate-add-book-topup.sql`

Added columns to `cases` table:
- `top_up_type` VARCHAR(20) DEFAULT 'cash' - Type: 'cash', 'book', or 'multiple_books'
- `top_up_reference` VARCHAR(255) - Store book number(s)

## Backend Changes (TODO)

### 1. Update `casesController.js` - `createCase` function
**File**: `server/controllers/casesController.js`

**Line 208-230**: Add to destructuring:
```javascript
const {
    // ... existing fields ...
    top_up_amount, 
    top_up_type,        // NEW
    top_up_reference,   // NEW
    // ... rest
} = req.body;
```

**Line 345-372**: Update INSERT statement:
- Add columns: `top_up_type, top_up_reference`
- Add to VALUES: `$52, $53`

**Line 373-386**: Update parameter array:
- Add after top_up_amount: `top_up_type || 'cash', top_up_reference || null`

### 2. Update `casesController.js` - `updateCase` function  
Similar changes to handle updating these fields.

## Frontend Changes (TODO)

### 1. Update `ConsultationForm.jsx`
**Add state**:
```javascript
const [topUpType, setTopUpType] = useState('none'); // 'none', 'cash', 'book'
const [topUpReference, setTopUpReference] = useState('');
```

**Add UI**:
```jsx
<div className="form-group">
  <label>Top-Up Method</label>
  <select value={topUpType} onChange={(e) => setTopUpType(e.target.value)}>
    <option value="none">None</option>
    <option value="cash">Cash Payment</option>
    <option value="book">Insurance Book</option>
  </select>
</div>

{topUpType === 'book' && (
  <div className="form-group">
    <label>Book Number(s)</label>
    <input 
      type="text"
      placeholder="Enter book number (or comma-separated for multiple)"
      value={topUpReference}
      onChange={(e) => setTopUpReference(e.target.value)}
    />
    <small>Separate multiple book numbers with commas</small>
  </div>
)}

{(topUpType === 'cash' || topUpType === 'book') && (
  <div className="form-group">
    <label>Top-Up Amount (R)</label>
    <input 
      type="number"
      value={formData.top_up_amount || ''}
      onChange={(e) => setFormData({...formData, top_up_amount: e.target.value})}
    />
  </div>
)}
```

**Update submission**:
```javascript
const submitData = {
  ...formData,
  top_up_type: topUpType,
  top_up_reference: topUpType === 'book' ? topUpReference : null,
  top_up_amount: (topUpType === 'cash' || topUpType === 'book') ? formData.top_up_amount : 0
};
```

### 2. Update `CaseDetails.jsx` (Display view)
Show top-up information:
```jsx
{case.top_up_amount > 0 && (
  <div className="detail-row">
    <strong>Top-Up:</strong> 
    R{case.top_up_amount} 
    ({case.top_up_type === 'book' ? `Book: ${case.top_up_reference}` : 'Cash'})
  </div>
)}
```

## Testing Plan

1. **Run Database Migration**
   - Execute on local PostgreSQL
   - Execute on Render (Supabase dashboard)

2. **Test Cash Top-Up** (ensure no regression)
   - Create case with cash top-up
   - Verify amount saves correctly

3. **Test Book Top-Up**
   - Create case with single book
   - Verify book number and amount save
   - Check receipt displays correctly

4. **Test Multiple Books**
   - Enter multiple book numbers (comma-separated)
   - Verify storage and display

5. **Test No Top-Up**
   - Create case without top-up
   - Verify defaults work

## Deployment Steps

1. ✅ Create migration SQL file
2. ⏳ Update backend controller
3. ⏳ Update frontend form
4. ⏳ Run migration on local DB
5. ⏳ Test locally
6. ⏳ Push to GitHub
7. ⏳ Run migration on Render/Supabase
8. ⏳ Verify in production

## Notes
- Existing `top_up_amount` logic unchanged
- Casket selection still based on total_price (original + top_up)
- Book validation happens externally (Policy 24)
- This system just tracks reference for audit purposes
