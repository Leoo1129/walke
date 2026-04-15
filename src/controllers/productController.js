import pool from '../database/database.js';

class InputError extends Error {}

export async function createProduct(name, price, seller_id, tags = [], image_url = null, business_id = null) {
    if (!name || price == null || !seller_id)
        throw new InputError('name, price, and seller_id are required');

    const { rows: [product] } = await pool.query(
        'INSERT INTO products (name, price, seller_id, tags, image_url, business_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, price, seller_id, tags, image_url, business_id]
    );

    if (!product) {
        const error = new Error('No products found');
        error.statusCode = 404;
        throw error;
    }

    return product;
}

export async function getProducts(seller_id = null, business_id = null) {
    let query = `SELECT p.*, u.name AS seller_name FROM products p LEFT JOIN users u ON u.id = p.seller_id`;
    const conditions = [];
    const params = [];

    if (seller_id) {
        params.push(seller_id);
        conditions.push(`p.seller_id = $${params.length}`);
    }
    if (business_id) {
        params.push(business_id);
        conditions.push(`p.business_id = $${params.length}`);
    }
    if (conditions.length > 0) query += ` WHERE ` + conditions.join(' AND ');

    const { rows } = await pool.query(query, params);

    if (!rows || rows.length === 0) {
        const error = new Error('No products found');
        error.statusCode = 404;
        throw error;
    }

    return rows;
}

export async function getProduct(id) {
    const { rows: [product] } = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
    );

    if (!product) {
        const error = new Error('Poduct not found');
        error.statusCode = 404;
        throw error;
    }

    return product;
}

export async function updateProduct(id, fields) {
    const allowed = ['name', 'price', 'tags', 'image_url'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('Product not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [product] } = await pool.query(
        `UPDATE products SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
    );

    if (!product) {
        const error = new Error('Product not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    return product;
}

export async function deleteProduct(id) {
    const { rows: [product] } = await pool.query(
        'UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING *',
        [id]
    );

    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
    }

    return product;
}
