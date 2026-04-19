-- Run this against your PostgreSQL database before starting the server.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing users have no email but must not be locked out
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

-- Prevent duplicate emails
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Tokens for email verification and password reset
CREATE TABLE IF NOT EXISTS email_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(64) UNIQUE NOT NULL,
    email      VARCHAR(255) NOT NULL,
    type       VARCHAR(10) NOT NULL CHECK (type IN ('verify', 'reset')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
