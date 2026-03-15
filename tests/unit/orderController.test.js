import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/database/database.js', () => ({
    default: {
        query: vi.fn(),
        connect: vi.fn()
    }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Orders API (Black Box)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /orders', () => {

        it('creates an order successfully', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null };

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)                  // BEGIN
                    .mockResolvedValueOnce({ rows: [order] })          // INSERT orders
                    .mockResolvedValueOnce(undefined)                  // INSERT order_items
                    .mockResolvedValueOnce(undefined),                 // COMMIT
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .send({
                    buyer_id: 1,
                    items: [{ product_id: 2, quantity: 3 }],
                    total_price: 19.99
                });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(order);
        });

        it('returns 500 on database failure', async () => {

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)                  // BEGIN
                    .mockRejectedValueOnce(new Error('db error')),     // INSERT orders fails
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .send({
                    buyer_id: 1,
                    items: [{ product_id: 2, quantity: 3 }],
                    total_price: 19.99
                });

            expect(res.status).toBe(500);
        });

    });

    describe('GET /orders', () => {

        it('returns all orders', async () => {

            const orders = [
                { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null },
                { id: 2, buyer_id: 2, status: 'completed', total_price: 9.99, voucher_id: null }
            ];

            pool.query.mockResolvedValue({ rows: orders });

            const res = await request(app).get('/orders');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(orders);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/orders');

            expect(res.status).toBe(500);
        });

    });

    describe('GET /orders/:id', () => {

        it('returns an order when it exists', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null };

            pool.query.mockResolvedValue({ rows: [order] });

            const res = await request(app).get('/orders/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(order);
        });

        it('returns 404 when order does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).get('/orders/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/orders/1');

            expect(res.status).toBe(500);
        });

    });

    describe('PATCH /orders/:id', () => {

        it('updates an order successfully', async () => {

            const updated = { id: 1, buyer_id: 1, status: 'completed', total_price: 19.99, voucher_id: null };

            pool.query.mockResolvedValue({ rows: [updated] });

            const res = await request(app)
                .patch('/orders/1')
                .send({ status: 'completed' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(updated);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .patch('/orders/1')
                .send({ status: 'completed' });

            expect(res.status).toBe(500);
        });

    });

    describe('DELETE /orders/:id', () => {

        it('deletes an order successfully', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null };

            pool.query.mockResolvedValue({ rows: [order] });

            const res = await request(app).delete('/orders/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(order);
        });

        it('returns 404 if order does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).delete('/orders/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).delete('/orders/1');

            expect(res.status).toBe(500);
        });

    });

});
