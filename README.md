# InsureX — Enterprise Insurance Management System

InsureX is an enterprise-grade Insurance Management System designed for underwriting, policy administration, billing, claims adjudication, field agency networks, and statutory compliance.

---

## 1. Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router v7, Lucide Icons, Recharts, Framer Motion
- **Backend:** Node.js, Express.js (ES Modules)
- **Database:** PostgreSQL (with normalized relational schema & Decimal monetary types)
- **ORM:** Prisma ORM v5
- **Authentication:** JWT (JSON Web Tokens), bcryptjs password hashing, RBAC (ADMIN, AGENT, CUSTOMER)
- **Validation:** Zod schema validation
- **Security:** Helmet, CORS, Express Rate Limiter, Parameterized Prisma queries

---

## 2. Project Architecture

The project is structured with a clean separation of concerns without disrupting the established frontend:

```text
InsureX/
├── server/                     # Express.js + Prisma Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Normalized PostgreSQL schema (14 models)
│   │   └── seed.js             # Comprehensive development database seed script
│   ├── src/
│   │   ├── config/             # Environment & Prisma client singleton
│   │   ├── controllers/        # REST route controllers
│   │   ├── middleware/         # Auth, RBAC, error handling, Zod validation
│   │   ├── routes/             # Express API routers
│   │   ├── services/           # Business logic & transaction management
│   │   ├── validators/         # Zod schemas for all models & actions
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server listener & graceful shutdown
│   ├── test/                   # Automated API integration tests
│   ├── package.json            # Backend dependencies & scripts
│   └── .env.example            # Environment configuration template
│
├── src/                        # React Frontend
│   ├── components/             # Reusable UI components (Modals, Badges, Tables)
│   ├── config/                 # Navigation and layout configuration
│   ├── data/                   # Structured mock datasets & schema fallbacks
│   ├── pages/                  # 14 complete administrative modules
│   ├── services/               # API client & backend integration service
│   ├── App.jsx                 # Client router
│   └── index.css               # Design system & tokens
│
├── dist/                       # Production frontend build
├── index.html                  # Single Page Application entrypoint
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite bundler configuration
└── README.md                   # System documentation
```

---

## 3. Database Design & Models (PostgreSQL + Prisma)

The database schema in `server/prisma/schema.prisma` implements normalized models with foreign keys, indexes, and precision decimal fields:

1. **`User`**: System authentication, bcrypt hashes, and role-based permissions (`ADMIN`, `AGENT`, `CUSTOMER`).
2. **`InsuranceCompany`**: Primary underwriters/carriers, IRDAI registration numbers, solvency ratios, and portfolio statistics.
3. **`Customer`**: Insured policyholder records, KYC identification, and profile metadata.
4. **`PolicyType`**: Underwriting coverage lines (Life, Health, Vehicle, Home, Travel, Commercial).
5. **`InsuranceApplication`**: Underwriting proposals submitted by customers.
6. **`InsurancePolicy`**: Issued insurance policies with term dates, sum assured, and premium schedules.
7. **`Premium`**: Installment schedule tracking due dates and partial payments.
8. **`PremiumPayment`**: Transaction records with payment channels and UTR numbers.
9. **`Beneficiary`**: Policy nominees with allocation percentages (strictly validated: cumulative allocations across any policy $\le 100\%$).
10. **`InsuranceAgent`**: Field advisors with IRDAI licenses, commission rates, and portfolio allocations.
11. **`Claim`**: Loss and incident reports filed by policyholders.
12. **`ClaimProcessing`**: Assessor investigation workflow, notes, and approval transitions.
13. **`Document`**: Evidentiary files, KYC scans, hospital invoices, and police FIRs.
14. **`PolicyRenewal`**: Policy expiration tracking, automated notices, and term extensions.

---

## 4. Key Business Rules Implemented

- **Application to Policy Conversion:** Approved applications generate a policy atomically via database transactions. Duplicate policy generation for the same application is strictly prohibited.
- **Policy Eligibility:** A claim must reference a valid policy and customer; the policy must belong to the claimant and be in `ACTIVE` status.
- **Claim Settlement Integrity:** A claim **must not be settled before formal approval**. Attempting to settle a pending, under-review, or rejected claim returns a `400 Bad Request`.
- **Mandatory Rejection Reasons:** Rejecting applications or claims requires an explicit justification stored in the audit trail.
- **Beneficiary Allocation Safeguard:** Cumulative beneficiary allocation percentages for any policy cannot exceed $100\%$. The backend verifies existing allocations and rejects requests exceeding the balance.
- **Partial & Multiple Premium Payments:** Premiums track `amount` and `paidAmount`. Partial payments recalculate remaining balances and update statuses to `PARTIALLY_PAID` or `PAID`.
- **Term Renewal Validation:** Renewal dates must satisfy `newExpiryDate > newStartDate >= previousExpiryDate`. Executed renewals atomically extend the parent policy expiration date.

---

## 5. Local PostgreSQL Setup & Configuration

### Prerequisites
- Node.js $\ge$ 18.0.0
- PostgreSQL $\ge$ 14.0 (PostgreSQL 18 is installed on this machine)

### Step 1: Create Database
In your PostgreSQL command line (`psql`) or pgAdmin:
```sql
CREATE DATABASE insurex_db;
```

### Step 2: Configure Environment
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Update the `DATABASE_URL` with your local PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/insurex_db?schema=public"
PORT=5000
JWT_SECRET="your_secure_jwt_secret"
CLIENT_URL="http://localhost:5173"
```

### Step 3: Run Prisma Migrations
Generate the Prisma client and apply the initial schema migration:
```bash
cd server
npm run prisma:generate
npx prisma migrate dev --name init
```

### Step 4: Seed the Database
Populate the database with normalized demonstration records:
```bash
npm run prisma:seed
```

---

## 6. Running the Application

### Backend Server
```bash
cd server
npm run dev
```
The server will start at `http://localhost:5000` with health check available at `http://localhost:5000/api/health`.

### Frontend Application
From the project root:
```bash
npm run dev
```
The client interface will run at `http://localhost:5173`.

---

## 7. REST API Endpoints Overview

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register a new user |
| | `POST` | `/api/auth/login` | Authenticate and obtain JWT |
| | `GET` | `/api/auth/me` | Current authenticated user profile |
| **Customers** | `GET` | `/api/customers` | List customers (search, filter, pagination) |
| | `GET` | `/api/customers/:id` | Customer details with linked policies & claims |
| | `POST` | `/api/customers` | Register a new customer |
| | `PUT` | `/api/customers/:id` | Update customer record |
| | `DELETE` | `/api/customers/:id` | Delete customer (checks for active policies) |
| **Policy Types**| `GET` | `/api/policy-types` | List all underwriting policy lines |
| | `POST` | `/api/policy-types` | Create a new policy type |
| **Policies** | `GET` | `/api/policies` | List policies with pagination & search |
| | `GET` | `/api/policies/:id` | Comprehensive policy details & installments |
| | `POST` | `/api/policies` | Issue a new insurance policy |
| | `PUT` | `/api/policies/:id` | Update policy terms |
| **Applications**| `GET` | `/api/applications` | List applications |
| | `POST` | `/api/applications` | Submit new insurance proposal |
| | `POST` | `/api/applications/:id/approve` | Approve proposal & atomically issue policy |
| | `POST` | `/api/applications/:id/reject` | Reject proposal with mandatory reason |
| **Premiums** | `GET` | `/api/premiums` | List premium billing installments |
| | `GET` | `/api/premiums/:id` | Installment breakdown & balance |
| **Payments** | `GET` | `/api/payments` | List premium transaction logs |
| | `POST` | `/api/payments` | Process payment & recalculate premium status |
| **Claims** | `GET` | `/api/claims` | List claims |
| | `GET` | `/api/claims/:id` | Claim details, evidence, and audit history |
| | `POST` | `/api/claims` | File a new claim (validates claimant policy) |
| | `POST` | `/api/claims/:id/assign` | Assign field investigator agent |
| | `POST` | `/api/claims/:id/approve` | Approve claim & authorize payout amount |
| | `POST` | `/api/claims/:id/reject` | Reject claim with formal justification |
| | `POST` | `/api/claims/:id/settle` | Disburse payout (requires prior approval) |
| **Processing** | `GET` | `/api/claim-processing` | Claim adjudication work queue |
| **Agents** | `GET` | `/api/agents` | Field agent directory |
| | `GET` | `/api/agents/:id` | Agent portfolio, claims, and performance |
| | `POST` | `/api/agents` | Register a licensed agent |
| **Beneficiaries**| `GET` | `/api/beneficiaries` | List policy nominees |
| | `POST` | `/api/beneficiaries` | Nominate beneficiary (validates $\le 100\%$) |
| | `PUT` | `/api/beneficiaries/:id` | Update allocation share |
| **Documents** | `GET` | `/api/documents` | Evidentiary repository |
| | `POST` | `/api/documents` | Upload/log document reference |
| | `PUT` | `/api/documents/:id` | Update verification status & assessor notes |
| **Renewals** | `GET` | `/api/renewals` | Policy renewal schedule |
| | `POST` | `/api/renewals` | Schedule policy renewal (validates dates) |
| | `PUT` | `/api/renewals/:id` | Execute renewal & extend policy expiration |
| **Companies** | `GET` | `/api/insurance-companies` | Primary carrier underwriter directory |
| | `POST` | `/api/insurance-companies` | Register insurance company |
| **Dashboard** | `GET` | `/api/dashboard/summary` | Executive KPI counts |
| | `GET` | `/api/dashboard/analytics` | Aggregated portfolio distributions |
| **Reports** | `GET` | `/api/reports/policies` | Policy distribution report |
| | `GET` | `/api/reports/premiums` | Premium collection trends |
| | `GET` | `/api/reports/claims` | Claim settlement ratio statistics |

---

## 8. Automated Testing

To run the backend test suite:
```bash
cd server
npm test
```
The test suite verifies:
- HTTP server startup & health check endpoint (`GET /api/health`)
- Zod request validation & rejection of malformed inputs (`POST /api/auth/register`)
- Centralized 404 error handling & JSON response standardization
