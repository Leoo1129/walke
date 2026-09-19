import pool from '../database/database.js';
import { HttpError, InputError } from '../utils/errors.js';

const ROLES = ['owner', 'admin', 'editor', 'viewer'];

// ABN checksum weights per the Australian Business Register specification
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

function isValidABNChecksum(abn) {
    const digits = abn.split('').map(Number);
    digits[0] -= 1;
    return digits.reduce((sum, d, i) => sum + d * ABN_WEIGHTS[i], 0) % 89 === 0;
}

export async function lookupABN(abn) {
    const cleaned = abn.replace(/[\s-]/g, '');
    if (!/^\d{11}$/.test(cleaned)) throw new InputError('ABN must be 11 digits');
    if (!isValidABNChecksum(cleaned)) throw new InputError('Invalid ABN');

    const guid = process.env.ABN_LOOKUP_GUID;
    if (!guid) return { abn: cleaned, entity_name: null, abn_status: 'unverified' };

    let res;
    try {
        res = await fetch(
            `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleaned}&callback=cb&guid=${guid}`
        );
    } catch {
        throw new Error('ABN Lookup service unavailable');
    }
    if (!res.ok) throw new Error('ABN Lookup service unavailable');

    const text = await res.text();
    const data = JSON.parse(text.replace(/^cb\(/, '').replace(/\)$/, ''));

    if (data.Message) throw new InputError(`ABN lookup failed: ${data.Message}`);
    if (data.AbnStatus !== 'Active') throw new InputError(`ABN is not active (status: ${data.AbnStatus})`);

    return { abn: cleaned, entity_name: data.EntityName, abn_status: 'active' };
}

function requireRole(userRole, minRole) {
    const rank = { owner: 4, admin: 3, editor: 2, viewer: 1 };
    if ((rank[userRole] || 0) < rank[minRole]) {
        throw new HttpError(403, 'Insufficient permissions');
    }
}

async function getMemberRole(business_id, user_id) {
    const { rows: [member] } = await pool.query(
        'SELECT role FROM business_members WHERE business_id = $1 AND user_id = $2',
        [business_id, user_id]
    );
    return member ? member.role : null;
}

// Throws 403 unless the user holds at least minRole in the business.
export async function assertBusinessRole(business_id, user_id, minRole) {
    requireRole(await getMemberRole(business_id, user_id), minRole);
}

export async function createBusiness(name, bio = null, logo_url = null, requesting_user_id, abn = null) {
    if (!name) throw new InputError('name is required');

    let abnInfo = null;
    if (abn) abnInfo = await lookupABN(abn);

    const { rows: [existing] } = await pool.query(
        'SELECT id FROM businesses WHERE LOWER(name) = LOWER($1) AND is_active = TRUE',
        [name]
    );
    if (existing) {
        throw new HttpError(409, 'A business with that name already exists');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: [business] } = await client.query(
            'INSERT INTO businesses (name, bio, logo_url, abn) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, bio, logo_url, abnInfo ? abnInfo.abn : null]
        );

        await client.query(
            'INSERT INTO business_members (business_id, user_id, role) VALUES ($1, $2, \'owner\')',
            [business.id, requesting_user_id]
        );

        await client.query('COMMIT');
        return { ...business, ...(abnInfo ? { abn_entity_name: abnInfo.entity_name, abn_status: abnInfo.abn_status } : {}) };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getBusinesses(user_id = null) {
    let query = `SELECT b.*, COUNT(bm.user_id)::int AS member_count
         FROM businesses b
         LEFT JOIN business_members bm ON bm.business_id = b.id
         WHERE b.is_active = TRUE`;
    const params = [];
    if (user_id) {
        params.push(user_id);
        query += ` AND EXISTS (SELECT 1 FROM business_members WHERE business_id = b.id AND user_id = $${params.length})`;
    }
    query += ' GROUP BY b.id ORDER BY b.created_at DESC';
    const { rows } = await pool.query(query, params);
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
        throw new HttpError(404, 'Business not found');
    }

    return business;
}

export async function updateBusiness(id, fields, requesting_user_id, isAdmin = false) {
    if (!isAdmin) {
        const role = await getMemberRole(id, requesting_user_id);
        requireRole(role, 'admin');
    }

    if (fields.abn) {
        const abnInfo = await lookupABN(fields.abn);
        fields = { ...fields, abn: abnInfo.abn };
    }

    const allowed = ['name', 'bio', 'logo_url', 'abn'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        throw new HttpError(400, 'No valid fields to update');
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [business] } = await pool.query(
        `UPDATE businesses SET ${setClauses}, last_updated = CURRENT_TIMESTAMP
         WHERE id = $${values.length + 1} AND is_active = TRUE RETURNING *`,
        [...values, id]
    );

    if (!business) {
        throw new HttpError(404, 'Business not found');
    }

    return business;
}

export async function deleteBusiness(id, requesting_user_id, isAdmin = false) {
    if (!isAdmin) {
        const role = await getMemberRole(id, requesting_user_id);
        requireRole(role, 'owner');
    }

    const { rows: [business] } = await pool.query(
        `UPDATE businesses SET is_active = FALSE, last_updated = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_active = TRUE RETURNING *`,
        [id]
    );

    if (!business) {
        throw new HttpError(404, 'Business not found');
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
        throw new HttpError(404, 'Business not found');
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

export async function inviteMember(business_id, user_id, role = 'viewer', requesting_user_id, isAdmin = false) {
    if (!ROLES.includes(role)) throw new InputError('Invalid role');
    if (!isAdmin && role === 'owner') throw new InputError('Cannot assign owner role via invite');

    if (!isAdmin) {
        const requesterRole = await getMemberRole(business_id, requesting_user_id);
        requireRole(requesterRole, 'admin');
    }

    const { rows: [user] } = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND is_active = TRUE',
        [user_id]
    );
    if (!user) {
        throw new HttpError(404, 'User not found');
    }

    const { rows: [existing] } = await pool.query(
        'SELECT role FROM business_members WHERE business_id = $1 AND user_id = $2',
        [business_id, user_id]
    );
    if (existing) {
        throw new HttpError(409, 'User is already a member');
    }

    const { rows: [member] } = await pool.query(
        `INSERT INTO business_members (business_id, user_id, role) VALUES ($1, $2, $3)
         RETURNING *`,
        [business_id, user_id, role]
    );

    return member;
}

export async function updateMemberRole(business_id, user_id, role, requesting_user_id, isAdmin = false) {
    if (!ROLES.includes(role)) throw new InputError('Invalid role');
    if (!isAdmin && role === 'owner') throw new InputError('Cannot assign owner role');

    if (!isAdmin) {
        const requesterRole = await getMemberRole(business_id, requesting_user_id);
        requireRole(requesterRole, 'admin');
    }

    const { rows: [member] } = await pool.query(
        `UPDATE business_members SET role = $1
         WHERE business_id = $2 AND user_id = $3 RETURNING *`,
        [role, business_id, user_id]
    );

    if (!member) {
        throw new HttpError(404, 'Member not found');
    }

    return member;
}

export async function removeMember(business_id, user_id, requesting_user_id, isAdmin = false) {
    if (!isAdmin) {
        const requesterRole = await getMemberRole(business_id, requesting_user_id);
        requireRole(requesterRole, 'admin');

        const targetRole = await getMemberRole(business_id, user_id);
        if (targetRole === 'owner') {
            throw new HttpError(403, 'Cannot remove the business owner');
        }
    }

    const { rows: [member] } = await pool.query(
        'DELETE FROM business_members WHERE business_id = $1 AND user_id = $2 RETURNING *',
        [business_id, user_id]
    );

    if (!member) {
        throw new HttpError(404, 'Member not found');
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
        throw new HttpError(404, 'Business not found');
    }

    const { rows: [config] } = await pool.query(
        'SELECT * FROM storefront_config WHERE business_id = $1',
        [business_id]
    );

    if (!config) {
        throw new HttpError(404, 'Storefront not configured');
    }

    return config;
}

export async function upsertStorefront(business_id, fields, requesting_user_id, isAdmin = false) {
    if (!isAdmin) {
        const role = await getMemberRole(business_id, requesting_user_id);
        requireRole(role, 'editor');
    }

    const allowed = [
        'primary_color', 'secondary_color', 'accent_color', 'text_color',
        'font', 'banner_url', 'layout', 'headline', 'subheadline',
        'hero_align', 'hero_height', 'overlay_opacity',
        'button_style', 'card_style', 'product_columns',
        'announcement', 'announcement_bg', 'show_bio',
        'social_instagram', 'social_twitter', 'social_website',
    ];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        throw new HttpError(400, 'No valid fields to update');
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
