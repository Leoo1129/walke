import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { createVoucher, getVouchers, getVoucher, updateVoucher, deleteVoucher } from '../../src/controllers/voucherController.js';
import pool from '../../src/database/database.js';

describe('voucherController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('createVoucher', () => {
        it('throws InputError when name is missing', async () => {
            await expect(createVoucher(null, 10, null, null, null, 1, true))
                .rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when discount is missing', async () => {
            await expect(createVoucher('SALE', null, null, null, null, 1, true))
                .rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws 403 when non-admin tries to create global voucher (no business_id)', async () => {
            await expect(createVoucher('SALE', 10, null, null, null, 1, false))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 403 when non-admin has insufficient business role', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'viewer' }] });
            await expect(createVoucher('SALE', 10, null, null, 5, 1, false))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 409 when voucher name already exists', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [{ id: 99 }] });
            await expect(createVoucher('SALE', 10, null, null, 5, 1, false))
                .rejects.toMatchObject({ statusCode: 409 });
        });

        it('allows admin to create global voucher', async () => {
            const voucher = { id: 1, name: 'GLOBAL', discount: 0.2, business_id: null };
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [voucher] });

            const result = await createVoucher('GLOBAL', 0.2, null, null, null, 1, true);
            expect(result).toEqual(voucher);
        });

        it('creates business voucher when user has admin role in business', async () => {
            const voucher = { id: 2, name: 'BIZ20', discount: 0.2, business_id: 5 };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [voucher] });

            const result = await createVoucher('BIZ20', 0.2, null, null, 5, 1, false);
            expect(result).toEqual(voucher);
        });

        it('creates business voucher when user is owner of business', async () => {
            const voucher = { id: 3, name: 'OWNVOUCHER', discount: 10, business_id: 5 };
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'owner' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [voucher] });

            const result = await createVoucher('OWNVOUCHER', 10, null, null, 5, 1, false);
            expect(result).toEqual(voucher);
        });
    });

    describe('getVouchers', () => {
        it('returns all vouchers', async () => {
            const vouchers = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
            pool.query.mockResolvedValueOnce({ rows: vouchers });

            const result = await getVouchers();
            expect(result).toEqual(vouchers);
        });

        it('throws 404 when no vouchers exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getVouchers()).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getVoucher', () => {
        it('returns the voucher when found', async () => {
            const voucher = { id: 1, name: 'SALE', discount: 10 };
            pool.query.mockResolvedValueOnce({ rows: [voucher] });

            const result = await getVoucher(1);
            expect(result).toEqual(voucher);
        });

        it('throws 404 when voucher does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getVoucher(999)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('updateVoucher', () => {
        it('throws 404 when voucher does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(updateVoucher(999, { name: 'NEW' }, 1, true)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 403 when non-admin tries to edit global voucher', async () => {
            const voucher = { id: 1, name: 'GLOBAL', discount: 10, business_id: null };
            pool.query.mockResolvedValueOnce({ rows: [voucher] });
            await expect(updateVoucher(1, { name: 'NEW' }, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 400 when no valid fields provided', async () => {
            const voucher = { id: 1, name: 'BIZ', discount: 10, business_id: 5 };
            pool.query
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
            await expect(updateVoucher(1, { invalid: 'x' }, 1, false)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('updates voucher fields for admin', async () => {
            const existing = { id: 1, name: 'SALE', discount: 10, business_id: null };
            const updated = { id: 1, name: 'NEW', discount: 20, business_id: null };
            pool.query
                .mockResolvedValueOnce({ rows: [existing] })
                .mockResolvedValueOnce({ rows: [updated] });

            const result = await updateVoucher(1, { name: 'NEW', discount: 20 }, 1, true);
            expect(result.name).toBe('NEW');
        });
    });

    describe('deleteVoucher', () => {
        it('throws 404 when voucher does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(deleteVoucher(999, 1, true)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 403 when non-admin tries to delete global voucher', async () => {
            const voucher = { id: 1, name: 'GLOBAL', business_id: null };
            pool.query.mockResolvedValueOnce({ rows: [voucher] });
            await expect(deleteVoucher(1, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 403 when non-admin has insufficient business role', async () => {
            const voucher = { id: 1, name: 'BIZ', business_id: 5 };
            pool.query
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [{ role: 'editor' }] });
            await expect(deleteVoucher(1, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('deletes and returns voucher for admin', async () => {
            const voucher = { id: 1, name: 'SALE', discount: 10, business_id: null };
            pool.query
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [voucher] });

            const result = await deleteVoucher(1, 1, true);
            expect(result).toEqual(voucher);
        });

        it('deletes business voucher when user is owner', async () => {
            const voucher = { id: 2, name: 'BIZ', discount: 5, business_id: 5 };
            pool.query
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [{ role: 'owner' }] })
                .mockResolvedValueOnce({ rows: [voucher] });

            const result = await deleteVoucher(2, 1, false);
            expect(result).toEqual(voucher);
        });
    });
});
