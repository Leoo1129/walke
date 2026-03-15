import pool from '../database/database.js';

export async function createOrderCancellation(order_id, buyer_id, reason = null) {
    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id]
    );

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    if (order.buyer_id !== buyer_id) {
        const error = new Error('Only the buyer can cancel this order');
        error.statusCode = 403;
        throw error;
    }

    if (order.status === 'cancelled') {
        const error = new Error('Order is already cancelled');
        error.statusCode = 400;
        throw error;
    }

    const { rows: [cancellation] } = await pool.query(
        'INSERT INTO order_cancellations (order_id, buyer_id, reason) VALUES ($1, $2, $3) RETURNING *',
        [order_id, buyer_id, reason]
    );

    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['cancelled', order_id]);

    return cancellation;
}

export async function getOrderCancellationDetails(order_id) {
    const { rows: [cancellation] } = await pool.query(
        'SELECT * FROM order_cancellations WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
        [order_id]
    );

    if (!cancellation) {
        const error = new Error('No cancellation found for this order');
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
        [cancellation.buyer_id]
    );

    const sellerIds = [...new Set(items.map(i => i.seller_id).filter(Boolean))];
    let sellers = [];
    if (sellerIds.length > 0) {
        const { rows } = await pool.query(
            'SELECT id, name, street, city, postcode, country FROM users WHERE id = ANY($1)',
            [sellerIds]
        );
        sellers = rows;
    }

    return { cancellation, order, items, buyer, sellers };
}
