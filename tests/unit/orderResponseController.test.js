import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { createOrderResponse, getOrderResponseDetails, getAllSellerResponses } from '../../src/controllers/orderResponseController.js';
import pool from '../../src/database/database.js';

describe('orderResponseController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('createOrderResponse', () => {
        it('throws 404 when order does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(createOrderResponse(999, 5, 'AB')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 400 when response_code is missing', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            await expect(createOrderResponse(1, 5, null)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 when response_code is invalid', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            await expect(createOrderResponse(1, 5, 'XX')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 403 when seller has no items in this order', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [] });
            await expect(createOrderResponse(1, 5, 'AB')).rejects.toMatchObject({ statusCode: 403 });
        });

        it('creates AB response and updates order status to confirmed when all sellers responded', async () => {
            const order = { id: 1, buyer_id: 1 };
            const sellerItems = [{ product_id: 2 }];
            const response = { id: 10, order_id: 1, seller_id: 5, response_code: 'AB' };
            const allSellers = [{ seller_id: 5 }];
            const latestResponses = [{ seller_id: 5, response_code: 'AB' }];

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: sellerItems });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [response] })
                    .mockResolvedValueOnce({ rows: allSellers })
                    .mockResolvedValueOnce({ rows: latestResponses })
                    .mockResolvedValueOnce({ rows: [{ n: '1' }] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const result = await createOrderResponse(1, 5, 'AB');
            expect(result).toEqual(response);
            const calls = mockClient.query.mock.calls.map(c => c[0]);
            const statusUpdate = calls.find(q => typeof q === 'string' && q.includes('UPDATE orders SET status'));
            expect(statusUpdate).toBeDefined();
        });

        it('creates IP response and opens a chat', async () => {
            const order = { id: 1, buyer_id: 1 };
            const sellerItems = [{ product_id: 2 }];
            const response = { id: 11, order_id: 1, seller_id: 5, response_code: 'IP' };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: sellerItems });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [response] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const result = await createOrderResponse(1, 5, 'IP');
            expect(result).toEqual(response);
            const calls = mockClient.query.mock.calls.map(c => c[0]);
            const chatInsert = calls.find(q => typeof q === 'string' && q.includes('order_chats'));
            expect(chatInsert).toBeDefined();
        });

        it('rolls back transaction on error', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [{ product_id: 2 }] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockRejectedValueOnce(new Error('db error')),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            await expect(createOrderResponse(1, 5, 'AB')).rejects.toThrow('db error');
            const calls = mockClient.query.mock.calls.map(c => c[0]);
            expect(calls).toContain('ROLLBACK');
        });
    });

    describe('getOrderResponseDetails', () => {
        it('throws 404 when no response exists for the order', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getOrderResponseDetails(999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('returns response, order, items, buyer, and seller', async () => {
            const response = { id: 10, order_id: 1, seller_id: 5, response_code: 'AB' };
            const order = { id: 1, buyer_id: 1, status: 'confirmed' };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'Alice' };
            const seller = { id: 5, name: 'BobShop' };

            pool.query
                .mockResolvedValueOnce({ rows: [response] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const result = await getOrderResponseDetails(1);
            expect(result.response).toEqual(response);
            expect(result.order).toEqual(order);
            expect(result.items).toEqual(items);
            expect(result.buyer).toEqual(buyer);
            expect(result.seller).toEqual(seller);
        });
    });

    describe('getAllSellerResponses', () => {
        it('returns all seller responses for an order', async () => {
            const responses = [
                { id: 1, seller_id: 5, response_code: 'AB', seller_name: 'BobShop' },
                { id: 2, seller_id: 6, response_code: 'RE', seller_name: 'CarlCo' },
            ];
            pool.query.mockResolvedValueOnce({ rows: responses });

            const result = await getAllSellerResponses(1);
            expect(result).toEqual(responses);
            expect(pool.query.mock.calls[0][1]).toEqual([1]);
        });

        it('returns empty array when no responses exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const result = await getAllSellerResponses(1);
            expect(result).toEqual([]);
        });
    });
});
