import pool from '../database/database.js';

const VALID_CODES = ['AB', 'RE', 'IP'];

export async function createOrderResponse(order_id, seller_id, response_code, note = null) {
    const { rows: [order] } = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    if (!response_code || !VALID_CODES.includes(response_code)) {
        const error = new Error('response_code must be AB (accepted), RE (rejected), or IP (request detail)');
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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: [response] } = await client.query(
            'INSERT INTO order_responses (order_id, seller_id, response_code, note) VALUES ($1, $2, $3, $4) RETURNING *',
            [order_id, seller_id, response_code, note]
        );

        if (response_code === 'IP') {
            // Open a chat for this order/seller pair
            await client.query(
                `INSERT INTO order_chats (order_id, seller_id, status, current_turn)
                 VALUES ($1, $2, 'open', 'buyer')
                 ON CONFLICT (order_id, seller_id) DO NOTHING`,
                [order_id, seller_id]
            );
        }

        if (response_code === 'RE') {
            // Remove seller's items and recalculate
            const { rows: sellerPids } = await client.query(
                `SELECT p.id FROM products p
                 JOIN order_items oi ON oi.product_id = p.id
                 WHERE oi.order_id = $1 AND p.seller_id = $2`,
                [order_id, seller_id]
            );
            if (sellerPids.length > 0) {
                await client.query(
                    'DELETE FROM order_items WHERE order_id = $1 AND product_id = ANY($2)',
                    [order_id, sellerPids.map(p => p.id)]
                );
            }

            const { rows: remaining } = await client.query(
                `SELECT oi.quantity, p.price FROM order_items oi
                 JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = $1`,
                [order_id]
            );

            if (remaining.length === 0) {
                await client.query('UPDATE orders SET status = \'rejected\', total_price = 0 WHERE id = $1', [order_id]);
                await client.query('COMMIT');
                return response;
            }

            const newTotal = Math.round(
                remaining.reduce((s, { price, quantity }) => s + price * quantity, 0) * 100
            ) / 100;
            await client.query('UPDATE orders SET total_price = $1 WHERE id = $2', [newTotal, order_id]);
        }

        // For AB and RE: check if all sellers have now responded with a final code
        if (response_code === 'AB' || response_code === 'RE') {
            const { rows: allSellers } = await client.query(
                `SELECT DISTINCT p.seller_id FROM order_items oi
                 JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = $1`,
                [order_id]
            );

            const { rows: latestResponses } = await client.query(
                `SELECT DISTINCT ON (seller_id) seller_id, response_code
                 FROM order_responses WHERE order_id = $1
                 ORDER BY seller_id, created_at DESC`,
                [order_id]
            );

            const finalRespondedIds = new Set(
                latestResponses
                    .filter(r => r.response_code === 'AB' || r.response_code === 'RE')
                    .map(r => r.seller_id)
            );

            const allDone = allSellers.every(s => finalRespondedIds.has(s.seller_id));

            if (allDone) {
                const { rows: [cnt] } = await client.query(
                    'SELECT COUNT(*) AS n FROM order_items WHERE order_id = $1',
                    [order_id]
                );
                const newStatus = parseInt(cnt.n) > 0 ? 'confirmed' : 'rejected';
                await client.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, order_id]);
            }
        }

        await client.query('COMMIT');
        return response;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
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

    const { rows: [order] } = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    const { rows: items } = await pool.query(
        `SELECT oi.product_id, oi.quantity, p.price, p.name AS product_name, p.seller_id
         FROM order_items oi JOIN products p ON p.id = oi.product_id
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

export async function getAllSellerResponses(order_id) {
    const { rows } = await pool.query(
        `SELECT DISTINCT ON (seller_id) or2.*, u.name AS seller_name
         FROM order_responses or2
         JOIN users u ON u.id = or2.seller_id
         WHERE or2.order_id = $1
         ORDER BY seller_id, created_at DESC`,
        [order_id]
    );
    return rows;
}
