import pool from '../database/database.js';
import { HttpError } from '../utils/errors.js';

export async function createOrderCancellation(order_id, buyer_id, reason = null) {
    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id]
    );

    if (!order) {
        throw new HttpError(404, 'Order not found');
    }

    if (order.buyer_id !== buyer_id) {
        throw new HttpError(403, 'Only the buyer can cancel this order');
    }

    if (order.status === 'cancelled') {
        throw new HttpError(400, 'Order is already cancelled');
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
        throw new HttpError(404, 'No cancellation found for this order');
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
