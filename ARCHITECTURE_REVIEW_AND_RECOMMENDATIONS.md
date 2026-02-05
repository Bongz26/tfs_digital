# TFS Digital - Architecture Review & Recommendations

## 📋 Executive Summary

**TFS Digital** is a funeral services management system for Thusanang Funeral Services (QwaQwa, Free State). It handles case management, inventory, vehicle fleet, purchase orders, and driver scheduling.

### Current State: **MVP/Prototype** → Target: **Production-Ready System**

This document provides a comprehensive review with actionable recommendations to transform the current codebase into a well-architected, production-ready system.

---

## 🏗️ Current Architecture Overview

### Technology Stack
| Layer | Technology | Status |
|-------|------------|--------|
| **Frontend** | React 18, TailwindCSS, React Router | ✅ Good |
| **Backend** | Express.js 5, Node.js 18+ | ✅ Good |
| **Database** | PostgreSQL (Supabase) | ✅ Good |
| **Hosting** | Render (backend), Static (frontend) | ✅ Good |
| **Email** | Nodemailer (Gmail SMTP) | ⚠️ Basic |
| **Maps** | Google Maps API | ✅ Good |

### System Components
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Intake  │  │Dashboard │  │  Stock   │  │Purchase  │        │
│  │   Form   │  │  Cases   │  │Management│  │  Orders  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Express.js)                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Cases  │  │Inventory│  │Vehicles │  │   PO    │            │
│  │ Router  │  │ Router  │  │ Router  │  │ Router  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│         │          │           │             │                  │
│         └──────────┴───────────┴─────────────┘                  │
│                         │                                        │
│              ┌──────────▼──────────┐                            │
│              │    Controllers      │                            │
│              │  (Business Logic)   │                            │
│              └──────────┬──────────┘                            │
│                         │                                        │
│              ┌──────────▼──────────┐                            │
│              │    Database Pool    │                            │
│              │    (PostgreSQL)     │                            │
│              └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE (Supabase PostgreSQL)                  │
│  cases │ inventory │ vehicles │ roster │ purchase_orders │ etc │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ What's Working Well

### 1. **Database Design**
- Good normalization (separate tables for cases, inventory, vehicles, etc.)
- Proper foreign key relationships
- Indexes on frequently queried columns
- Audit timestamps (`created_at`, `updated_at`)
- Domain-specific constraints (e.g., vehicle types, plan categories)

### 2. **API Structure**
- RESTful endpoints following conventions
- Organized route files per domain
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Health check endpoint

### 3. **Frontend**
- Modern React with functional components
- Responsive design with TailwindCSS
- Good component organization
- Mobile-friendly navigation

### 4. **Business Logic**
- Case status workflow is well-defined
- Purchase order lifecycle is complete
- Stock management with movements tracking
- GRV (Goods Received Voucher) process

---

## 🚨 Critical Issues to Address

### 1. **🔒 SECURITY - NO AUTHENTICATION**

**Problem:** The system has **NO authentication or authorization**. Anyone with the URL can access/modify all data.

**Risk Level:** 🔴 **CRITICAL**

**Impact:**
- Anyone can view all funeral cases (sensitive personal data)
- Anyone can modify inventory, create fake POs
- POPIA (Protection of Personal Information Act) compliance violation
- Financial data exposed

**Solution:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED AUTH FLOW                         │
│                                                                  │
│  User → Login Page → Supabase Auth → JWT Token → API Requests   │
│                                                                  │
│  Roles:                                                          │
│  - Admin: Full access                                            │
│  - Manager: Cases, Inventory, POs (no delete)                   │
│  - Staff: View cases, update checklist                          │
│  - Driver: View assigned routes only                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2. **⚠️ INPUT VALIDATION GAPS**

**Problem:** Validation exists but isn't consistently used across all endpoints.

**Examples:**
- PO items can have quantity = 0 or negative
- No SQL injection protection in some raw queries
- Missing rate limiting (DoS vulnerability)

### 3. **📝 NO ERROR LOGGING**

**Problem:** Errors are console.logged but not persisted. Production issues are invisible.

**Current:**
```javascript
} catch (err) {
    console.error('❌ Error:', err);  // Lost when server restarts
    res.status(500).json({ error: 'Failed' });
}
```

### 4. **🔄 MIXED DATABASE ACCESS PATTERNS**

**Problem:** Code uses both:
- Direct PostgreSQL (`pg` pool)
- Supabase client

This creates confusion and potential connection issues.

---

## 📐 Architectural Recommendations

### Phase 1: Quick Wins (1-2 weeks)

#### 1.1 Add Basic Authentication with Supabase Auth

```javascript
// server/middleware/auth.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

module.exports = { requireAuth };
```

#### 1.2 Add Request Validation Middleware

```javascript
// server/middleware/validate.js
const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      error: error.details[0].message 
    });
  }
  next();
};

// Example schema
const poItemSchema = Joi.object({
  inventory_id: Joi.number().integer().positive().required(),
  quantity_ordered: Joi.number().integer().min(1).required(),
  unit_cost: Joi.number().min(0).optional()
});

module.exports = { validate, poItemSchema };
```

#### 1.3 Standardize Error Handling

```javascript
// server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: message
  });
};

module.exports = errorHandler;
```

#### 1.4 Add Rate Limiting

```javascript
// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later' }
});

module.exports = apiLimiter;
```

### Phase 2: Structural Improvements (2-4 weeks)

#### 2.1 Implement Service Layer

**Current (Controller does everything):**
```
Route → Controller → Database
```

**Recommended (Separation of concerns):**
```
Route → Controller → Service → Repository → Database
```

```javascript
// server/services/caseService.js
const caseRepository = require('../repositories/caseRepository');

class CaseService {
  async createCase(caseData, userId) {
    // Business logic here
    const caseNumber = this.generateCaseNumber();
    
    // Validate business rules
    if (await this.isDuplicateCase(caseData)) {
      throw new Error('Duplicate case detected');
    }
    
    return caseRepository.create({
      ...caseData,
      case_number: caseNumber,
      created_by: userId
    });
  }

  generateCaseNumber() {
    const year = new Date().getFullYear();
    // In real implementation, query last case number
    return `THS-${year}-${String(Math.random()).slice(2, 5)}`;
  }
}

module.exports = new CaseService();
```

#### 2.2 Unified Database Access Layer

```javascript
// server/repositories/baseRepository.js
const { query, getClient } = require('../config/db');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findById(id) {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async findAll(filters = {}, options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    
    // Build WHERE clause from filters
    // Build ORDER BY, LIMIT from options
    
    const result = await query(sql, params);
    return result.rows;
  }

  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    
    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  }
}

module.exports = BaseRepository;
```

#### 2.3 Add Logging Service

```javascript
// server/services/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tfs-digital' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;
```

### Phase 3: Production Readiness (1-2 months)

#### 3.1 Recommended Folder Structure

```
server/
├── config/
│   ├── database.js         # Database configuration
│   ├── auth.js             # Authentication config
│   └── app.js              # App configuration
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── validate.js         # Input validation
│   ├── errorHandler.js     # Global error handler
│   └── rateLimiter.js      # Rate limiting
├── controllers/
│   ├── caseController.js   # HTTP request handling
│   ├── inventoryController.js
│   └── ...
├── services/
│   ├── caseService.js      # Business logic
│   ├── inventoryService.js
│   ├── emailService.js
│   └── ...
├── repositories/
│   ├── baseRepository.js   # Base CRUD operations
│   ├── caseRepository.js   # Case-specific queries
│   └── ...
├── models/
│   ├── case.js             # Data models/DTOs
│   └── ...
├── routes/
│   ├── index.js            # Route aggregator
│   ├── caseRoutes.js
│   └── ...
├── utils/
│   ├── validators.js       # Validation schemas
│   ├── helpers.js
│   └── constants.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── index.js                # Entry point
```

#### 3.2 Environment-Based Configuration

```javascript
// server/config/app.js
const config = {
  development: {
    db: { pool: { max: 5 } },
    cors: { origin: '*' },
    logging: { level: 'debug' }
  },
  production: {
    db: { pool: { max: 20 } },
    cors: { origin: ['https://admintfs.onrender.com'] },
    logging: { level: 'warn' }
  },
  test: {
    db: { pool: { max: 2 } },
    cors: { origin: '*' },
    logging: { level: 'error' }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

---

## 🎯 Feature Recommendations for Real-World Use

### 1. **User Management**
```
┌─────────────────────────────────────────┐
│              USER MANAGEMENT             │
├─────────────────────────────────────────┤
│ - User registration/login               │
│ - Role-based access (Admin/Manager/Staff)│
│ - Password reset                        │
│ - Activity audit log                    │
│ - Session management                    │
└─────────────────────────────────────────┘
```

### 2. **Financial Module**
```
┌─────────────────────────────────────────┐
│           FINANCIAL FEATURES            │
├─────────────────────────────────────────┤
│ - Invoice generation                    │
│ - Payment tracking                      │
│ - Payment plans (for funeral plans)     │
│ - Bank reconciliation                   │
│ - Financial reports                     │
│ - VAT calculations                      │
└─────────────────────────────────────────┘
```

### 3. **Document Management**
```
┌─────────────────────────────────────────┐
│          DOCUMENT MANAGEMENT            │
├─────────────────────────────────────────┤
│ - Death certificate upload              │
│ - ID document storage                   │
│ - Contract generation (PDF)             │
│ - Document templates                    │
│ - Digital signatures                    │
└─────────────────────────────────────────┘
```

### 4. **Reporting Dashboard**
```
┌─────────────────────────────────────────┐
│              REPORTING                  │
├─────────────────────────────────────────┤
│ - Cases by status (weekly/monthly)      │
│ - Revenue reports                       │
│ - Stock valuation                       │
│ - Vehicle utilization                   │
│ - Driver performance                    │
│ - Plan popularity analysis              │
└─────────────────────────────────────────┘
```

### 5. **Notifications**
```
┌─────────────────────────────────────────┐
│            NOTIFICATIONS                │
├─────────────────────────────────────────┤
│ - SMS reminders for funerals            │
│ - Low stock alerts (email)              │
│ - Overdue payment reminders             │
│ - Driver route notifications            │
│ - Case status updates                   │
└─────────────────────────────────────────┘
```

---

## 📊 Database Improvements

### 1. Add Missing Tables

```sql
-- Users table (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(120) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'staff', 'driver')),
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log table (track all changes)
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30), -- cash, eft, card
    reference VARCHAR(100),
    received_by UUID REFERENCES users(id),
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id),
    document_type VARCHAR(50), -- death_cert, id_copy, contract
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Add Soft Deletes

```sql
-- Add deleted_at column to main tables
ALTER TABLE cases ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE inventory ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN deleted_at TIMESTAMP;

-- Create view for active records only
CREATE VIEW active_cases AS
SELECT * FROM cases WHERE deleted_at IS NULL;
```

### 3. Add Database Triggers for Audit

```sql
-- Automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, table_name, record_id, new_values)
        VALUES ('CREATE', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, new_values)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER cases_audit AFTER INSERT OR UPDATE OR DELETE ON cases
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## 🧪 Testing Strategy

### Current State: ❌ Minimal Tests

### Recommended Testing Pyramid:

```
              ┌─────────┐
              │   E2E   │  ← 10% (Critical user flows)
              │ (Cypress)│
           ┌──┴─────────┴──┐
           │  Integration   │  ← 30% (API endpoints)
           │  (Supertest)   │
        ┌──┴───────────────┴──┐
        │      Unit Tests      │  ← 60% (Services, Utils)
        │        (Jest)        │
        └──────────────────────┘
```

### Example Test File Structure:

```javascript
// server/tests/services/caseService.test.js
const caseService = require('../../services/caseService');
const caseRepository = require('../../repositories/caseRepository');

jest.mock('../../repositories/caseRepository');

describe('CaseService', () => {
  describe('createCase', () => {
    it('should generate a case number starting with THS', async () => {
      const caseData = {
        deceased_name: 'John Doe',
        nok_name: 'Jane Doe',
        nok_contact: '0821234567',
        funeral_date: '2025-12-01'
      };

      caseRepository.create.mockResolvedValue({ id: 1, ...caseData });

      const result = await caseService.createCase(caseData, 'user-123');

      expect(result.case_number).toMatch(/^THS-\d{4}-\d{3}$/);
    });

    it('should reject duplicate cases', async () => {
      // Test implementation
    });
  });
});
```

---

## 🚀 Deployment Improvements

### Current: Basic Render Deployment

### Recommended: CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd server && npm ci
      - run: cd server && npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: curl ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### Environment Management

```
┌─────────────────────────────────────────┐
│          ENVIRONMENT STRATEGY           │
├─────────────────────────────────────────┤
│ Development: localhost:5000             │
│ Staging: staging-tfs.onrender.com       │
│ Production: admintfs.onrender.com       │
└─────────────────────────────────────────┘
```

---

## 📋 Implementation Roadmap

### Sprint 1 (Week 1-2): Security Foundation
- [ ] Implement Supabase Auth
- [ ] Add authentication middleware
- [ ] Protect all API routes
- [ ] Add basic role checking

### Sprint 2 (Week 3-4): Input Validation
- [ ] Add Joi validation schemas
- [ ] Implement validation middleware
- [ ] Add rate limiting
- [ ] Fix existing validation gaps

### Sprint 3 (Week 5-6): Error Handling & Logging
- [ ] Implement Winston logging
- [ ] Add global error handler
- [ ] Set up error monitoring (Sentry)
- [ ] Add request logging

### Sprint 4 (Week 7-8): Service Layer
- [ ] Create service classes
- [ ] Create repository classes
- [ ] Refactor controllers
- [ ] Add transaction support

### Sprint 5 (Week 9-10): Testing
- [ ] Set up Jest properly
- [ ] Write unit tests for services
- [ ] Write integration tests for APIs
- [ ] Set up CI/CD

### Sprint 6 (Week 11-12): Features
- [ ] Add user management
- [ ] Add payment tracking
- [ ] Add document upload
- [ ] Add reporting dashboard

---

## 📦 Recommended Package Additions

```json
{
  "dependencies": {
    "joi": "^17.9.0",           // Input validation
    "winston": "^3.10.0",       // Logging
    "helmet": "^7.0.0",         // Security headers
    "express-rate-limit": "^6.9.0", // Rate limiting
    "compression": "^1.7.4",    // Response compression
    "uuid": "^9.0.0"            // UUID generation
  },
  "devDependencies": {
    "eslint": "^8.50.0",        // Code linting
    "prettier": "^3.0.0",       // Code formatting
    "husky": "^8.0.0",          // Git hooks
    "lint-staged": "^14.0.0"    // Pre-commit checks
  }
}
```

---

## 🎓 Summary

### Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Add Authentication | Medium | Critical |
| 🔴 P0 | Input Validation | Low | High |
| 🟠 P1 | Error Logging | Low | High |
| 🟠 P1 | Rate Limiting | Low | Medium |
| 🟡 P2 | Service Layer | High | High |
| 🟡 P2 | Unit Tests | Medium | High |
| 🟢 P3 | User Management | High | High |
| 🟢 P3 | Payments Module | High | High |

### Key Takeaways

1. **Security is critical** - Add authentication before going live
2. **Validation prevents bugs** - Validate all inputs
3. **Logging saves debugging time** - Log everything important
4. **Tests prevent regressions** - Automate testing
5. **Separation of concerns** - Controllers shouldn't do everything

---

## 📚 Resources

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Author:** Architecture Review

