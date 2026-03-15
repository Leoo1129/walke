import pool from '../database/database.js';

const VALID_CODES = ['AB', 'RE'];

export async function createOrderResponse(order_id, seller_id, response_code, note = null) {
    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id]
    );

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    if (!response_code || !VALID_CODES.includes(response_code)) {
        const error = new Error('response_code must be AB (accepted) or RE (rejected)');
        error.statusCode = 400;
        throw error;
    }

    const { rows: sellerItems } = await pool.query(
        `SELECT oi.product_id FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1 AND p.seller_id = $2`,
        [order_id, seller_id]
    );

    if (sellerItems.length === 0) {
        const error = new Error('Seller has no items in this order');
        error.statusCode = 403;
        throw error;
    }

    const { rows: [response] } = await pool.query(
        'INSERT INTO order_responses (order_id, seller_id, response_code, note) VALUES ($1, $2, $3, $4) RETURNING *',
        [order_id, seller_id, response_code, note]
    );

    const newStatus = response_code === 'AB' ? 'confirmed' : 'rejected';
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, order_id]);

    return response;
}

export async function getOrderResponseDetails(order_id) {
    const { rows: [response] } = await pool.query(
        'SELECT * FROM order_responses WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
        [order_id]
    );

    if (!response) {
        const error = new Error('No response found for this order');
        error.statusCode = 404;
        throw error;
    }

    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id]
    );

    const { rows: items } = await pool.query(
        `SELECT oi.product_id, oi.quantity, p.price, p.name AS product_name, p.seller_id
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1`,
        [order_id]
    );

    const { rows: [buyer] } = await pool.query(
        'SELECT id, name, street, city, postcode, country FROM users WHERE id = $1',
        [order.buyer_id]
    );

    const { rows: [seller] } = await pool.query(
        'SELECT id, name, street, city, postcode, country FROM users WHERE id = $1',
        [response.seller_id]
    );

    return { response, order, items, buyer, seller };
}
