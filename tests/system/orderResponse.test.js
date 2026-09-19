import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const SELLER_TOKEN = jwt.sign({ id: 5, name: 'BobShop', email_verified: true }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Order Response API (system)', () => {
    beforeEach(() => vi.resetAllMocks());

    describe('POST /orders/:id/response', () => {
        it('creates AB response', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            const sellerItems = [{ product_id: 2 }];
            const response = { id: 1, order_id: 1, seller_id: 5, response_code: 'AB', created_at: new Date() };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: sellerItems })
                .mockResolvedValueOnce({ rows: [response] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'alice' }] })
                .mockResolvedValueOnce({ rows: [{ id: 5, name: 'BobShop' }] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [response] })
                    .mockResolvedValueOnce({ rows: [{ seller_id: 5 }] })
                    .mockResolvedValueOnce({ rows: [{ seller_id: 5, response_code: 'AB' }] })
                    .mockResolvedValueOnce({ rows: [{ n: '0' }] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${SELLER_TOKEN}`)
                .send({ response_code: 'AB' });
            expect(res.status).toBe(201);
            expect(res.body.response_code).toBe('AB');
        });

        it('returns 400 when response_code is invalid', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${SELLER_TOKEN}`)
                .send({ response_code: 'XX' });
            expect(res.status).toBe(400);
        });

        it('returns 404 when order not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/orders/999/response')
                .set('Authorization', `Bearer ${SELLER_TOKEN}`)
                .send({ response_code: 'AB' });
            expect(res.status).toBe(404);
        });

        it('returns 403 when seller has no items in order', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${SELLER_TOKEN}`)
                .send({ response_code: 'AB' });
            expect(res.status).toBe(403);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).post('/orders/1/response').send({ response_code: 'AB' });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /orders/:id/response', () => {
        it('returns response as JSON', async () => {
            const response = { id: 1, order_id: 1, seller_id: 5, response_code: 'AB', created_at: new Date() };
            const order = { id: 1, buyer_id: 1, status: 'confirmed' };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'alice' };
            const seller = { id: 5, name: 'BobShop' };

            pool.query
                .mockResolvedValueOnce({ rows: [{ buyer_id: 1, is_seller: true }] })
                .mockResolvedValueOnce({ rows: [response] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app).get('/orders/1/response').set('Authorization', `Bearer ${SELLER_TOKEN}`);
            expect(res.status).toBe(200);
            expect(res.body.response_code).toBe('AB');
        });

        it('returns UBL OrderResponse XML', async () => {
            const response = { id: 1, order_id: 1, seller_id: 5, response_code: 'RE', note: null, created_at: new Date('2026-01-01') };
            const order = { id: 1, buyer_id: 1, status: 'rejected' };
            const items = [];
            const buyer = { id: 1, name: 'alice', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'BobShop', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [{ buyer_id: 1, is_seller: true }] })
                .mockResolvedValueOnce({ rows: [response] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app).get('/orders/1/response').set('Authorization', `Bearer ${SELLER_TOKEN}`).set('Accept', 'application/xml');
            expect(res.status).toBe(200);
            expect(res.text).toContain('<cbc:OrderCommunicationTypeCode>RE</cbc:OrderCommunicationTypeCode>');
        });

        it('returns 404 when no response exists', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ buyer_id: 1, is_seller: true }] })
                .mockResolvedValueOnce({ rows: [] });
            const res = await request(app).get('/orders/1/response').set('Authorization', `Bearer ${SELLER_TOKEN}`);
            expect(res.status).toBe(404);
        });
    });
});
