import pool from '../database/database.js';

class InputError extends Error {}

export async function createOrder(buyer_id, product_id, quantity) {
    if (!buyer_id || !product_id || quantity == null)
        throw new InputError('buyer_id, product_id, and quantity are required');

    const { rows: [order] } = await pool.query(
        'INSERT INTO orders (buyer_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
        [buyer_id, product_id, quantity]
    );

    if (!order) {
        const error = new Error('Failed to create order');
        error.statusCode = 500;
        throw error;
    }

    return order;
}

export async function getOrders() {
    const { rows } = await pool.query('SELECT * FROM orders');

    if (!rows || rows.length === 0) {
        const error = new Error('No orders found');
        error.statusCode = 404;
        throw error;
    }

    return rows;
}

export async function getOrder(id) {
    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
    );

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    return order;
}

export async function updateOrder(id, fields) {
    const allowed = ['quantity', 'status'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('Order not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [order] } = await pool.query(
        `UPDATE orders SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
    );

    if (!order) {
        const error = new Error('Order not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    return order;
}

export async function deleteOrder(id) {
    const { rows: [order] } = await pool.query(
        'DELETE FROM orders WHERE id = $1 RETURNING *',
        [id]
    );

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    return order;
}
