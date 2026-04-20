import pool from '../database/database.js';

class InputError extends Error {}

const RANK = { owner: 4, admin: 3, editor: 2, viewer: 1 };

async function getBusinessRole(business_id, user_id) {
    const { rows: [member] } = await pool.query(
        'SELECT role FROM business_members WHERE business_id = $1 AND user_id = $2',
        [business_id, user_id]
    );
    return member ? member.role : null;
}

export async function createVoucher(name, discount, expiry, max_uses, business_id = null, requesting_user_id, isAdmin) {
    if (!name || discount == null)
        throw new InputError('name and discount are required');

    if (!isAdmin) {
        if (!business_id) {
            const error = new Error('Only admins can create global vouchers');
            error.statusCode = 403;
            throw error;
        }
        const role = await getBusinessRole(business_id, requesting_user_id);
        if ((RANK[role] || 0) < RANK['admin']) {
            const error = new Error('You must be an admin or owner of this business to create vouchers');
            error.statusCode = 403;
            throw error;
        }
    }

    const { rows: [existing] } = await pool.query(
        'SELECT id FROM vouchers WHERE LOWER(name) = LOWER($1)',
        [name]
    );
    if (existing) {
        const error = new Error('A voucher with that name already exists');
        error.statusCode = 409;
        throw error;
    }

    const { rows: [voucher] } = await pool.query(
        'INSERT INTO vouchers (name, discount, expiry, max_uses, business_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, discount, expiry, max_uses, business_id]
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

export async function updateVoucher(id, fields, requesting_user_id, isAdmin) {
    const { rows: [voucher] } = await pool.query('SELECT * FROM vouchers WHERE id = $1', [id]);
    if (!voucher) {
        const error = new Error('Voucher not found');
        error.statusCode = 404;
        throw error;
    }

    if (!isAdmin) {
        if (!voucher.business_id) {
            const error = new Error('Only admins can edit global vouchers');
            error.statusCode = 403;
            throw error;
        }
        const role = await getBusinessRole(voucher.business_id, requesting_user_id);
        if ((RANK[role] || 0) < RANK['admin']) {
            const error = new Error('You must be an admin or owner of this business to edit vouchers');
            error.statusCode = 403;
            throw error;
        }
    }

    const allowed = ['name', 'discount', 'expiry', 'max_uses'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('No valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [updated] } = await pool.query(
        `UPDATE vouchers SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
    );

    if (!updated) {
        const error = new Error('Voucher not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    return updated;
}

export async function deleteVoucher(id, requesting_user_id, isAdmin) {
    const { rows: [voucher] } = await pool.query('SELECT * FROM vouchers WHERE id = $1', [id]);
    if (!voucher) {
        const error = new Error('Voucher not found');
        error.statusCode = 404;
        throw error;
    }

    if (!isAdmin) {
        if (!voucher.business_id) {
            const error = new Error('Only admins can delete global vouchers');
            error.statusCode = 403;
            throw error;
        }
        const role = await getBusinessRole(voucher.business_id, requesting_user_id);
        if ((RANK[role] || 0) < RANK['admin']) {
            const error = new Error('You must be an admin or owner of this business to delete vouchers');
            error.statusCode = 403;
            throw error;
        }
    }

    const { rows: [deleted] } = await pool.query(
        'DELETE FROM vouchers WHERE id = $1 RETURNING *',
        [id]
    );

    return deleted;
}
