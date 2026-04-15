import pool from '../database/database.js';

const ROLES = ['owner', 'admin', 'editor', 'viewer'];

class InputError extends Error {}

function requireRole(userRole, minRole) {
    const rank = { owner: 4, admin: 3, editor: 2, viewer: 1 };
    if ((rank[userRole] || 0) < rank[minRole]) {
        const error = new Error('Insufficient permissions');
        error.statusCode = 403;
        throw error;
    }
}

async function getMemberRole(business_id, user_id) {
    const { rows: [member] } = await pool.query(
        'SELECT role FROM business_members WHERE business_id = $1 AND user_id = $2',
        [business_id, user_id]
    );
    return member ? member.role : null;
}

export async function createBusiness(name, bio = null, logo_url = null, requesting_user_id) {
    if (!name) throw new InputError('name is required');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: [business] } = await client.query(
            'INSERT INTO businesses (name, bio, logo_url) VALUES ($1, $2, $3) RETURNING *',
            [name, bio, logo_url]
        );

        await client.query(
            'INSERT INTO business_members (business_id, user_id, role) VALUES ($1, $2, \'owner\')',
            [business.id, requesting_user_id]
        );

        await client.query('COMMIT');
        return business;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getBusinesses() {
    const { rows } = await pool.query(
        `SELECT b.*, COUNT(bm.user_id)::int AS member_count
         FROM businesses b
         LEFT JOIN business_members bm ON bm.business_id = b.id
         WHERE b.is_active = TRUE
         GROUP BY b.id
         ORDER BY b.created_at DESC`
    );
    return rows;
}

export async function getBusiness(id) {
    const { rows: [business] } = await pool.query(
        `SELECT b.*, COUNT(bm.user_id)::int AS member_count
         FROM businesses b
         LEFT JOIN business_members bm ON bm.business_id = b.id
         WHERE b.id = $1 AND b.is_active = TRUE
         GROUP BY b.id`,
        [id]
    );

    if (!business) {
        const error = new Error('Business not found');
        error.statusCode = 404;
        throw error;
    }

    return business;
}

export async function updateBusiness(id, fields, requesting_user_id) {
    const role = await getMemberRole(id, requesting_user_id);
    requireRole(role, 'admin');

    const allowed = ['name', 'bio', 'logo_url'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('No valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [business] } = await pool.query(
        `UPDATE businesses SET ${setClauses}, last_updated = CURRENT_TIMESTAMP
         WHERE id = $${values.length + 1} AND is_active = TRUE RETURNING *`,
        [...values, id]
    );

    if (!business) {
        const error = new Error('Business not found');
        error.statusCode = 404;
        throw error;
    }

    return business;
}

export async function deleteBusiness(id, requesting_user_id) {
    const role = await getMemberRole(id, requesting_user_id);
    requireRole(role, 'owner');

    const { rows: [business] } = await pool.query(
        `UPDATE businesses SET is_active = FALSE, last_updated = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_active = TRUE RETURNING *`,
        [id]
    );

    if (!business) {
        const error = new Error('Business not found');
        error.statusCode = 404;
        throw error;
    }

    await pool.query('UPDATE products SET is_active = FALSE WHERE business_id = $1', [id]);

    return business;
}

// ── Members ──

export async function getMembers(business_id) {
    const { rows: [biz] } = await pool.query(
        'SELECT id FROM businesses WHERE id = $1 AND is_active = TRUE',
        [business_id]
    );
    if (!biz) {
        const error = new Error('Business not found');
        error.statusCode = 404;
        throw error;
    }

    const { rows } = await pool.query(
        `SELECT u.id, u.name, u.logo_url, bm.role, bm.joined_at
         FROM business_members bm
         JOIN users u ON u.id = bm.user_id
         WHERE bm.business_id = $1
         ORDER BY bm.joined_at ASC`,
        [business_id]
    );

    return rows;
}

export async function inviteMember(business_id, user_id, role = 'viewer', requesting_user_id) {
    if (!ROLES.includes(role)) throw new InputError('Invalid role');
    if (role === 'owner') throw new InputError('Cannot assign owner role via invite');

    const requesterRole = await getMemberRole(business_id, requesting_user_id);
    requireRole(requesterRole, 'admin');

    const { rows: [user] } = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND is_active = TRUE',
        [user_id]
    );
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const { rows: [existing] } = await pool.query(
        'SELECT role FROM business_members WHERE business_id = $1 AND user_id = $2',
        [business_id, user_id]
    );
    if (existing) {
        const error = new Error('User is already a member');
        error.statusCode = 409;
        throw error;
    }

    const { rows: [member] } = await pool.query(
        `INSERT INTO business_members (business_id, user_id, role) VALUES ($1, $2, $3)
         RETURNING *`,
        [business_id, user_id, role]
    );

    return member;
}

export async function updateMemberRole(business_id, user_id, role, requesting_user_id) {
    if (!ROLES.includes(role)) throw new InputError('Invalid role');
    if (role === 'owner') throw new InputError('Cannot assign owner role');

    const requesterRole = await getMemberRole(business_id, requesting_user_id);
    requireRole(requesterRole, 'admin');

    const { rows: [member] } = await pool.query(
        `UPDATE business_members SET role = $1
         WHERE business_id = $2 AND user_id = $3 RETURNING *`,
        [role, business_id, user_id]
    );

    if (!member) {
        const error = new Error('Member not found');
        error.statusCode = 404;
        throw error;
    }

    return member;
}

export async function removeMember(business_id, user_id, requesting_user_id) {
    const requesterRole = await getMemberRole(business_id, requesting_user_id);
    requireRole(requesterRole, 'admin');

    const targetRole = await getMemberRole(business_id, user_id);
    if (targetRole === 'owner') {
        const error = new Error('Cannot remove the business owner');
        error.statusCode = 403;
        throw error;
    }

    const { rows: [member] } = await pool.query(
        'DELETE FROM business_members WHERE business_id = $1 AND user_id = $2 RETURNING *',
        [business_id, user_id]
    );

    if (!member) {
        const error = new Error('Member not found');
        error.statusCode = 404;
        throw error;
    }

    return member;
}

// ── Storefront ──

export async function getStorefront(business_id) {
    const { rows: [biz] } = await pool.query(
        'SELECT id FROM businesses WHERE id = $1 AND is_active = TRUE',
        [business_id]
    );
    if (!biz) {
        const error = new Error('Business not found');
        error.statusCode = 404;
        throw error;
    }

    const { rows: [config] } = await pool.query(
        'SELECT * FROM storefront_config WHERE business_id = $1',
        [business_id]
    );

    if (!config) {
        const error = new Error('Storefront not configured');
        error.statusCode = 404;
        throw error;
    }

    return config;
}

export async function upsertStorefront(business_id, fields, requesting_user_id) {
    const role = await getMemberRole(business_id, requesting_user_id);
    requireRole(role, 'editor');

    const allowed = ['primary_color', 'secondary_color', 'accent_color', 'font', 'banner_url', 'layout', 'headline'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('No valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const { rows: [existing] } = await pool.query(
        'SELECT id FROM storefront_config WHERE business_id = $1',
        [business_id]
    );

    if (!existing) {
        const cols = ['business_id', ...updates.map(([k]) => k)].join(', ');
        const vals = [business_id, ...updates.map(([, v]) => v)];
        const params = vals.map((_, i) => `$${i + 1}`).join(', ');

        const { rows: [config] } = await pool.query(
            `INSERT INTO storefront_config (${cols}) VALUES (${params}) RETURNING *`,
            vals
        );
        return config;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [config] } = await pool.query(
        `UPDATE storefront_config SET ${setClauses}, last_updated = CURRENT_TIMESTAMP
         WHERE business_id = $${values.length + 1} RETURNING *`,
        [...values, business_id]
    );

    return config;
}
