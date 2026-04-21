CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    street TEXT,
    city TEXT,
    postcode TEXT,
    country TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    logo_url TEXT,
    bio TEXT,
    email VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    bio TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE business_members (
    business_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (business_id, user_id),
    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE storefront_config (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL UNIQUE,
    primary_color TEXT DEFAULT '#1a1a1a',
    secondary_color TEXT DEFAULT '#f8f8f8',
    accent_color TEXT DEFAULT '#0066cc',
    text_color TEXT DEFAULT '#ffffff',
    font TEXT DEFAULT 'system-ui, sans-serif',
    banner_url TEXT,
    layout TEXT DEFAULT 'grid',
    headline TEXT,
    subheadline TEXT,
    hero_align TEXT DEFAULT 'center',
    hero_height TEXT DEFAULT 'md',
    overlay_opacity INTEGER DEFAULT 0,
    button_style TEXT DEFAULT 'rounded',
    card_style TEXT DEFAULT 'outlined',
    product_columns INTEGER DEFAULT 3,
    announcement TEXT,
    announcement_bg TEXT DEFAULT '#f59e0b',
    show_bio BOOLEAN DEFAULT TRUE,
    social_instagram TEXT,
    social_twitter TEXT,
    social_website TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    discount DOUBLE PRECISION,
    expiry TIMESTAMP,
    max_uses INTEGER,
    business_id INTEGER DEFAULT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    seller_id INTEGER NOT NULL,
    business_id INTEGER DEFAULT NULL,
    tags TEXT[],
    image_url TEXT,
    unique_buyers INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (business_id) REFERENCES businesses(id)
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

CREATE TABLE email_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(64) UNIQUE NOT NULL,
    email      VARCHAR(255) NOT NULL,
    type       VARCHAR(10) NOT NULL CHECK (type IN ('verify', 'reset')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_chats (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    status TEXT DEFAULT 'open',
    current_turn TEXT DEFAULT 'buyer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, seller_id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    action TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES order_chats(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
