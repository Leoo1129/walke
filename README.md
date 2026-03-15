# Walke API

A REST API for a procurement/marketplace platform. Built with Node.js, Express, and PostgreSQL.

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL

### Installation
```bash
npm install
```

### Database Setup
Create a PostgreSQL database and run the schema:
```bash
psql -U postgres -d procurement -f database/database_schema.sql
```

### Running the Server
```bash
npm start
```
Server runs on `http://walke-api.com` by default.

---

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check if the server is running |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Get all products |
| GET | `/products/:id` | Get a product by ID |
| POST | `/products` | Create a product |
| PATCH | `/products/:id` | Update a product |
| DELETE | `/products/:id` | Delete a product |

#### Create Product — Request Body
```json
{
    "name": "Widget",
    "price": 9.99,
    "seller_id": 1,
    "tags": ["gadget", "electronics"]
}
```

---

## Development

### Run Tests
```bash
npm test
```

### Run Linter
```bash
npm run lint
```

### API Docs
Available at `http://walke-api.com/docs` when the server is running.

---

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: PostgreSQL
- **Testing**: Vitest, Supertest
- **Docs**: Swagger UI