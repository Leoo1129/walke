import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { createOrderCancellation, getOrderCancellationDetails } from '../../src/controllers/orderCancellationController.js';
import pool from '../../src/database/database.js';

describe('orderCancellationController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('createOrderCancellation', () => {
        it('throws 404 when order does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(createOrderCancellation(999, 1)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 403 when requester is not the buyer', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            pool.query.mockResolvedValueOnce({ rows: [order] });
            await expect(createOrderCancellation(1, 99)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 400 when order is already cancelled', async () => {
            const order = { id: 1, buyer_id: 1, status: 'cancelled' };
            pool.query.mockResolvedValueOnce({ rows: [order] });
            await expect(createOrderCancellation(1, 1)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('creates cancellation record and updates order status', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            const cancellation = { id: 5, order_id: 1, buyer_id: 1, reason: null };
            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await createOrderCancellation(1, 1);
            expect(result).toEqual(cancellation);
            expect(pool.query).toHaveBeenCalledTimes(3);
            const updateCall = pool.query.mock.calls[2];
            expect(updateCall[0]).toContain('UPDATE orders SET status');
            expect(updateCall[1]).toContain('cancelled');
        });

        it('stores reason when provided', async () => {
            const order = { id: 1, buyer_id: 1, status: 'confirmed' };
            const cancellation = { id: 6, order_id: 1, buyer_id: 1, reason: 'No longer needed' };
            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await createOrderCancellation(1, 1, 'No longer needed');
            expect(pool.query.mock.calls[1][1]).toContain('No longer needed');
            expect(result.reason).toBe('No longer needed');
        });
    });

    describe('getOrderCancellationDetails', () => {
        it('throws 404 when no cancellation exists for the order', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getOrderCancellationDetails(999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('returns full cancellation details including order, items, buyer, and sellers', async () => {
            const cancellation = { id: 5, order_id: 1, buyer_id: 1, reason: 'Changed mind' };
            const order = { id: 1, buyer_id: 1, status: 'cancelled', total_price: 29.97 };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'Alice', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'BobShop', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const result = await getOrderCancellationDetails(1);
            expect(result.cancellation).toEqual(cancellation);
            expect(result.order).toEqual(order);
            expect(result.items).toEqual(items);
            expect(result.buyer).toEqual(buyer);
            expect(result.sellers).toEqual([seller]);
        });

        it('returns empty sellers array when order has no items with sellers', async () => {
            const cancellation = { id: 5, order_id: 1, buyer_id: 1, reason: null };
            const order = { id: 1, buyer_id: 1, status: 'cancelled', total_price: 0 };
            const buyer = { id: 1, name: 'Alice' };

            pool.query
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [buyer] });

            const result = await getOrderCancellationDetails(1);
            expect(result.sellers).toEqual([]);
        });

        it('propagates database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('db error'));
            await expect(getOrderCancellationDetails(1)).rejects.toThrow('db error');
        });
    });
});
