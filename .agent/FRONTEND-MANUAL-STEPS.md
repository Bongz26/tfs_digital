# URGENT: Frontend Implementation - EXACT Instructions

## What We've Done ✅
1. Added `top_up_type: 'none'` and `top_up_reference: ''` to state (line 362-363)
2. Updated `getExtrasSummary()` function to show book reference (line 627-631)

## What You Need To Do 🔧

### Task: Find and Replace the Top-Up Input Section

**Step 1: Open `ConsultationForm.jsx` in VS Code**

**Step 2: Use Ctrl+F to search for:**  
Search for text that looks like this (it might have checkboxes for requires_cow, requires_sheep, etc.)

You're looking for a section that has form inputs/checkboxes. It might look like:
```jsx
<input 
  type="checkbox"
  checked={form.requires_cow}
  onChange=...
/>
```

OR search for where the form buttons are rendered (Save Draft, Confirm)

**Step 3: Look for ANY section that might have extras/additional items**

Since the file is very large (1953 lines), the form inputs are somewhere between line 1100-1700.

**Step 4: Once you find where form inputs are, ADD THIS CODE:**

```jsx
{/* === BOOK TOP-UP SECTION (ADD THIS ANYWHERE IN THE FORM) === */}
<div style={{marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px'}}>
  <h4 style={{marginBottom: '10px'}}>Top-Up (Cash or Book)</h4>
  
  <div style={{marginBottom: '10px'}}>
    <label htmlFor="top_up_type" style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
      Top-Up Method
    </label>
    <select 
      id="top_up_type"
      value={form.top_up_type}
      onChange={(e) => handleInputChange('top_up_type', e.target.value)}
      style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
    >
      <option value="none">None</option>
      <option value="cash">Cash Payment</option>
      <option value="book">Insurance Book</option>
    </select>
  </div>

  {form.top_up_type === 'book' && (
    <div style={{marginBottom: '10px'}}>
      <label htmlFor="top_up_reference" style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
        Book Number(s)
      </label>
      <input
        type="text"
        id="top_up_reference"
        value={form.top_up_reference}
        onChange={(e) => handleInputChange('top_up_reference', e.target.value)}
        placeholder="Enter book number (e.g., BOOK123, BOOK456)"
        style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
      />
      <small style={{fontSize: '12px', color: '#666'}}>
        Separate multiple books with commas
      </small>
    </div>
  )}

  {(form.top_up_type === 'cash' || form.top_up_type === 'book') && (
    <div>
      <label htmlFor="top_up_amount" style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
        Top-Up Amount (R)
      </label>
      <input
        type="number"
        id="top_up_amount"
        value={form.top_up_amount || ''}
        onChange={(e) => handleInputChange('top_up_amount', parseFloat(e.target.value) || 0)}
        placeholder="0"
        style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
        min="0"
      />
    </div>
  )}
</div>
```

## Alternative: If You Can't Find Where To Add It

**Add it RIGHT BEFORE the "Save Draft" button**

Search for: `handleSaveDraft` or `Save Draft` button

Add the code block above JUST BEFORE that button.

## Update the Form Reset (Line 960)

Find this line and add the new fields:
```javascript
programs: 0, top_up_amount: 0, airtime: false, airtime_network: '', airtime_number: '',
```

Change to:
```javascript
programs: 0, top_up_amount: 0, top_up_type: 'none', top_up_reference: '', airtime: false, airtime_network: '', airtime_number: '',
```

## Update Print Template (Line 1881)

Find:
```jsx
<div className="checklist-item"><span className="checklist-label">Top-Up</span> <span className="checklist-val">{printedData.top_up_amount ? `R${printedData.top_up_amount}` : '-'}</span></div>
```

Replace with:
```jsx
<div className="checklist-item"><span className="checklist-label">Top-Up</span> <span className="checklist-val">{printedData.top_up_amount ? (printedData.top_up_type === 'book' ? `Book (${printedData.top_up_reference}): R${printedData.top_up_amount}` : `R${printedData.top_up_amount}`) : '-'}</span></div>
```

## Test It!

1. Save the file
2. Check if the page reloads (React should auto-reload)
3. You should see the "Top-Up Method" dropdown
4. Select "Book" → Book number field appears
5. Select "Cash" → Only amount field shows
6. Select "None" → Everything hides

## If It Doesn't Work

Send me a screenshot of where you added the code, or tell me what error you see in the browser console (F12).
