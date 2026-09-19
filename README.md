# Walke

[![CI](https://github.com/Leoo1129/walke/actions/workflows/ci.yml/badge.svg)](https://github.com/Leoo1129/walke/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/postgres-16-4169E1?logo=postgresql&logoColor=white)

Walke is a full-stack marketplace and B2B procurement platform. Users can list products, build branded business storefronts, manage teams, place orders, negotiate with sellers via chat, pay with Stripe, and generate standards-compliant UBL 2.1 XML procurement documents — all in one place.

![Walke marketplace](docs/screenshots/marketplace.png)

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Database Setup](#2-database-setup)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Run the Backend](#4-run-the-backend)
  - [5. Run the Frontend](#5-run-the-frontend)
- [Features](#features)
- [Security](#security)
- [API Reference](#api-reference)
- [XML / UBL 2.1](#xml--ubl-21)
- [Testing](#testing)
- [Linting](#linting)
- [Team](#team)

---

## Architecture

```mermaid
flowchart LR
    Browser["React SPA<br/>(Vite, React Router)"] -->|"/api/* JSON or UBL XML"| MW

    subgraph API["Express 5 API"]
        MW["Middleware<br/>helmet · CORS · rate limits<br/>JWT auth · zod validation"] --> Routes["Routers<br/>auth · users · products · cart<br/>orders · vouchers · businesses"]
        Routes --> Controllers["Controllers<br/>business rules · UBL 2.1 XML"]
        Controllers -.->|HttpError| EH["Central error handler"]
    end

    Controllers --> DB[("PostgreSQL")]
    Controllers --> Stripe["Stripe<br/>PaymentIntents"]
    Controllers --> SMTP["SMTP<br/>verification · reset · XML"]
    Controllers --> ABR["ABN Lookup API"]
    Browser -->|"card details"| StripeJS["Stripe.js"]
```

In production the API also serves the built React app, so the whole platform runs as a single container next to PostgreSQL.

---

## Tech Stack

**Backend**
- Node.js (ES Modules) + Express 5
- PostgreSQL via `pg`
- JWT authentication (bcrypt password hashing)
- UBL 2.1 XML via `xmlbuilder2`
- Image processing via `sharp` (resize + WebP conversion)
- File uploads via `multer`
- Email via `nodemailer` (verification + password reset + XML delivery)
- Stripe payments via `stripe`
- Request validation via `zod`
- Security headers via `helmet`, rate limiting via `express-rate-limit`
- API docs via Swagger UI + OpenAPI 3.0

**Frontend**
- React 19 + Vite
- React Router v6
- Axios
- Stripe.js (`@stripe/stripe-js`)
- React Context (auth, cart, toasts, theme, currency)
- Route-level code splitting with `React.lazy`
- Light / dark mode with CSS custom properties

**Testing & Tooling**
- Vitest + Supertest (348 tests, ~81% line coverage)
- ESLint
- Docker + Docker Compose
- GitHub Actions (lint, test, build, Docker image)

---

## Project Structure

```
walke/
├── src/                        # Backend source
│   ├── app.js                  # Express app: middleware, routers, error handling
│   ├── server.js               # Starts the HTTP server, graceful shutdown
│   ├── config.json             # Server config (default port: 3000)
│   ├── routes/                 # One Express router per resource
│   │   ├── auth.js  users.js  products.js  cart.js
│   │   └── orders.js  vouchers.js  businesses.js  images.js
│   ├── controllers/            # Business logic per resource
│   │   ├── userController.js  productController.js  orderController.js
│   │   ├── orderResponseController.js  orderCancellationController.js
│   │   ├── cartController.js  voucherController.js  businessController.js
│   │   └── chatController.js  imageController.js  XMLController.js
│   ├── middleware/
│   │   ├── auth.js             # requireAuth / requireAdmin / requireVerified / optionalAuth
│   │   ├── orderAccess.js      # Restricts order resources to buyer, sellers and admins
│   │   ├── security.js         # helmet, CORS allowlist, request logging
│   │   ├── rateLimit.js        # Login / registration / email endpoint limits
│   │   └── errorHandler.js     # Central error handler + JSON 404
│   ├── validation/             # zod schemas + validateBody / validateIdParam
│   ├── utils/                  # HttpError classes, environment helpers
│   ├── services/
│   │   └── mailer.js           # Nodemailer (verification, password reset, XML delivery)
│   └── database/
│       ├── database.js         # pg connection pool
│       └── database_schema.sql # Full schema (run this to set up the DB)
├── client/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/              # Route-level page components (lazy-loaded)
│   │   ├── components/         # Navbar, PageLoader, SessionWatcher
│   │   ├── context/            # Auth, Cart, Toast, Theme, Currency contexts
│   │   └── api.js              # Axios instance (Bearer token, session expiry)
│   ├── .env.example            # Frontend environment variable template (VITE_*)
│   └── vite.config.js          # Proxies /api and /uploads → backend
├── tests/
│   ├── unit/                   # Unit tests (controller functions directly)
│   └── system/                 # System tests (HTTP via Supertest)
├── public/uploads/             # Uploaded images served statically
├── Dockerfile                  # Multi-stage build (client + API, non-root)
├── docker-compose.yml          # PostgreSQL + API in one command
├── .github/workflows/ci.yml    # GitHub Actions pipeline
└── swagger.yaml                # Full OpenAPI 3.0 spec
```

---

## Quick Start (Docker)

The fastest way to run everything — PostgreSQL, the API and the built frontend:

```bash
cp .env.example .env    # set JWT_SECRET; Stripe and SMTP keys are optional
docker compose up --build
```

Open `http://localhost:3000` (set `HOST_PORT` in `.env` if port 3000 is taken). The database schema is applied automatically on first start.

> Without SMTP credentials, new accounts cannot receive their verification email. To verify an account locally, run
> `docker compose exec db psql -U walke -d procurement -c "UPDATE users SET email_verified = TRUE;"`

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+
- npm

---

### 1. Clone and Install

```bash
git clone https://github.com/Leoo1129/walke.git
cd walke

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

---

### 2. Database Setup

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE procurement;"
psql -U postgres -d procurement -f src/database/database_schema.sql
```

> The default database name used in the project is `procurement`. You can use any name — just update your `DATABASE_URL` accordingly.

---

### 3. Environment Variables

Copy `.env.example` to `.env` in the **project root** and fill in your values:

```env
# Required
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/procurement
JWT_SECRET=your_secret_key_here

# Required for payments
STRIPE_SECRET_KEY=sk_test_...

# Optional — email features (verification, password reset, XML delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@example.com
APP_URL=http://localhost:5173

# Optional — ABN validation via Australian Business Register API
ABN_LOOKUP_GUID=your_abr_guid

# Optional — cross-origin allowlist (comma-separated; any origin in dev, same-origin in production)
CORS_ORIGINS=http://localhost:5173

# Optional — override default port (3000)
PORT=3000
```

Copy `client/.env.example` to `client/.env`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

> `JWT_SECRET` can be any string in development. When `NODE_ENV=production` the server refuses to start without it, so a well-known fallback secret is never used to sign real tokens.
>
> SMTP variables are only required if you want email verification, password reset, and XML email delivery to work. If omitted, registration still succeeds; in development the verification / reset link is printed to the server console so you can open it directly.
>
> Behind a reverse proxy, set `TRUST_PROXY=1` so rate limiting sees the real client IP.
>
> `ABN_LOOKUP_GUID` is optional — if omitted, ABN validation is skipped during business creation.

The frontend sends requests to `/api/*` which Vite proxies to the backend in dev mode. In production, the backend serves the built frontend from `client/dist/`.

---

### 4. Run the Backend

From the project root:

```bash
npm start        # or: npm run dev (restarts on file changes)
```

The API will be available at `http://localhost:3000`.  
Swagger UI docs are at `http://localhost:3000/docs`.

---

### 5. Run the Frontend

In a separate terminal:

```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:5173`.

Vite automatically proxies requests:
- `/api/*` → `http://localhost:3000` (strips the `/api` prefix)
- `/uploads/*` → `http://localhost:3000` (serves uploaded images)

> Both the backend and frontend need to be running at the same time.

---

## Features

- **User accounts** — register, login (JWT), email verification, password reset, profile pages with bio and address
- **Marketplace** — browse and search all products with images, tags, and seller info
- **Product management** — create, edit, and delete your own listings with image upload
- **Shopping cart** — add items, update quantities, apply voucher codes at checkout
- **Orders & payments** — multi-seller orders, Stripe payment integration, status lifecycle (pending → confirmed / rejected / cancelled)
- **Order negotiation** — turn-based chat between buyer and seller per order, with structured finalization (accept / reject / confirm / cancel)
- **Order responses** — sellers respond with `AB` (accept), `RE` (reject), or `IP` (request info)
- **Vouchers** — percentage or flat-amount discounts, expiry dates, max use limits
- **Business accounts** — create a business, manage a team with role-based permissions (Owner → Admin → Editor → Viewer)
- **Storefront builder** — customise colours, fonts, layout, banner image, and headline per business
- **UBL 2.1 XML** — download, view, or email standards-compliant procurement documents for orders, responses, and cancellations
- **Image processing** — uploaded images are auto-converted to WebP and resized to max 1200×1200
- **Light / dark mode** — full theme toggle, persisted in localStorage
- **Swagger docs** — full OpenAPI 3.0 spec at `/docs`

---

## Security

- **Authentication** — bcrypt-hashed passwords and 24-hour JWTs. The server refuses to start in production without `JWT_SECRET`, and the client signs users out cleanly when a token expires.
- **Authorization** — orders, responses, cancellations, negotiation chats and XML emails are restricted to the order's buyer, sellers with items in it, and admins. Sellers only see their own chat on multi-seller orders. Products are always listed under the caller, and business listings require the editor role.
- **Privacy** — public profiles never include email or street address; the full user list is admin-only.
- **Input validation** — registration, login, password reset, products, cart, orders, chat messages, vouchers and business creation validate their bodies with zod and return field-level errors; non-numeric ids are rejected with 400 before reaching the database.
- **Abuse protection** — rate limits on login (10 / 15 min), registration (5 / hour) and email-sending endpoints (5 / 15 min).
- **Headers & CORS** — helmet with a Content Security Policy scoped to Stripe, Google Fonts and the exchange-rate API; CORS restricted to `CORS_ORIGINS`.
- **Error handling** — unexpected errors return a generic 500 without database or stack details.
- **Payments** — card details go directly to Stripe; orders are only marked paid after the server confirms the PaymentIntent succeeded.

---

## API Reference

Full interactive docs at `http://localhost:3000/docs`.

![Swagger API docs](docs/screenshots/api-docs.png)

Validation errors use a consistent shape:

```json
{ "error": "email: must be a valid email address",
  "details": [{ "field": "email", "message": "must be a valid email address" }] }
```

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | — | Login, returns JWT token |
| POST | `/auth/verify-email` | — | Verify email with token from email link (`{ token }`) |
| POST | `/auth/forgot-password` | — | Send a password reset email (`{ email }`) |
| GET | `/auth/reset-password/:token` | — | Validate a password reset token |
| POST | `/auth/reset-password` | — | Reset password with token (`{ token, password }`) |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users` | — | Register a new user (triggers verification email) |
| GET | `/users` | Required | Search with `?name=`; listing all users is admin only |
| GET | `/users/:id` | Optional | Public profile; email and address only for the user themselves or an admin |
| PATCH | `/users/:id` | Required | Update user (name, address, bio, logo_url) |
| DELETE | `/users/:id` | Required | Soft-delete user |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/products` | Required (verified) | Create a product (listed under the caller; editor role needed for `business_id`) |
| GET | `/products` | — | List products (filter with `?seller_id=` or `?business_id=`) |
| GET | `/products/:id` | — | Get a product |
| PATCH | `/products/:id` | Required (owner only) | Update product |
| DELETE | `/products/:id` | Required (owner only) | Soft-delete product |

### Cart
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/cart` | Required (verified) | Add item to cart |
| GET | `/cart` | Required | View cart |
| PATCH | `/cart/:product_id` | Required | Update item quantity |
| DELETE | `/cart/:product_id` | Required | Remove item from cart |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Required (verified) | Place order from cart (optionally pass `voucher_code`), returns Stripe `client_secret` |
| GET | `/orders` | Required | Your orders as buyer; `?seller_id=<your id>` for orders of your products; admins see all |
| GET | `/orders/:id` | Order party | Get order details (JSON or UBL XML) |
| PATCH | `/orders/:id` | Admin only | Update order |
| DELETE | `/orders/:id` | Admin only | Delete order |
| POST | `/orders/:id/pay` | Required (verified) | Confirm Stripe payment for an order |
| POST | `/orders/:id/response` | Required (verified) | Seller submits response (`AB` / `RE` / `IP`) |
| GET | `/orders/:id/response` | Order party | Get order response (JSON or UBL XML) |
| GET | `/orders/:id/responses` | Order party | Get all seller responses for an order |
| POST | `/orders/:id/cancel` | Required (verified) | Buyer cancels order |
| GET | `/orders/:id/cancel` | Order party | Get cancellation details (JSON or UBL XML) |
| POST | `/orders/:id/xml-email` | Order party | Email the order XML document to a specified address |

> **Order party** = the buyer, a seller with items in the order, or an admin.

### Order Chat
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders/:id/chat/:seller_id` | Required (verified) | Open (or get) chat with a seller |
| GET | `/orders/:id/chats` | Order party | Get chats for an order (sellers see only their own) |
| GET | `/orders/:id/chat/:seller_id` | Chat participant | Get chat messages |
| POST | `/orders/:id/chat/:seller_id/message` | Required (verified) | Send a message (turn-based) |
| POST | `/orders/:id/chat/:seller_id/finalize` | Required (verified) | Finalize chat (`accept` / `reject` / `confirm` / `cancel`) |

### Vouchers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/vouchers` | Required (verified) | Create a voucher (global vouchers: admin only; business vouchers: owner or admin of that business) |
| GET | `/vouchers` | — | List all vouchers |
| GET | `/vouchers/:id` | — | Get a voucher |
| PATCH | `/vouchers/:id` | Required (verified) | Update a voucher (same permission rules as create) |
| DELETE | `/vouchers/:id` | Required (verified) | Delete a voucher (same permission rules as create) |

### Businesses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/businesses` | Required (verified) | Create a business (you become owner) |
| GET | `/businesses` | — | List businesses (filter with `?member_id=`) |
| GET | `/businesses/:id` | — | Get business details |
| PATCH | `/businesses/:id` | Required (admin+) | Update business |
| DELETE | `/businesses/:id` | Required (owner) | Soft-delete business |
| GET | `/businesses/:id/members` | Required | List members with roles |
| POST | `/businesses/:id/members` | Required (admin+) | Invite a member |
| PATCH | `/businesses/:id/members/:user_id` | Required (admin+) | Update member role |
| DELETE | `/businesses/:id/members/:user_id` | Required (admin+) | Remove a member |
| GET | `/businesses/:id/storefront` | — | Get storefront config |
| PATCH | `/businesses/:id/storefront` | Required (editor+) | Update storefront config |

### Images
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/images` | Required (verified) | Upload an image (multipart/form-data, field: `image`) — returns `{ url }` |

### System
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/docs` | — | Swagger UI |

---

## XML / UBL 2.1

Walke supports [UBL 2.1](https://docs.oasis-open.org/ubl/UBL-2.1.html) XML for procurement documents. Pass `Accept: application/xml` to get XML instead of JSON on supported endpoints.

Supported documents:
- **Order** — `GET /orders/:id`
- **OrderResponse** — `GET /orders/:id/response`
- **OrderCancellation** — `GET /orders/:id/cancel`

XML documents can also be emailed directly from the frontend Order Detail page via `POST /orders/:id/xml-email`.

**Example:**

```bash
curl -X GET http://localhost:3000/orders/1 \
  -H "Accept: application/xml"
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Order xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"
       xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
       xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>1</cbc:ID>
  <cbc:IssueDate>2026-04-16</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>AUD</cbc:DocumentCurrencyCode>
  <cac:BuyerCustomerParty>...</cac:BuyerCustomerParty>
  <cac:SellerSupplierParty>...</cac:SellerSupplierParty>
  <cac:OrderLine>...</cac:OrderLine>
</Order>
```

---

## Testing

The test suite uses Vitest and covers all backend controllers, routes, middleware and validation. The database pool is mocked so no live database connection is needed.

```bash
npm test                # run the suite
npm run test:coverage   # with a v8 coverage report
```

348 tests, ~81% line coverage. GitHub Actions runs lint, tests with coverage, the frontend build and a Docker image build on every push and pull request.

**Test layout:**

| Folder | What it tests | How |
|--------|--------------|-----|
| `tests/unit/` | Controller functions directly | Imports functions, calls them with mocked `pool.query` |
| `tests/system/` | HTTP routes end-to-end | Supertest against the full Express app |

Unit tests are faster and test business logic in isolation. System tests verify routing, auth middleware, request parsing, and response formatting.

---

## Linting

```bash
# Backend
npm run lint

# Frontend
cd client && npm run lint
```

---

## Team

Walke was originally built as a team project by a team of four developers, including **Leo Dong**.

Since then, Leo has continued developing the project: fixing broken access control on orders and user data, adding rate limiting, security headers and zod validation, restructuring the backend into routers, containerising it with Docker, setting up GitHub Actions CI, and improving the frontend with code splitting, toast notifications, session-expiry handling and a responsive navbar.
