# Walke API

A procurement REST API built with Node.js, Express 5, and PostgreSQL. Supports the full B2B procurement flow with UBL 2.1 XML document generation.

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5.2.1
- **Database**: PostgreSQL via `pg`
- **Auth**: JWT (Bearer tokens)
- **XML**: UBL 2.1 via `xmlbuilder2`
- **Docs**: Swagger UI (`/docs`)
- **Testing**: Vitest + Supertest (98 tests)
- **Linting**: ESLint

## Features

- User registration and JWT authentication
- Product management
- Shopping cart
- Voucher/discount codes
- Full procurement flow with UBL 2.1 XML support:
  - **Order** — buyer places an order
  - **OrderResponse** — seller accepts (`AB`) or rejects (`RE`)
  - **OrderCancellation** — buyer cancels an order
- Content negotiation — send `Accept: application/xml` to get UBL XML, default is JSON

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Install

```bash
npm install
```

### Database

```bash
psql -h localhost -U postgres -d procurement -f src/database/database_schema.sql
```

### Environment

Create a `.env` file:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/procurement
JWT_SECRET=your_secret_here
```

### Run

```bash
npm start
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Get JWT token |
| POST | `/users` | Register user |
| GET/PATCH/DELETE | `/users/:id` | Manage user |
| GET/POST | `/products` | List / create products |
| GET/PATCH/DELETE | `/products/:id` | Manage product |
| GET/POST/DELETE | `/cart` | Manage cart |
| GET/POST | `/orders` | List / place order |
| GET | `/orders/:id` | Get order (JSON or UBL XML) |
| POST | `/orders/:id/response` | Seller accepts/rejects (JSON or UBL XML) |
| GET | `/orders/:id/response` | Get order response |
| POST | `/orders/:id/cancel` | Buyer cancels order (JSON or UBL XML) |
| GET | `/orders/:id/cancel` | Get cancellation |
| GET/POST | `/vouchers` | List / create vouchers |
| GET/PATCH/DELETE | `/vouchers/:id` | Manage voucher |
| GET | `/health` | Health check |

Full API docs available at `/docs`.

## XML Example

```bash
# Place order and receive UBL 2.1 Order XML
curl -X POST http://walke-api.com/orders \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/xml" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Order xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"
       xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
       xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>1</cbc:ID>
  <cbc:IssueDate>2026-03-15</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>AUD</cbc:DocumentCurrencyCode>
  <cac:BuyerCustomerParty>...</cac:BuyerCustomerParty>
  <cac:SellerSupplierParty>...</cac:SellerSupplierParty>
  <cac:OrderLine>...</cac:OrderLine>
</Order>
```

## Live API

Base URL: `http://walke-api.com`
Docs: `http://walke-api.com/docs`
