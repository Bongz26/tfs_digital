# Case Status Workflow Guide

## Overview

The TFS Digital system uses a professional status workflow to track funeral cases from initial intake through completion. This guide explains each status and when to use it.

---

## Status Definitions

### 📋 **Intake**
- **When to use:** Initial consultation and information gathering
- **Description:** New case created, basic information collected
- **Next steps:** Confirm details and arrange payment
- **Color:** Gray

### ✅ **Confirmed**
- **When to use:** Details confirmed, payment arranged, ready for preparation
- **Description:** All information verified, payment received or arranged
- **Next steps:** Begin preparing coffin, tent, and other arrangements
- **Color:** Blue

### 🔧 **In Preparation**
- **When to use:** Actively preparing for the funeral
- **Description:** Preparing coffin, tent, chairs, and other items
- **Next steps:** Complete preparations and schedule vehicles
- **Color:** Yellow

### 📅 **Scheduled**
- **When to use:** All preparations complete, funeral date confirmed
- **Description:** Everything is ready, vehicles assigned, funeral date confirmed
- **Next steps:** Wait for funeral day, then mark as "In Progress"
- **Color:** Purple

### 🚗 **In Progress**
- **When to use:** Funeral service is currently happening
- **Description:** Funeral day, service is in progress
- **Next steps:** After service completes, mark as "Completed"
- **Color:** Orange

### ✓ **Completed**
- **When to use:** Funeral service completed successfully
- **Description:** Funeral service finished, all arrangements completed
- **Next steps:** Archive after follow-up is done
- **Color:** Green

### 📦 **Archived**
- **When to use:** Case closed, all follow-up completed
- **Description:** Case fully closed, no further action needed
- **Next steps:** None (final status)
- **Color:** Slate

### ❌ **Cancelled**
- **When to use:** Case was cancelled
- **Description:** Funeral service was cancelled
- **Next steps:** None (final status)
- **Color:** Red

---

## Status Flow

```
Intake → Confirmed → In Preparation → Scheduled → In Progress → Completed → Archived
   ↓         ↓
Cancelled  Cancelled
```

### Allowed Transitions

- **Intake** → Confirmed, Cancelled
- **Confirmed** → In Preparation, Cancelled
- **In Preparation** → Scheduled, Confirmed (if need to go back)
- **Scheduled** → In Progress, In Preparation (if need to go back)
- **In Progress** → Completed
- **Completed** → Archived
- **Archived** → (No further changes)
- **Cancelled** → (No further changes)

---

## Automatic Status Suggestions

The system automatically suggests status changes based on the funeral date:

- **Funeral is today** + Status is "Scheduled" → Suggests "In Progress"
- **Funeral was yesterday or earlier** + Status is "In Progress" → Suggests "Completed"
- **Funeral was 7+ days ago** + Status is "Completed" → Suggests "Archived"
- **Funeral is within 2 days** + Status is "Confirmed" → Suggests "In Preparation"
- **Funeral is within 1 day** + Status is "In Preparation" → Suggests "Scheduled"

A 💡 icon appears next to the status when a suggestion is available.

---

## How to Change Status

1. **In Active Cases Page:**
   - Find the case you want to update
   - Look at the "Status" column
   - Click the "Change Status..." dropdown
   - Select the new status
   - Confirm the change

2. **Status Change Rules:**
   - Only valid next statuses are shown in the dropdown
   - You'll be asked to confirm before changing
   - The system prevents invalid status transitions

---

## Real-World Workflow Example

### Example: Standard Funeral Case

1. **Monday:** Client comes in → Create case → Status: **Intake**
2. **Monday (same day):** Payment received, details confirmed → Status: **Confirmed**
3. **Tuesday-Thursday:** Preparing coffin, tent, etc. → Status: **In Preparation**
4. **Friday:** Everything ready, vehicles assigned → Status: **Scheduled**
5. **Saturday (Funeral Day):** Service starts → Status: **In Progress**
6. **Saturday (after service):** Service completed → Status: **Completed**
7. **Next Week:** Follow-up done → Status: **Archived**

---

## Best Practices

1. **Update status promptly** - Keep cases current for accurate reporting
2. **Use "In Preparation"** - When actively working on arrangements
3. **Mark "Scheduled"** - Only when everything is ready
4. **Use "In Progress"** - On the funeral day when service starts
5. **Archive completed cases** - After all follow-up is done

---

## Status Visibility

- **Active Cases Page** shows all cases except "Completed" and "Archived"
- **Dashboard** shows upcoming funerals (any status except "Archived" and "Cancelled")
- **Completed and Archived** cases are hidden from active views but remain in the database

---

## Questions?

If you're unsure which status to use:
- **"Intake"** - New case, just started
- **"Confirmed"** - Payment received, ready to prepare
- **"In Preparation"** - Actively working on arrangements
- **"Scheduled"** - Everything ready, waiting for funeral day
- **"In Progress"** - Funeral is happening today
- **"Completed"** - Funeral finished
- **"Archived"** - Case fully closed

