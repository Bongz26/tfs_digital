# TFS Digital API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, the API does not require authentication. Consider adding authentication for production use.

---

## Cases

### Get All Cases
```http
GET /api/cases
```

**Response:**
```json
{
  "success": true,
  "cases": [
    {
      "id": 1,
      "case_number": "THS-2025-001",
      "deceased_name": "John Doe",
      "deceased_id": "8501015800085",
      "nok_name": "Jane Doe",
      "nok_contact": "0821234567",
      "nok_relation": "Spouse",
      "plan_category": "single",
      "funeral_date": "2025-11-20",
      "funeral_time": "10:00:00",
      "status": "intake",
      "created_at": "2025-11-10T10:00:00Z"
    }
  ]
}
```

### Get Single Case
```http
GET /api/cases/:id
```

### Create Case
```http
POST /api/cases
Content-Type: application/json

{
  "deceased_name": "John Doe",
  "deceased_id": "8501015800085",
  "nok_name": "Jane Doe",
  "nok_contact": "0821234567",
  "nok_relation": "Spouse",
  "plan_category": "single",
  "plan_name": "Basic",
  "funeral_date": "2025-11-20",
  "funeral_time": "10:00:00",
  "venue_name": "St. Mary's Church",
  "venue_address": "123 Main St",
  "requires_cow": false,
  "requires_tombstone": true,
  "status": "intake",
  "intake_day": "2025-11-12"
}
```

**Note:** Case number is automatically generated in format `THS-YYYY-XXX`.

### Update Case
```http
PUT /api/cases/:id
Content-Type: application/json

{
  "status": "confirmed",
  "funeral_time": "11:00:00"
}
```

### Delete Case
```http
DELETE /api/cases/:id
```

---

## Dashboard

### Get Dashboard Data
```http
GET /api/dashboard
```

**Response:**
```json
{
  "upcoming": 7,
  "vehiclesNeeded": 7,
  "vehiclesAvailable": 6,
  "conflicts": true,
  "lowStock": ["Pine Coffin", "10x10 Tent"],
  "upcomingCases": [...],
  "todayAssignments": [...]
}
```

---

## Vehicles

### Get All Vehicles
```http
GET /api/vehicles
```

### Get Available Vehicles
```http
GET /api/vehicles/available
```

### Get Single Vehicle
```http
GET /api/vehicles/:id
```

### Update Vehicle Availability
```http
PATCH /api/vehicles/:id/availability
Content-Type: application/json

{
  "available": false
}
```

### Update Vehicle
```http
PUT /api/vehicles/:id
Content-Type: application/json

{
  "driver_name": "John Driver",
  "driver_contact": "0821234567",
  "available": true,
  "current_location": "Manekeng",
  "last_service": "2025-10-01"
}
```

---

## Inventory

### Get All Inventory
```http
GET /api/inventory
```

### Get Low Stock Items
```http
GET /api/inventory/low-stock
```

### Get Single Inventory Item
```http
GET /api/inventory/:id
```

### Update Inventory Stock
```http
PATCH /api/inventory/:id/stock
Content-Type: application/json

{
  "stock_quantity": 10
}
```

### Create Reservation
```http
POST /api/inventory/:id/reserve
Content-Type: application/json

{
  "case_id": 1,
  "quantity": 2
}
```

---

## Roster

### Get All Roster Entries
```http
GET /api/roster
```

### Get Roster for Case
```http
GET /api/roster/case/:caseId
```

### Get Today's Roster
```http
GET /api/roster/today
```

### Create Roster Entry
```http
POST /api/roster
Content-Type: application/json

{
  "case_id": 1,
  "vehicle_id": 1,
  "driver_name": "John Driver",
  "pickup_time": "2025-11-20T08:00:00Z",
  "route_json": "{...}",
  "status": "scheduled"
}
```

### Update Roster Entry
```http
PUT /api/roster/:id
Content-Type: application/json

{
  "status": "en_route",
  "sms_sent": true
}
```

### Delete Roster Entry
```http
DELETE /api/roster/:id
```

---

## Livestock

### Get All Livestock
```http
GET /api/livestock
```

### Get Available Livestock
```http
GET /api/livestock/available
```

### Get Livestock by Case
```http
GET /api/livestock/case/:caseId
```

### Get Single Livestock
```http
GET /api/livestock/:id
```

### Create Livestock
```http
POST /api/livestock
Content-Type: application/json

{
  "tag_id": "COW-001",
  "status": "available",
  "breed": "Nguni",
  "location": "Manekeng Farm"
}
```

### Assign Livestock to Case
```http
POST /api/livestock/:id/assign
Content-Type: application/json

{
  "case_id": 1
}
```

### Release Livestock
```http
POST /api/livestock/:id/release
```

### Update Livestock
```http
PUT /api/livestock/:id
Content-Type: application/json

{
  "status": "slaughtered",
  "breed": "Nguni"
}
```

---

## Checklist

### Get Checklist for Case
```http
GET /api/checklist/case/:caseId
```

### Get Single Checklist Item
```http
GET /api/checklist/:id
```

### Create Checklist Item
```http
POST /api/checklist
Content-Type: application/json

{
  "case_id": 1,
  "task": "Prepare coffin",
  "completed": false,
  "completed_by": "Staff Member"
}
```

### Create Multiple Checklist Items
```http
POST /api/checklist/case/:caseId/bulk
Content-Type: application/json

{
  "tasks": [
    "Prepare coffin",
    "Arrange vehicles",
    "Notify family"
  ]
}
```

### Update Checklist Item
```http
PUT /api/checklist/:id
Content-Type: application/json

{
  "completed": true,
  "completed_by": "Staff Member"
}
```

### Toggle Checklist Item
```http
PATCH /api/checklist/:id/toggle
Content-Type: application/json

{
  "completed_by": "Staff Member"
}
```

### Delete Checklist Item
```http
DELETE /api/checklist/:id
```

---

## SMS

### Get All SMS Logs
```http
GET /api/sms
```

### Get SMS Logs for Case
```http
GET /api/sms/case/:caseId
```

### Get Single SMS Log
```http
GET /api/sms/:id
```

### Create SMS Log
```http
POST /api/sms
Content-Type: application/json

{
  "case_id": 1,
  "phone": "0821234567",
  "message": "Your funeral service is scheduled for...",
  "status": "sent"
}
```

### Send SMS (Placeholder)
```http
POST /api/sms/send
Content-Type: application/json

{
  "case_id": 1,
  "phone": "0821234567",
  "message": "Your funeral service is scheduled for..."
}
```

**Note:** This endpoint currently only logs the SMS. Integrate with an SMS service (Twilio, AWS SNS, etc.) to send actual messages.

### Update SMS Status
```http
PATCH /api/sms/:id/status
Content-Type: application/json

{
  "status": "delivered"
}
```

---

## Health Check

### Check Server Status
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "TFS API is running"
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Data Models

### Case Status Values
- `intake` - Initial intake
- `confirmed` - Confirmed
- `in_progress` - In progress
- `completed` - Completed

### Plan Categories
- `motjha`
- `single`
- `family`
- `colour_grade`

### Vehicle Types
- `hearse`
- `family_car`
- `bus`
- `backup`

### Inventory Categories
- `coffin`
- `tent`
- `chair`
- `catering`
- `grocery`
- `tombstone`
- `livestock`
- `other`

### Livestock Status
- `available`
- `assigned`
- `slaughtered`

### Roster Status
- `scheduled`
- `en_route`
- `completed`

---

## Notes

1. **Case Numbers**: Automatically generated in format `THS-YYYY-XXX` (e.g., THS-2025-001)
2. **Intake Day**: Must be a Wednesday (validation enforced)
3. **Livestock Tags**: Format `COW-XXX` (e.g., COW-001)
4. **Phone Numbers**: South African format (0XXXXXXXXX or +27XXXXXXXXX)
5. **Dates**: ISO 8601 format (YYYY-MM-DD)
6. **Times**: 24-hour format (HH:MM:SS)

