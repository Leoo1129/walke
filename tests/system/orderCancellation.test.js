import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const BUYER_TOKEN = jwt.sign({ id: 1, name: 'alice', email_verified: true }, 'dev-secret-change-in-production');
const OTHER_TOKEN = jwt.sign({ id: 9, name: 'other', email_verified: true }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Order Cancellation API (system)', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('POST /orders/:id/cancel', () => {
        it('cancels order successfully', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            const cancellation = { id: 1, order_id: 1, buyer_id: 1, reason: null, created_at: new Date() };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({});
            expect(res.status).toBe(201);
            expect(res.body.order_id).toBe(1);
        });

        it('cancels with a reason', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            const cancellation = { id: 2, order_id: 1, buyer_id: 1, reason: 'Changed my mind', created_at: new Date() };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({ reason: 'Changed my mind' });
            expect(res.status).toBe(201);
            expect(res.body.reason).toBe('Changed my mind');
        });

        it('returns UBL OrderCancellation XML', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            const cancellation = { id: 1, order_id: 1, buyer_id: 1, reason: 'No need', created_at: new Date('2026-01-01') };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'alice', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'BobShop', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .set('Accept', 'application/xml')
                .send({ reason: 'No need' });
            expect(res.status).toBe(201);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
            expect(res.text).toContain('<cbc:Note>No need</cbc:Note>');
        });

        it('returns 404 when order not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/orders/999/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({});
            expect(res.status).toBe(404);
        });

        it('returns 403 when requester is not the buyer', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            pool.query.mockResolvedValueOnce({ rows: [order] });
            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${OTHER_TOKEN}`)
                .send({});
            expect(res.status).toBe(403);
        });

        it('returns 400 when order is already cancelled', async () => {
            const order = { id: 1, buyer_id: 1, status: 'cancelled' };
            pool.query.mockResolvedValueOnce({ rows: [order] });
            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({});
            expect(res.status).toBe(400);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).post('/orders/1/cancel').send({});
            expect(res.status).toBe(401);
        });
    });

    describe('GET /orders/:id/cancel', () => {
        it('returns cancellation details as JSON', async () => {
            const cancellation = { id: 1, order_id: 1, buyer_id: 1, reason: 'Regret', created_at: new Date() };
            const order = { id: 1, buyer_id: 1, status: 'cancelled' };
            const items = [];
            const buyer = { id: 1, name: 'alice' };

            pool.query
                .mockResolvedValueOnce({ rows: [{ buyer_id: 1, is_seller: false }] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] });

            const res = await request(app).get('/orders/1/cancel').set('Authorization', `Bearer ${BUYER_TOKEN}`);
            expect(res.status).toBe(200);
            expect(res.body.order_id).toBe(1);
        });

        it('returns 403 to a user who is not part of the order', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ buyer_id: 1, is_seller: false }] });
            const res = await request(app).get('/orders/1/cancel').set('Authorization', `Bearer ${OTHER_TOKEN}`);
            expect(res.status).toBe(403);
        });

        it('returns 404 when no cancellation exists', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ buyer_id: 1, is_seller: false }] })
                .mockResolvedValueOnce({ rows: [] });
            const res = await request(app).get('/orders/1/cancel').set('Authorization', `Bearer ${BUYER_TOKEN}`);
            expect(res.status).toBe(404);
        });
    });
});
