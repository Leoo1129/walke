import pool from '../database/database.js';

class InputError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InputError';
    }
}

export async function addToCart(user_id, product_id, quantity) {
    if (!product_id || !quantity)
        throw new InputError('product_id and quantity are required');
    if (quantity < 1)
        throw new InputError('quantity must be at least 1');

    const { rows: [item] } = await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = $3
         RETURNING *`,
        [user_id, product_id, quantity]
    );

    return item;
}

export async function getCart(user_id) {
    const { rows } = await pool.query(
        `SELECT ci.product_id, ci.quantity, p.name AS product_name, p.price, p.image_url
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = $1`,
        [user_id]
    );

    return rows;
}

export async function updateCartItem(user_id, product_id, quantity) {
    if (!quantity || quantity < 1)
        throw new InputError('quantity must be at least 1');

    const { rows: [item] } = await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *',
        [quantity, user_id, product_id]
    );

    if (!item) {
        const error = new Error('Cart item not found');
        error.statusCode = 404;
        throw error;
    }

    return item;
}

export async function removeFromCart(user_id, product_id) {
    const { rows: [item] } = await pool.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *',
        [user_id, product_id]
    );

    if (!item) {
        const error = new Error('Cart item not found');
        error.statusCode = 404;
        throw error;
    }

    return item;
}
