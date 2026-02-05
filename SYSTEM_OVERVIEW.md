# Thusanang Funeral Services

## Administrative System Overview

*Version 2.0.0 | Author: Bongani Khumalo | Document updated: 17 November 2025*

### System Purpose: Dignified and Efficient Operations

The Thusanang Funeral Services Administrative System is a comprehensive, centralized digital platform designed to streamline every aspect of funeral service delivery. It enables staff to manage client intake, case progression, inventory, vehicle fleet scheduling, and procurement with accuracy and professionalism, ensuring that every family receives seamless, respectful, and dignified support during their time of need.

## Key System Modules and Features

### 1. Client Intake (Consultation Module)

- **Purpose:** Serves as the digital entry point for all new service requests.
- **Core Functions:**
    - Capture detailed information for the deceased and next-of-kin
    - Record selected funeral plan (Motjha Plans: Green, Blue, Gold, Platinum, or Special Plans)
    - Document service requirements (date, time, venue, traditional elements such as livestock, tombstone options, etc.)
    - Automatically calculate pricing and track payment status
- **Primary Users:** Front-desk personnel and intake coordinators

### 2. Dashboard (Operational Command Centre)

- **Purpose:** Provides an at-a-glance, real-time overview of the entire operation.
- **Key Displays:**
    - Critical metrics: upcoming funerals, vehicle utilization, and low-stock alerts
    - Interactive vehicle and driver calendar, particularly useful for high-demand weekend scheduling
    - Recent activity feed with quick-access links to active cases
- **Primary Users:** Management, supervisors, and all operational staff

### 3. Active Cases (Case Management Module)

- **Purpose:** Centralized tracking and coordination of all in-progress funeral services.
- **Core Functions:**
    - Comprehensive case list with professional status workflow:
        - **Intake** → Initial consultation and information gathering
        - **Confirmed** → Service details confirmed with family
        - **Preparation** → Pre-funeral arrangements in progress
        - **Scheduled** → Funeral date and time confirmed
        - **In Progress** → Service day activities underway
        - **Completed** → Service successfully delivered
        - **Archived** → Case closed and filed
        - **Cancelled** → Service cancelled (if applicable)
    - **Intelligent Vehicle Assignment:**
        - Time-based conflict detection prevents double-booking
        - Same vehicle can serve multiple funerals on the same day if service times don't overlap (2-hour buffer for service duration and travel)
        - Real-time availability filtering shows only vehicles without scheduling conflicts
        - Example: A vehicle can serve a 9:00 AM service and an 11:00 AM service on the same day without conflicts
    - **Driver Management:**
        - Separate driver database with active/inactive status
        - Drivers assigned per case (not permanently tied to vehicles)
        - Fleet managers can assign any available driver to any vehicle for each service
        - Quick access to driver contact information
    - Real-time status updates with smart suggestions based on funeral dates
    - Color-coded status badges for quick visual identification
- **Primary Users:** Case managers, service coordinators, and fleet department

### 4. Stock Management (Inventory Control)

- **Purpose:** Full visibility and control over all funeral-service consumables and equipment.
- **Core Functions:**
    - Real-time stock-level tracking (caskets, tents, chairs, groceries, etc.)
    - Automated low-stock and out-of-stock alerts
    - Stock movement logging and manual adjustments
    - **Stock Take Feature:**
        - Physical inventory counting with system comparison
        - Variance detection and adjustment tracking
        - Audit trail for all stock discrepancies
        - Progress tracking during stock take process
    - PDF stock reports with detailed item listings, categories, and values
    - Category-based filtering and search functionality
- **Primary Users:** Warehouse staff, stock controllers, and management

### 5. Purchase Orders (Procurement Module)

- **Purpose:** Streamlined supplier management and goods receiving.
- **Core Functions:**
    - **Enhanced PO Creation:**
        - Supplier selection via name-based dropdown (no manual ID entry)
        - Inventory item lookup with auto-filled suggested unit prices
        - Current stock display for informed ordering decisions
        - SKU tracking for accurate item identification
    - **Professional Email Integration:**
        - Automated email dispatch to suppliers with detailed PO information
        - Copy sent to admin for record-keeping
        - Professional HTML-formatted email templates with company branding
        - Includes item descriptions, SKUs, quantities, pricing, delivery instructions, and payment terms
    - Creation and approval of purchase orders with line-item details
    - Tracking of open orders and delivery status
    - Goods Received Voucher (GRV) functionality to update inventory instantly upon receipt
- **Primary Users:** Procurement officers, warehouse staff, and management

### 6. Live Roster (Vehicle & Driver Calendar)

- **Purpose:** Real-time visualization of vehicle and driver assignments across all active cases.
- **Core Functions:**
    - Calendar view of all scheduled services
    - Vehicle and driver assignments displayed with case details
    - Deceased name, venue, and service time information
    - Quick identification of scheduling conflicts or gaps
- **Primary Users:** Fleet managers, dispatchers, and operations coordinators

## Advanced Features & Improvements

### Time-Based Vehicle Scheduling

The system now intelligently manages vehicle assignments based on service times rather than simple availability flags:

- **Conflict Prevention:** Automatically detects overlapping service times (with 2-hour buffer)
- **Optimized Utilization:** Same vehicle can serve multiple funerals on the same day if times don't conflict
- **Example:** A vehicle can serve a 9:00 AM service and an 11:00 AM service on the same day without conflicts
- **Smart Filtering:** Frontend automatically shows only available vehicles for each case based on time conflicts
- **Clear Error Messages:** When conflicts occur, system provides detailed information about conflicting assignments

### Professional Case Status Workflow

- **8 Distinct Statuses:** Clear progression from intake to completion
- **Status Transitions:** System enforces logical status progression
- **Smart Suggestions:** Automatically suggests appropriate status based on funeral date
- **Visual Indicators:** Color-coded badges (red, orange, yellow, green, blue) for quick status identification
- **Status History:** Track all status changes for audit purposes

### Driver Management System

- **Centralized Driver Database:** All drivers stored separately from vehicles
- **Flexible Assignment:** Drivers assigned per case, allowing maximum flexibility
- **Active/Inactive Status:** Track driver availability and employment status
- **Contact Information:** Quick access to driver contact details for coordination
- **No License Tracking:** Simplified driver records focusing on essential operational information

### Enhanced Purchase Order Workflow

- **User-Friendly Interface:** Dropdown selections replace manual ID entry
- **Price Intelligence:** Suggested prices from inventory database
- **Professional Communication:** Automated email dispatch to suppliers
- **Audit Trail:** Complete record of all PO communications
- **Visual PO Display:** Enhanced table layout with line totals, received quantities, and status indicators

## Key Operational Benefits

| **Benefit Area** | **Impact** |
| --- | --- |
| **Operational Efficiency** | Eliminates duplicate data entry and paper-based processes; all information resides in one secure system. |
| **Real-Time Visibility** | Leadership gains instant insight into workloads, resource availability, and potential bottlenecks. |
| **Resource Optimization** | Intelligent time-based scheduling prevents vehicle double-bookings while maximizing fleet utilization. Same vehicle can serve multiple services per day when times don't conflict. |
| **Inventory Accuracy** | Stock take feature ensures physical inventory matches system records, reducing discrepancies and waste. |
| **Professional Communication** | Automated PO emails ensure suppliers receive clear, professional documentation with all necessary details. |
| **Service Excellence** | Consistent, auditable processes from intake to completion ensure every family experiences the highest standard of care and dignity. |
| **Fleet Flexibility** | Driver-per-case assignment allows optimal resource allocation based on daily needs rather than fixed vehicle-driver pairs. |

## Technical Architecture

### Vehicle Types
The system supports the following vehicle types:
- Fortuner
- Vito
- V Class
- Truck
- Q7
- Hilux

### Database Features
- PostgreSQL database with Supabase backend
- Connection pooling for production stability
- Transactional operations for data integrity
- Comprehensive audit trails for all critical operations
- Time-based conflict detection algorithms

### Integration Capabilities
- SMTP email integration for purchase order dispatch
- PDF generation for reports and documentation
- RESTful API architecture for future integrations

## Quick Start Guide

- **New family consultation** → Begin at the **Intake** module
- **Daily operational overview & alerts** → Open the **Dashboard**
- **Assign vehicles or update case progress** → Navigate to **Active Cases**
- **View vehicle schedule** → Check **Live Roster**
- **Re-order supplies** → Use the **Purchase Orders** module
- **Check or adjust inventory** → Access **Stock Management**
- **Physical inventory count** → Use **Stock Take** feature in Stock Management

## Brand Identity

**Thusanang Funeral Services Brand Colours:**

- Red – Strength and compassion
- Gold – Excellence and dignity
- Beige – Warmth and comfort
- White – Purity and peace

## System Tagline

<aside>

**"Re tšotella sechaba sa rona"**

*Serving our community with dignity, respect, and operational excellence.*

</aside>

---

*Document Version 2.0.0 | Written by: Bongani Khumalo | Date: 17 November 2025*
