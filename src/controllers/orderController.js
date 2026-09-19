import Stripe from 'stripe';
import pool from '../database/database.js';
import { HttpError, InputError } from '../utils/errors.js';

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new HttpError(503, 'Stripe is not configured (STRIPE_SECRET_KEY missing)');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
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
        throw new HttpError(400, 'Cart is empty');
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
            throw new HttpError(404, 'Voucher not found');
        }

        if (voucher.expiry && new Date(voucher.expiry) < new Date()) {
            throw new HttpError(400, 'Voucher has expired');
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
            `INSERT INTO orders (buyer_id, status, total_price, voucher_id, payment_status)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [buyer_id, 'pending', total_price, voucher_id, 'awaiting_payment']
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

    // Create a Stripe PaymentIntent for the order amount (in cents)
    const stripe = getStripe();
    const amountCents = Math.round(total_price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'aud',
        metadata: { order_id: String(order.id), buyer_id: String(buyer_id) },
    });

    const { rows: [updatedOrder] } = await pool.query(
        'UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2 RETURNING *',
        [paymentIntent.id, order.id]
    );
    order = updatedOrder;

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

    return { order, items, buyer, sellers, client_secret: paymentIntent.client_secret };
}

export async function confirmPayment(order_id, user_id) {
    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id]
    );

    if (!order) {
        throw new HttpError(404, 'Order not found');
    }

    if (order.buyer_id !== Number(user_id)) {
        throw new HttpError(403, 'Forbidden');
    }

    if (order.payment_status === 'paid') return order;

    if (!order.stripe_payment_intent_id) {
        throw new HttpError(400, 'No payment intent associated with this order');
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
        throw new HttpError(402, `Payment not completed (status: ${paymentIntent.status})`);
    }

    const { rows: [updatedOrder] } = await pool.query(
        'UPDATE orders SET payment_status = \'paid\' WHERE id = $1 RETURNING *',
        [order_id]
    );

    return updatedOrder;
}

// Work out how a user relates to an order. Throws 404 if the order does not exist and
// 403 unless the user is an admin, the buyer, or a seller with items in the order.
export async function getOrderAccess(order_id, user) {
    const { rows: [row] } = await pool.query(
        `SELECT o.buyer_id,
                EXISTS (
                    SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id = o.id AND p.seller_id = $2
                ) AS is_seller
         FROM orders o
         WHERE o.id = $1`,
        [order_id, user.id]
    );

    if (!row) {
        throw new HttpError(404, 'Order not found');
    }

    const access = {
        isAdmin: Boolean(user.is_admin),
        isBuyer: row.buyer_id === user.id,
        isSeller: Boolean(row.is_seller),
    };

    if (!access.isAdmin && !access.isBuyer && !access.isSeller) {
        throw new HttpError(403, 'You do not have access to this order');
    }

    return access;
}

export async function getOrders(seller_id = null, buyer_id = null) {
    let rows;

    if (buyer_id) {
        ({ rows } = await pool.query(
            `SELECT o.*, u.name AS buyer_name
             FROM orders o
             LEFT JOIN users u ON u.id = o.buyer_id
             WHERE o.buyer_id = $1
             ORDER BY o.created_at DESC`,
            [buyer_id]
        ));
    } else if (seller_id) {
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
        throw new HttpError(404, 'No orders found');
    }

    return rows;
}

export async function getOrderDetails(id) {
    const { rows: [order] } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
    );

    if (!order) {
        throw new HttpError(404, 'Order not found');
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
        throw new HttpError(404, 'Order not found');
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
        throw new HttpError(400, 'Order not found or no valid fields to update');
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [order] } = await pool.query(
        `UPDATE orders SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
    );

    if (!order) {
        throw new HttpError(400, 'Order not found or no valid fields to update');
    }

    return order;
}

export async function deleteOrder(id) {
    const { rows: [order] } = await pool.query(
        'DELETE FROM orders WHERE id = $1 RETURNING *',
        [id]
    );

    if (!order) {
        throw new HttpError(404, 'Order not found');
    }

    return order;
}
