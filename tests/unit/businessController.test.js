import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import {
    createBusiness, getBusiness, getBusinesses, updateBusiness, deleteBusiness,
    getMembers, inviteMember, updateMemberRole, removeMember,
    getStorefront, upsertStorefront
} from '../../src/controllers/businessController.js';
import pool from '../../src/database/database.js';

describe('businessController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('createBusiness', () => {
        it('throws InputError when name is missing', async () => {
            await expect(createBusiness(null, null, null, 1)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws 409 when business name already exists', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });
            await expect(createBusiness('Taken', null, null, 1)).rejects.toMatchObject({ statusCode: 409 });
        });

        it('creates business and assigns creator as owner', async () => {
            const business = { id: 1, name: 'MyBiz', bio: null, logo_url: null };
            pool.query.mockResolvedValueOnce({ rows: [] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [business] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const result = await createBusiness('MyBiz', null, null, 1);
            expect(result).toEqual(business);
            const memberInsert = mockClient.query.mock.calls.find(c => c[0].includes('business_members'));
            expect(memberInsert).toBeDefined();
            expect(memberInsert[0]).toContain('\'owner\'');
        });

        it('rolls back on error', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockRejectedValueOnce(new Error('db error')),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            await expect(createBusiness('Fail', null, null, 1)).rejects.toThrow('db error');
            const calls = mockClient.query.mock.calls.map(c => c[0]);
            expect(calls).toContain('ROLLBACK');
        });
    });

    describe('getBusiness', () => {
        it('returns business when found', async () => {
            const business = { id: 1, name: 'MyBiz', member_count: 3 };
            pool.query.mockResolvedValueOnce({ rows: [business] });

            const result = await getBusiness(1);
            expect(result).toEqual(business);
        });

        it('throws 404 when business does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getBusiness(999)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getBusinesses', () => {
        it('returns all active businesses', async () => {
            const businesses = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
            pool.query.mockResolvedValueOnce({ rows: businesses });

            const result = await getBusinesses();
            expect(result).toEqual(businesses);
        });

        it('filters by member_id when provided', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            await getBusinesses(42);
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('business_members');
            expect(pool.query.mock.calls[0][1]).toContain(42);
        });
    });

    describe('updateBusiness', () => {
        it('throws 403 when non-admin user has insufficient role', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(updateBusiness(1, { name: 'New' }, 99, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 400 when no valid fields provided', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
            await expect(updateBusiness(1, { invalid: 'x' }, 1, false)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('updates business name for admin member', async () => {
            const updated = { id: 1, name: 'New Name' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [updated] });

            const result = await updateBusiness(1, { name: 'New Name' }, 1, false);
            expect(result.name).toBe('New Name');
        });

        it('allows platform admin to update any business', async () => {
            const updated = { id: 1, name: 'Admin Update' };
            pool.query.mockResolvedValueOnce({ rows: [updated] });

            const result = await updateBusiness(1, { name: 'Admin Update' }, 99, true);
            expect(result.name).toBe('Admin Update');
        });
    });

    describe('deleteBusiness', () => {
        it('throws 403 when non-admin user has insufficient role (not owner)', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
            await expect(deleteBusiness(1, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('soft-deletes business and its products', async () => {
            const business = { id: 1, name: 'MyBiz', is_active: false };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'owner' }] })
                .mockResolvedValueOnce({ rows: [business] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await deleteBusiness(1, 1, false);
            expect(result).toEqual(business);
            const productUpdate = pool.query.mock.calls.find(c => c[0].includes('UPDATE products SET is_active'));
            expect(productUpdate).toBeDefined();
        });
    });

    describe('getMembers', () => {
        it('throws 404 when business does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getMembers(999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('returns all members with roles', async () => {
            const members = [{ id: 1, name: 'Alice', role: 'owner' }];
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: members });

            const result = await getMembers(1);
            expect(result).toEqual(members);
        });
    });

    describe('inviteMember', () => {
        it('throws InputError for invalid role', async () => {
            await expect(inviteMember(1, 2, 'superuser', 1, false)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when trying to assign owner role', async () => {
            await expect(inviteMember(1, 2, 'owner', 1, false)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws 403 when requester has insufficient role', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'viewer' }] });
            await expect(inviteMember(1, 2, 'viewer', 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 404 when user to invite does not exist', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [] });
            await expect(inviteMember(1, 999, 'viewer', 1, false)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 409 when user is already a member', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [{ id: 2 }] })
                .mockResolvedValueOnce({ rows: [{ role: 'viewer' }] });
            await expect(inviteMember(1, 2, 'editor', 1, false)).rejects.toMatchObject({ statusCode: 409 });
        });

        it('invites member with given role', async () => {
            const member = { business_id: 1, user_id: 2, role: 'editor' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [{ id: 2 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [member] });

            const result = await inviteMember(1, 2, 'editor', 1, false);
            expect(result).toEqual(member);
        });
    });

    describe('updateMemberRole', () => {
        it('throws InputError for invalid role', async () => {
            await expect(updateMemberRole(1, 2, 'hacker', 1, false)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws 404 when member not found', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [] });
            await expect(updateMemberRole(1, 999, 'viewer', 1, false)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('updates member role', async () => {
            const member = { business_id: 1, user_id: 2, role: 'admin' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'owner' }] })
                .mockResolvedValueOnce({ rows: [member] });

            const result = await updateMemberRole(1, 2, 'admin', 1, false);
            expect(result.role).toBe('admin');
        });
    });

    describe('removeMember', () => {
        it('throws 403 when trying to remove owner', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [{ role: 'owner' }] });
            await expect(removeMember(1, 2, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 404 when member not found', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [{ role: 'editor' }] })
                .mockResolvedValueOnce({ rows: [] });
            await expect(removeMember(1, 2, 1, false)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('removes member successfully', async () => {
            const member = { business_id: 1, user_id: 2, role: 'editor' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [{ role: 'editor' }] })
                .mockResolvedValueOnce({ rows: [member] });

            const result = await removeMember(1, 2, 1, false);
            expect(result).toEqual(member);
        });
    });

    describe('getStorefront', () => {
        it('throws 404 when business does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getStorefront(999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 404 when storefront not configured', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [] });
            await expect(getStorefront(1)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('returns storefront config', async () => {
            const config = { id: 1, business_id: 1, primary_color: '#111' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [config] });

            const result = await getStorefront(1);
            expect(result).toEqual(config);
        });
    });

    describe('upsertStorefront', () => {
        it('throws 403 when user has insufficient role', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'viewer' }] });
            await expect(upsertStorefront(1, { primary_color: '#fff' }, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 400 when no valid fields provided', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'editor' }] });
            await expect(upsertStorefront(1, { invalid: 'x' }, 1, false)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('inserts new storefront config when none exists', async () => {
            const config = { id: 1, business_id: 1, primary_color: '#111' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'editor' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [config] });

            const result = await upsertStorefront(1, { primary_color: '#111' }, 1, false);
            expect(result).toEqual(config);
        });

        it('updates existing storefront config', async () => {
            const config = { id: 1, business_id: 1, primary_color: '#222' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'editor' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [config] });

            const result = await upsertStorefront(1, { primary_color: '#222' }, 1, false);
            expect(result.primary_color).toBe('#222');
        });
    });
});
