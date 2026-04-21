import pool from '../database/database.js';

class InputError extends Error {
    constructor(message) { super(message); this.name = 'InputError'; }
}

export async function createOrder(buyer_id, voucher_code = null) {
    if (!buyer_id)
        throw new InputError('buyer_id is required');

    // Fetch cart items joined with product details
    const { rows: items } = await pool.query(
        `SELECT ci.product_id, ci.quantity, p.price, p.name AS product_name, p.seller_id
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = $1`,
        [buyer_id]
    );

    if (items.length === 0) {
        const error = new Error('Cart is empty');
        error.statusCode = 400;
        throw error;
    }

    // Calculate subtotal from cart
    let total_price = items.reduce((sum, { price, quantity }) => sum + price * quantity, 0);

    // Apply voucher discount if provided
    let voucher_id = null;
    if (voucher_code) {
        const { rows: [voucher] } = await pool.query(
            'SELECT * FROM vouchers WHERE name = $1',
            [voucher_code]
        );

        if (!voucher) {
            const error = new Error('Voucher not found');
            error.statusCode = 404;
            throw error;
        }

        if (voucher.expiry && new Date(voucher.expiry) < new Date()) {
            const error = new Error('Voucher has expired');
            error.statusCode = 400;
            throw error;
        }

        voucher_id = voucher.id;

        if (voucher.discount < 1) {
            total_price = total_price * (1 - voucher.discount);  // e.g. 0.2 = 20% off
        } else {
            total_price = Math.max(0, total_price - voucher.discount);  // e.g. 20 = $20 off
        }

        total_price = Math.round(total_price * 100) / 100;
    }

    const client = await pool.connect();
    let order;
    try {
        await client.query('BEGIN');

        const { rows: [createdOrder] } = await client.query(
            'INSERT INTO orders (buyer_id, status, total_price, voucher_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [buyer_id, 'pending', total_price, voucher_id]
        );
        order = createdOrder;

        for (const { product_id, quantity } of items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
                [order.id, product_id, quantity]
            );
        }

        await client.query('DELETE FROM cart_items WHERE user_id = $1', [buyer_id]);

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }

    const { rows: [buyer] } = await pool.query(
        'SELECT id, name, street, city, postcode, country FROM users WHERE id = $1',
        [buyer_id]
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

    return { order, items, buyer, sellers };
}

export async function getOrders(seller_id = null) {
    let rows;

    if (seller_id) {
        ({ rows } = await pool.query(
            `SELECT DISTINCT o.*, u.name AS buyer_name
             FROM orders o
             LEFT JOIN users u ON u.id = o.buyer_id
             JOIN order_items oi ON oi.order_id = o.id
             JOIN products p ON p.id = oi.product_id
             WHERE p.seller_id = $1
             ORDER BY o.created_at DESC`,
            [seller_id]
        ));
    } else {
        ({ rows } = await pool.query(
            `SELECT o.*, u.name AS buyer_name
             FROM orders o
             LEFT JOIN users u ON u.id = o.buyer_id
             ORDER BY o.created_at DESC`
        ));
    }

    if (!rows || rows.length === 0) {
        const error = new Error('No orders found');
        error.statusCode = 404;
        throw error;
    }

    return rows;
}

export async function getOrderDetails(id) {
    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
    );

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    const { rows: items } = await pool.query(
        `SELECT oi.product_id, oi.quantity, p.price, p.name AS product_name, p.seller_id
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1`,
        [id]
    );

    const { rows: [buyer] } = await pool.query(
        'SELECT id, name, street, city, postcode, country FROM users WHERE id = $1',
        [order.buyer_id]
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

    return { order, items, buyer, sellers };
}

export async function getOrder(id) {
    const { rows: [order] } = await pool.query(
        `SELECT o.*, u.name AS buyer_name, u.city AS buyer_city, u.country AS buyer_country
         FROM orders o
         LEFT JOIN users u ON u.id = o.buyer_id
         WHERE o.id = $1`,
        [id]
    );

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    const { rows: items } = await pool.query(
        `SELECT oi.product_id, oi.quantity, p.price, p.name AS name, p.seller_id, p.image_url,
                u.name AS seller_name
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         LEFT JOIN users u ON u.id = p.seller_id
         WHERE oi.order_id = $1`,
        [id]
    );

    const sellerIds = [...new Set(items.map(i => i.seller_id).filter(Boolean))];
    let sellers = [];
    if (sellerIds.length > 0) {
        const { rows } = await pool.query(
            'SELECT id, name, city, country FROM users WHERE id = ANY($1)',
            [sellerIds]
        );
        sellers = rows;
    }

    const buyer = {
        id: order.buyer_id,
        name: order.buyer_name,
        city: order.buyer_city,
        country: order.buyer_country,
    };

    return { ...order, items, buyer, sellers };
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
