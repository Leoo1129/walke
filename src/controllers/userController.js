import pool from '../database/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/env.js';

const JWT_SECRET = getJwtSecret();

class InputError extends Error {
    constructor(message) { super(message); this.name = 'InputError'; }
}

export async function login(name, password) {
    if (!name || !password) {
        const error = new Error('name and password are required');
        error.statusCode = 400;
        throw error;
    }

    const { rows: [user] } = await pool.query(
        'SELECT id, name, password_hash, is_admin, email_verified FROM users WHERE name = $1',
        [name]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const token = jwt.sign(
        { id: user.id, name: user.name, is_admin: user.is_admin, email_verified: user.email_verified },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    return { token };
}

export async function createUser(name, password, street, city, postcode, country, bio = null, email = null) {
    if (!name || !password)
        throw new InputError('name and password are required');
    if (!email)
        throw new InputError('email is required');

    const { rows: taken } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (taken.length > 0) {
        const err = new Error('Email address is already in use');
        err.statusCode = 409;
        throw err;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { rows: [user] } = await pool.query(
        `INSERT INTO users (name, password_hash, street, city, postcode, country, bio, email, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
         RETURNING id, name, email`,
        [name, password_hash, street, city, postcode, country, bio, email]
    );

    if (!user) {
        const error = new Error('Failed to create user');
        error.statusCode = 500;
        throw error;
    }

    return user;
}

export async function searchUsers(name) {
    const { rows } = await pool.query(
        `SELECT id, name, logo_url, bio FROM users
         WHERE name ILIKE $1 AND is_active = TRUE
         LIMIT 10`,
        [`%${name}%`]
    );
    return rows;
}

export async function getUsers() {
    const { rows } = await pool.query(
        'SELECT id, name, street, city, postcode, country, created_at, last_updated, is_active, is_admin, logo_url, bio FROM users'
    );

    if (!rows || rows.length === 0) {
        const error = new Error('No users found');
        error.statusCode = 404;
        throw error;
    }

    return rows;
}

export async function getUser(id) {
    const { rows: [user] } = await pool.query(
        'SELECT id, name, street, city, postcode, country, created_at, last_updated, logo_url, bio, email, email_verified FROM users WHERE id = $1',
        [id]
    );

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
}

export async function updateUser(id, fields) {
    const allowed = ['name', 'street', 'city', 'postcode', 'country', 'logo_url', 'bio'];
    // email is handled separately via requestEmailVerification
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('User not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [user] } = await pool.query(
        `UPDATE users SET ${setClauses} WHERE id = $${values.length + 1} RETURNING id, name, street, city, postcode, country, created_at, last_updated, logo_url, bio, email, email_verified`,
        [...values, id]
    );

    if (!user) {
        const error = new Error('User not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    return user;
}

export async function deleteUser(id) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: [user] } = await client.query(
            'SELECT id, name FROM users WHERE id = $1',
            [id]
        );
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        // Soft-delete user
        await client.query('UPDATE users SET is_active = FALSE WHERE id = $1', [id]);

        // Soft-delete their products
        await client.query('UPDATE products SET is_active = FALSE WHERE seller_id = $1', [id]);

        // Get this seller's product IDs
        const { rows: sellerProducts } = await client.query(
            'SELECT id FROM products WHERE seller_id = $1',
            [id]
        );
        const productIds = sellerProducts.map(p => p.id);

        if (productIds.length > 0) {
            // Find pending orders containing this seller's products
            const { rows: affectedOrders } = await client.query(
                `SELECT DISTINCT o.id FROM orders o
                 JOIN order_items oi ON oi.order_id = o.id
                 WHERE oi.product_id = ANY($1) AND o.status = 'pending'`,
                [productIds]
            );

            for (const { id: orderId } of affectedOrders) {
                // Remove seller's items from order
                await client.query(
                    'DELETE FROM order_items WHERE order_id = $1 AND product_id = ANY($2)',
                    [orderId, productIds]
                );

                // Check remaining items
                const { rows: remaining } = await client.query(
                    `SELECT oi.quantity, p.price FROM order_items oi
                     JOIN products p ON p.id = oi.product_id
                     WHERE oi.order_id = $1`,
                    [orderId]
                );

                if (remaining.length === 0) {
                    await client.query(
                        'UPDATE orders SET status = \'cancelled\' WHERE id = $1',
                        [orderId]
                    );
                } else {
                    const newTotal = Math.round(
                        remaining.reduce((s, { price, quantity }) => s + price * quantity, 0) * 100
                    ) / 100;
                    await client.query(
                        'UPDATE orders SET total_price = $1 WHERE id = $2',
                        [newTotal, orderId]
                    );
                }
            }
        }

        // Cancel pending orders where this user is the buyer
        await client.query(
            `UPDATE orders SET status = 'cancelled'
             WHERE buyer_id = $1 AND status IN ('pending', 'confirmed')`,
            [id]
        );

        await client.query('COMMIT');
        return { ...user, is_active: false };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
