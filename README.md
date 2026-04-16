# Walke

Walke is a full-stack marketplace and B2B procurement platform. Users can list products, build branded business storefronts, manage teams, place orders, negotiate with sellers via chat, and generate standards-compliant UBL 2.1 XML procurement documents — all in one place.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Database Setup](#2-database-setup)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Run the Backend](#4-run-the-backend)
  - [5. Run the Frontend](#5-run-the-frontend)
  - [Seed Data (Optional)](#seed-data-optional)
- [Features](#features)
- [API Reference](#api-reference)
- [XML / UBL 2.1](#xml--ubl-21)
- [Testing](#testing)
- [Linting](#linting)

---

## Tech Stack

**Backend**
- Node.js (ES Modules) + Express 5
- PostgreSQL via `pg`
- JWT authentication (bcrypt password hashing)
- UBL 2.1 XML via `xmlbuilder2`
- Image processing via `sharp` (resize + WebP conversion)
- File uploads via `multer`
- API docs via Swagger UI + OpenAPI 3.0

**Frontend**
- React 19 + Vite
- React Router v6
- Axios
- React Context (auth + theme)
- Light / dark mode with CSS custom properties

**Testing & Tooling**
- Vitest + Supertest (98 tests)
- ESLint

---

## Project Structure

```
walke/
├── src/                        # Backend source
│   ├── server.js               # Express app + all route definitions
│   ├── config.json             # Server config (default port: 3000)
│   ├── handler.js              # Centralised error handler
│   ├── controllers/            # Business logic per resource
│   │   ├── userController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── orderResponseController.js
│   │   ├── orderCancellationController.js
│   │   ├── cartController.js
│   │   ├── voucherController.js
│   │   ├── businessController.js
│   │   ├── chatController.js
│   │   ├── imageController.js
│   │   └── XMLController.js
│   ├── middleware/
│   │   └── auth.js             # requireAuth + requireAdmin middleware
│   └── database/
│       ├── database.js         # pg connection pool
│       └── database_schema.sql # Full schema (run this to set up the DB)
├── client/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/              # Route-level page components
│   │   ├── components/         # Shared components (Navbar)
│   │   ├── context/            # AuthContext, ThemeContext
│   │   └── api.js              # Axios instance (auto-injects Bearer token)
│   ├── public/                 # Static assets (logo, favicon)
│   └── vite.config.js          # Proxies /api and /uploads → backend
├── tests/
│   └── unit/                   # Backend unit + integration tests
├── public/
│   └── uploads/                # Uploaded images served statically
├── swagger.yaml                # Full OpenAPI 3.0 spec
├── seed.sql                    # Optional seed data (10 users, 20 products)
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- npm

---

### 1. Clone and Install

```bash
git clone <repo-url>
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

Create a `.env` file in the **project root**:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/procurement
JWT_SECRET=your_secret_key_here
```

> `JWT_SECRET` can be any string. Use something long and random in production.

The server port defaults to `3000` (set in `src/config.json`). You can override it:

```env
PORT=3000
```

---

### 4. Run the Backend

From the project root:

```bash
npm start
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

### Seed Data (Optional)

To populate the database with sample users and products:

```bash
psql -U postgres -d procurement -f seed.sql
```

This creates 10 users and 20 products. All seed users have the password `123`.

| Username | City |
|---|---|
| jake_burns | Sydney |
| priya_nair | Melbourne |
| tom_walsh | Brisbane |
| sarah_chen | Perth |
| marcus_lee | Adelaide |
| nina_okafor | Canberra |
| liam_foster | Hobart |
| emma_watson | Darwin |
| carlos_diaz | Gold Coast |
| zoe_miller | Newcastle |

---

## Features

- **User accounts** — register, login (JWT), profile pages with bio and address
- **Marketplace** — browse and search all products with images, tags, and seller info
- **Product management** — create, edit, and delete your own listings with image upload
- **Shopping cart** — add items, update quantities, apply voucher codes
- **Orders** — multi-seller orders, status lifecycle (pending → confirmed / rejected / cancelled)
- **Order negotiation** — turn-based chat between buyer and seller per order, with structured finalization (accept / reject / confirm / cancel)
- **Order responses** — sellers respond with `AB` (accept), `RE` (reject), or `IP` (request info)
- **Vouchers** — percentage or flat-amount discounts, expiry dates, max use limits (admin-only creation)
- **Business accounts** — create a business, manage a team with role-based permissions (Owner → Admin → Editor → Viewer)
- **Storefront builder** — customise colours, fonts, layout, banner image, and headline per business
- **UBL 2.1 XML** — download or view standards-compliant procurement documents for orders, responses, and cancellations
- **Image processing** — uploaded images are auto-converted to WebP and resized to max 1200×1200
- **Light / dark mode** — full theme toggle, persisted in localStorage
- **Swagger docs** — full OpenAPI 3.0 spec at `/docs`

---

## API Reference

Full interactive docs at `http://localhost:3000/docs`.

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | — | Login, returns JWT token |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users` | — | Register a new user |
| GET | `/users` | — | List all users (or search with `?name=`) |
| GET | `/users/:id` | — | Get user profile |
| PATCH | `/users/:id` | — | Update user (name, address, bio, logo_url) |
| DELETE | `/users/:id` | — | Soft-delete user |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/products` | Required | Create a product |
| GET | `/products` | — | List products (filter with `?seller_id=` or `?business_id=`) |
| GET | `/products/:id` | — | Get a product |
| PATCH | `/products/:id` | Required (owner only) | Update product |
| DELETE | `/products/:id` | Required (owner only) | Soft-delete product |

### Cart
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/cart` | Required | Add item to cart |
| GET | `/cart` | Required | View cart |
| PATCH | `/cart/:product_id` | Required | Update item quantity |
| DELETE | `/cart/:product_id` | Required | Remove item from cart |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Required | Place order from cart (optionally pass `voucher_code`) |
| GET | `/orders` | — | List orders (filter with `?seller_id=`) |
| GET | `/orders/:id` | — | Get order details (JSON or UBL XML) |
| PATCH | `/orders/:id` | — | Update order |
| DELETE | `/orders/:id` | — | Delete order |
| POST | `/orders/:id/response` | Required | Seller submits response (`AB` / `RE` / `IP`) |
| GET | `/orders/:id/response` | — | Get order response (JSON or UBL XML) |
| POST | `/orders/:id/cancel` | Required | Buyer cancels order |
| GET | `/orders/:id/cancel` | — | Get cancellation details (JSON or UBL XML) |
| GET | `/orders/:id/responses` | — | Get all seller responses for an order |

### Order Chat
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders/:id/chat/:seller_id` | Required | Open (or get) chat with a seller |
| GET | `/orders/:id/chats` | Required | Get all chats for an order |
| GET | `/orders/:id/chat/:seller_id` | Required | Get chat messages |
| POST | `/orders/:id/chat/:seller_id/message` | Required | Send a message (turn-based) |
| POST | `/orders/:id/chat/:seller_id/finalize` | Required | Finalize chat (`accept` / `reject` / `confirm` / `cancel`) |

### Vouchers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/vouchers` | Admin only | Create a voucher |
| GET | `/vouchers` | — | List all vouchers |
| GET | `/vouchers/:id` | — | Get a voucher |
| PATCH | `/vouchers/:id` | — | Update a voucher |
| DELETE | `/vouchers/:id` | — | Delete a voucher |

### Businesses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/businesses` | Required | Create a business (you become owner) |
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
| POST | `/images` | Required | Upload an image (multipart/form-data, field: `image`) — returns `{ url }` |

### System
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/docs` | — | Swagger UI |

---

## XML / UBL 2.1

Walke supports [UBL 2.1](https://docs.oasis-open.org/ubl/UBL-2.1.html) XML for procurement documents. Pass `Accept: application/xml` to get XML instead of JSON on supported endpoints.

Supported documents:
- **Order** — `GET /orders/:id` or response from `POST /orders`
- **OrderResponse** — `GET /orders/:id/response` or response from `POST /orders/:id/response`
- **OrderCancellation** — `GET /orders/:id/cancel` or response from `POST /orders/:id/cancel`

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

XML documents can also be viewed or downloaded directly from the Order Detail page in the frontend.

---

## Testing

Tests cover all backend controllers via black-box HTTP testing (Supertest + Vitest). The database is mocked so no live database connection is required to run tests.

```bash
npm test
```

98 tests, all passing.

---

## Linting

```bash
# Backend
npm run lint

# Frontend
cd client && npm run lint
```
