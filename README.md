# BluePay

BluePay is a modern fintech payment and payout management platform featuring:
- **Backend APIs (`/apis`)**: Node.js & Express REST APIs, MongoDB Mongoose, Kotak Bank CMS Payment & Payout Integration, CCAvenue Gateway, and Audit Logging (Kotak Point 29 Compliant).
- **Admin Dashboard (`/admin`)**: React 19, Vite, Tailwind CSS Super Admin panel for managing merchants, payouts, KYC reviews, and Kotak API runtime audit logs.
- **Merchant Frontend (`/frontend`)**: React 19, Vite, Tailwind CSS merchant portal.

## Project Structure
```
bluepay/
├── admin/       # Super Admin dashboard (Vite + React)
├── apis/        # Backend REST API server (Node.js + Express)
├── frontend/    # Merchant web portal (Vite + React)
├── postman/     # Postman collection & environment
└── start-all.bat # Windows one-click launcher for all services
```

## Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB Server

### 2. Quick Start
Double click `start-all.bat` or run:
```bash
./start-all.bat
```

### 3. Manual Start
```bash
# 1. Start Backend API (Port 1977)
cd apis
npm install
npm run dev

# 2. Start Admin Dashboard (Port 5174)
cd ../admin
npm install
npm run dev

# 3. Start Merchant Frontend (Port 5173)
cd ../frontend
npm install
npm run dev
```

## Compliance & Security
- **Point 29 Compliant**: Full transaction traceability (Request ID, Message ID, UTR, Timestamps) with automated PII & credential redaction (`[REDACTED]`).
