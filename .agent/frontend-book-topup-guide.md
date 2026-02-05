# Frontend Implementation - Book Top-Up Feature

## ✅ Backend Complete
- `createCase` updated to handle `top_up_type` and `top_up_reference`
- Database migration ready: `server/database/migrate-add-book-topup.sql`

## ⏳ Frontend TODO

### File: `client/src/ConsultationForm.jsx`

### Step 1: Add State (around line 361)
```javascript
const [form, setForm] = useState({
  // ...existing fields...
  top_up_amount: 0,
  top_up_type: 'none',        // ADD THIS
  top_up_reference: '',       // ADD THIS
  // ...rest...
});
```

### Step 2: Find the "Top-Up" or "Extras" section in the JSX
Search for where `top_up_amount` is rendered (likely in the "Extras" section)

### Step 3: Replace the current top-up input with:
```jsx
{/* Top-Up Method Selection */}
<div className="form-group">
  <label htmlFor="top_up_type">Top-Up Method</label>
  <select 
    id="top_up_type"
    value={form.top_up_type}
    onChange={(e) => handleInputChange('top_up_type', e.target.value)}
    className="form-control"
  >
    <option value="none">None</option>
    <option value="cash">Cash Payment</option>
    <option value="book">Insurance Book</option>
  </select>
</div>

{/* Book Number Input (only show if "book" selected) */}
{form.top_up_type === 'book' && (
  <div className="form-group">
    <label htmlFor="top_up_reference">Book Number(s)</label>
    <input
      type="text"
      id="top_up_reference"
      value={form.top_up_reference}
      onChange={(e) => handleInputChange('top_up_reference', e.target.value)}
      placeholder="Enter book number (or comma-separated for multiple)"
      className="form-control"
    />
    <small className="form-text text-muted">
      Separate multiple book numbers with commas (e.g., BOOK123, BOOK456)
    </small>
  </div>
)}

{/* Top-Up Amount (only show if cash or book selected) */}
{(form.top_up_type === 'cash' || form.top_up_type === 'book') && (
  <div className="form-group">
    <label htmlFor="top_up_amount">Top-Up Amount (R)</label>
    <input
      type="number"
      id="top_up_amount"
      value={form.top_up_amount || ''}
      onChange={(e) => handleInputChange('top_up_amount', parseFloat(e.target.value) || 0)}
      placeholder="0"
      className="form-control"
      min="0"
    />
  </div>
)}
```

### Step 4: Update form submission
Find where `createCase()` is called with form data. Make sure these fields are included:
```javascript
const submitData = {
  ...form,
  top_up_type: form.top_up_type,
  top_up_reference: form.top_up_type === 'book' ? form.top_up_reference : null,
  top_up_amount: (form.top_up_type === 'cash' || form.top_up_type === 'book') 
    ? (form.top_up_amount || 0) 
    : 0
};

await createCase(submitData);
```

### Step 5: Update getExtrasSummary() function (line ~625)
```javascript
const getExtrasSummary = () => {
  const items = [];
  if (form.requires_cow) items.push('Cow');
  if (form.requires_sheep) items.push('Sheep');
  if (form.requires_tombstone) items.push('Tombstone');
  if (form.requires_flower) items.push('Flower');
  if (form.requires_catering) items.push('Catering');
  if (form.requires_grocery) items.push('Grocery');
  if (form.requires_bus) items.push('Bus');
  if (form.programs) items.push(`Programmes: ${form.programs}`);
  
  // UPDATE THIS PART:
  if (form.top_up_amount) {
    const topupLabel = form.top_up_type === 'book' 
      ? `Book Top-Up (${form.top_up_reference}): R${form.top_up_amount}`
      : `Cash Top-Up: R${form.top_up_amount}`;
    items.push(topupLabel);
  }
  
  if (form.airtime) items.push(`Airtime: ${form.airtime_network || ''} ${form.airtime_number || ''}`.trim());
  return items.length ? items.join(', ') : 'None selected';
};
```

## Testing Checklist
- [ ] Form shows dropdown for None/Cash/Book
- [ ] Selecting "Book" shows book number input
- [ ] Selecting "Cash" or "Book" shows amount input
- [ ] Selecting "None" hides all top-up inputs
- [ ] Case submission includes new fields
- [ ] Receipt/summary displays book number correctly

## Database Migration
Run this SQL on Supabase dashboard before testing:
```sql
-- Run: server/database/migrate-add-book-topup.sql
```

## Notes
- The casket selection logic remains unchanged (based on total_price)
- Book validation happens externally - this system just tracks it
- Multiple books are stored as comma-separated values in top_up_reference
