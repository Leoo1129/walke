import pool from '../database/database.js';
import { HttpError, InputError } from '../utils/errors.js';

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
            throw new HttpError(403, 'Only admins can create global vouchers');
        }
        const role = await getBusinessRole(business_id, requesting_user_id);
        if ((RANK[role] || 0) < RANK['admin']) {
            throw new HttpError(403, 'You must be an admin or owner of this business to create vouchers');
        }
    }

    const { rows: [existing] } = await pool.query(
        'SELECT id FROM vouchers WHERE LOWER(name) = LOWER($1)',
        [name]
    );
    if (existing) {
        throw new HttpError(409, 'A voucher with that name already exists');
    }

    const { rows: [voucher] } = await pool.query(
        'INSERT INTO vouchers (name, discount, expiry, max_uses, business_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, discount, expiry, max_uses, business_id]
    );

    if (!voucher) {
        throw new HttpError(500, 'Failed to create voucher');
    }

    return voucher;
}

export async function getVouchers() {
    const { rows } = await pool.query('SELECT * FROM vouchers');

    if (!rows || rows.length === 0) {
        throw new HttpError(404, 'No vouchers found');
    }

    return rows;
}

export async function getVoucher(id) {
    const { rows: [voucher] } = await pool.query(
        'SELECT * FROM vouchers WHERE id = $1',
        [id]
    );

    if (!voucher) {
        throw new HttpError(404, 'Voucher not found');
    }

    return voucher;
}

export async function updateVoucher(id, fields, requesting_user_id, isAdmin) {
    const { rows: [voucher] } = await pool.query('SELECT * FROM vouchers WHERE id = $1', [id]);
    if (!voucher) {
        throw new HttpError(404, 'Voucher not found');
    }

    if (!isAdmin) {
        if (!voucher.business_id) {
            throw new HttpError(403, 'Only admins can edit global vouchers');
        }
        const role = await getBusinessRole(voucher.business_id, requesting_user_id);
        if ((RANK[role] || 0) < RANK['admin']) {
            throw new HttpError(403, 'You must be an admin or owner of this business to edit vouchers');
        }
    }

    const allowed = ['name', 'discount', 'expiry', 'max_uses'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        throw new HttpError(400, 'No valid fields to update');
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [updated] } = await pool.query(
        `UPDATE vouchers SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
    );

    if (!updated) {
        throw new HttpError(400, 'Voucher not found or no valid fields to update');
    }

    return updated;
}

export async function deleteVoucher(id, requesting_user_id, isAdmin) {
    const { rows: [voucher] } = await pool.query('SELECT * FROM vouchers WHERE id = $1', [id]);
    if (!voucher) {
        throw new HttpError(404, 'Voucher not found');
    }

    if (!isAdmin) {
        if (!voucher.business_id) {
            throw new HttpError(403, 'Only admins can delete global vouchers');
        }
        const role = await getBusinessRole(voucher.business_id, requesting_user_id);
        if ((RANK[role] || 0) < RANK['admin']) {
            throw new HttpError(403, 'You must be an admin or owner of this business to delete vouchers');
        }
    }

    const { rows: [deleted] } = await pool.query(
        'DELETE FROM vouchers WHERE id = $1 RETURNING *',
        [id]
    );

    return deleted;
}
