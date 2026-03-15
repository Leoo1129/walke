import pool from '../database/database.js';

class InputError extends Error {}

export async function createOrder(buyer_id, items, total_price, voucher_id = null) {
    if (!buyer_id || !items || items.length === 0)
        throw new InputError('buyer_id and items are required');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: [order] } = await client.query(
            'INSERT INTO orders (buyer_id, status, total_price, voucher_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [buyer_id, 'pending', total_price, voucher_id]
        );

        for (const { product_id, quantity } of items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
                [order.id, product_id, quantity]
            );
        }

        await client.query('COMMIT');
        return order;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
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
    const allowed = ['status', 'total_price', 'voucher_id'];
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
