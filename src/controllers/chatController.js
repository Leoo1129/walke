import pool from '../database/database.js';

export async function getOrCreateChat(order_id, seller_id) {
    const { rows: sellerItems } = await pool.query(
        `SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1 AND p.seller_id = $2 LIMIT 1`,
        [order_id, seller_id]
    );
    if (!sellerItems.length) {
        const error = new Error('Seller has no items in this order');
        error.statusCode = 403;
        throw error;
    }

    const { rows: [chat] } = await pool.query(
        `INSERT INTO order_chats (order_id, seller_id, status, current_turn)
         VALUES ($1, $2, 'open', 'buyer')
         ON CONFLICT (order_id, seller_id) DO UPDATE SET order_id = EXCLUDED.order_id
         RETURNING *`,
        [order_id, seller_id]
    );
    return chat;
}

export async function getChat(order_id, seller_id) {
    const { rows: [chat] } = await pool.query(
        'SELECT * FROM order_chats WHERE order_id = $1 AND seller_id = $2',
        [order_id, seller_id]
    );
    if (!chat) {
        const error = new Error('Chat not found');
        error.statusCode = 404;
        throw error;
    }

    const { rows: messages } = await pool.query(
        `SELECT cm.*, u.name AS sender_name
         FROM chat_messages cm JOIN users u ON u.id = cm.sender_id
         WHERE cm.chat_id = $1 ORDER BY cm.created_at ASC`,
        [chat.id]
    );

    return { ...chat, messages };
}

export async function getOrderChats(order_id) {
    const { rows } = await pool.query(
        `SELECT oc.*, u.name AS seller_name
         FROM order_chats oc JOIN users u ON u.id = oc.seller_id
         WHERE oc.order_id = $1`,
        [order_id]
    );
    return rows;
}

export async function sendMessage(order_id, seller_id, sender_id, message) {
    if (!message || !message.trim()) {
        const error = new Error('Message cannot be empty');
        error.statusCode = 400;
        throw error;
    }

    const { rows: [chat] } = await pool.query(
        'SELECT * FROM order_chats WHERE order_id = $1 AND seller_id = $2',
        [order_id, seller_id]
    );
    if (!chat) { const e = new Error('Chat not found'); e.statusCode = 404; throw e; }
    if (chat.status !== 'open') { const e = new Error('Chat is closed'); e.statusCode = 400; throw e; }

    const { rows: [order] } = await pool.query('SELECT buyer_id FROM orders WHERE id = $1', [order_id]);
    const isBuyer = order.buyer_id === sender_id;
    const isSeller = parseInt(seller_id) === sender_id;
    if (!isBuyer && !isSeller) { const e = new Error('Not a participant'); e.statusCode = 403; throw e; }

    const senderRole = isBuyer ? 'buyer' : 'seller';

    const { rows: [msg] } = await pool.query(
        'INSERT INTO chat_messages (chat_id, sender_id, sender_role, message) VALUES ($1, $2, $3, $4) RETURNING *',
        [chat.id, sender_id, senderRole, message.trim()]
    );
    return msg;
}

export async function finalizeChat(order_id, seller_id, sender_id, action) {
    // action: 'accept' (seller AB), 'reject' (seller RE), 'cancel' (buyer), 'confirm' (buyer confirms details, passes turn)
    const { rows: [chat] } = await pool.query(
        'SELECT * FROM order_chats WHERE order_id = $1 AND seller_id = $2',
        [order_id, seller_id]
    );
    if (!chat) { const e = new Error('Chat not found'); e.statusCode = 404; throw e; }
    if (chat.status !== 'open') { const e = new Error('Chat is already closed'); e.statusCode = 400; throw e; }

    const { rows: [order] } = await pool.query('SELECT buyer_id FROM orders WHERE id = $1', [order_id]);
    const isBuyer = order.buyer_id === sender_id;
    const isSeller = parseInt(seller_id) === sender_id;
    if (!isBuyer && !isSeller) { const e = new Error('Not a participant'); e.statusCode = 403; throw e; }

    const senderRole = isBuyer ? 'buyer' : 'seller';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (action === 'confirm' && isBuyer) {
            // Just pass turn to seller
            await client.query(
                'INSERT INTO chat_messages (chat_id, sender_id, sender_role, message, action) VALUES ($1, $2, $3, $4, $5)',
                [chat.id, sender_id, 'buyer', 'Buyer confirmed details. Awaiting seller response.', 'confirm']
            );
            await client.query('UPDATE order_chats SET current_turn = $1 WHERE id = $2', ['seller', chat.id]);
            await client.query('COMMIT');
            return { action: 'confirm' };
        }

        let chatStatus;
        let finalLabel;
        if (isSeller && action === 'accept') {
            chatStatus = 'seller_accepted';
            finalLabel = 'Seller accepted the order.';
            await client.query(
                'INSERT INTO order_responses (order_id, seller_id, response_code) VALUES ($1, $2, $3)',
                [order_id, seller_id, 'AB']
            );
        } else if (isSeller && action === 'reject') {
            chatStatus = 'seller_rejected';
            finalLabel = 'Seller rejected the order.';
            await client.query(
                'INSERT INTO order_responses (order_id, seller_id, response_code) VALUES ($1, $2, $3)',
                [order_id, seller_id, 'RE']
            );
            // Remove seller's items
            const { rows: pids } = await client.query(
                `SELECT p.id FROM products p JOIN order_items oi ON oi.product_id = p.id
                 WHERE oi.order_id = $1 AND p.seller_id = $2`,
                [order_id, seller_id]
            );
            if (pids.length) {
                await client.query(
                    'DELETE FROM order_items WHERE order_id = $1 AND product_id = ANY($2)',
                    [order_id, pids.map(p => p.id)]
                );
            }
        } else if (isBuyer && action === 'cancel') {
            chatStatus = 'buyer_cancelled';
            finalLabel = 'Buyer cancelled the order.';
            await client.query(
                'INSERT INTO order_cancellations (order_id, buyer_id, reason) VALUES ($1, $2, $3)',
                [order_id, sender_id, 'Cancelled via chat']
            );
            await client.query('UPDATE orders SET status = \'cancelled\' WHERE id = $1', [order_id]);
        } else {
            const e = new Error('Invalid action for your role');
            e.statusCode = 400;
            throw e;
        }

        await client.query(
            'INSERT INTO chat_messages (chat_id, sender_id, sender_role, message, action) VALUES ($1, $2, $3, $4, $5)',
            [chat.id, sender_id, senderRole, finalLabel, action]
        );
        await client.query('UPDATE order_chats SET status = $1 WHERE id = $2', [chatStatus, chat.id]);

        // If seller made a final decision, check if all sellers responded
        if (isSeller) {
            const { rows: allSellers } = await client.query(
                `SELECT DISTINCT p.seller_id FROM order_items oi
                 JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
                [order_id]
            );
            const { rows: latest } = await client.query(
                `SELECT DISTINCT ON (seller_id) seller_id, response_code
                 FROM order_responses WHERE order_id = $1
                 ORDER BY seller_id, created_at DESC`,
                [order_id]
            );
            const finalIds = new Set(
                latest.filter(r => r.response_code === 'AB' || r.response_code === 'RE').map(r => r.seller_id)
            );
            if (allSellers.every(s => finalIds.has(s.seller_id))) {
                const { rows: [cnt] } = await client.query(
                    'SELECT COUNT(*) AS n FROM order_items WHERE order_id = $1', [order_id]
                );
                const hasItems = parseInt(cnt.n) > 0;
                if (hasItems) {
                    const { rows: items } = await client.query(
                        `SELECT oi.quantity, p.price FROM order_items oi
                         JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
                        [order_id]
                    );
                    const newTotal = Math.round(items.reduce((s, { price, quantity }) => s + price * quantity, 0) * 100) / 100;
                    await client.query('UPDATE orders SET status = $1, total_price = $2 WHERE id = $3', ['confirmed', newTotal, order_id]);
                } else {
                    await client.query('UPDATE orders SET status = \'rejected\' WHERE id = $1', [order_id]);
                }
            }
        }

        await client.query('COMMIT');
        return { action, chatStatus };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
