import pool from '../database/database.js';

export async function createProduct(name, price, sellerId, tags = []) {
    const { rows: [product] } = await pool.query(
        'INSERT INTO products (name, price, seller_id, tags) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, price, sellerId, tags]
    );
    return product;
}

export async function getProducts() {
    const { rows } = await pool.query('SELECT * FROM products');
    return rows;
}

export async function getProductById(id) {
    const { rows: [product] } = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
    );
    return product || null;
}

export async function updateProduct(id, fields) {
    const allowed = ['name', 'price', 'tags'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (updates.length === 0) return null;

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [product] } = await pool.query(
        `UPDATE products SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
    );
    return product || null;
}

export async function deleteProduct(id) {
    const { rows: [product] } = await pool.query(
        'DELETE FROM products WHERE id = $1 RETURNING *',
        [id]
    );
    return product || null;
}
