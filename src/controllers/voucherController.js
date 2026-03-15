import pool from '../database/database.js';

class InputError extends Error {}

export async function createVoucher(name, discount, expiry, max_uses) {
    if (!name || discount == null)
        throw new InputError('name and discount are required');

    const { rows: [voucher] } = await pool.query(
        'INSERT INTO vouchers (name, discount, expiry, max_uses) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, discount, expiry, max_uses]
    );

    if (!voucher) {
        const error = new Error('Failed to create voucher');
        error.statusCode = 500;
        throw error;
    }

    return voucher;
}

export async function getVouchers() {
    const { rows } = await pool.query('SELECT * FROM vouchers');

    if (!rows || rows.length === 0) {
        const error = new Error('No vouchers found');
        error.statusCode = 404;
        throw error;
    }

    return rows;
}

export async function getVoucher(id) {
    const { rows: [voucher] } = await pool.query(
        'SELECT * FROM vouchers WHERE id = $1',
        [id]
    );

    if (!voucher) {
        const error = new Error('Voucher not found');
        error.statusCode = 404;
        throw error;
    }

    return voucher;
}

export async function updateVoucher(id, fields) {
    const allowed = ['name', 'discount', 'expiry', 'max_uses'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('Voucher not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [voucher] } = await pool.query(
        `UPDATE vouchers SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
    );

    if (!voucher) {
        const error = new Error('Voucher not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    return voucher;
}

export async function deleteVoucher(id) {
    const { rows: [voucher] } = await pool.query(
        'DELETE FROM vouchers WHERE id = $1 RETURNING *',
        [id]
    );

    if (!voucher) {
        const error = new Error('Voucher not found');
        error.statusCode = 404;
        throw error;
    }

    return voucher;
}
