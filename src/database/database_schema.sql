CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    street TEXT,
    city TEXT,
    postcode TEXT,
    country TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    discount DOUBLE PRECISION,
    expiry TIMESTAMP,
    max_uses INTEGER
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    seller_id INTEGER NOT NULL,
    tags TEXT[],
    unique_buyers INTEGER DEFAULT 0,
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL,
    status TEXT,
    total_price DOUBLE PRECISION,
    voucher_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

CREATE TABLE order_items (
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE cart_items (
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE order_responses (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    response_code VARCHAR(5) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE order_cancellations (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id)
);

CREATE TABLE wishlist (
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);