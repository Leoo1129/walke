import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const VERIFIED_TOKEN = jwt.sign({ id: 1, name: 'alice', email_verified: true }, 'dev-secret-change-in-production');
const ADMIN_TOKEN = jwt.sign({ id: 1, name: 'alice', is_admin: true, email_verified: true }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

const { mockPaymentIntents: sysPaymentIntents, MockStripe: SysMockStripe } = vi.hoisted(() => {
    const mockPaymentIntents = { create: vi.fn(), retrieve: vi.fn() };
    function MockStripe() { return { paymentIntents: mockPaymentIntents }; }
    return { mockPaymentIntents, MockStripe };
});

vi.mock('stripe', () => ({ default: SysMockStripe }));

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Orders API (system)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        sysPaymentIntents.create.mockResolvedValue({ id: 'pi_sys_test', client_secret: 'cs_sys_secret' });
    });

    describe('POST /orders', () => {
        it('creates order and returns JSON by default', async () => {
            const cartItems = [{ product_id: 1, quantity: 1, price: 10, seller_id: 5 }];
            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 10, created_at: new Date(), stripe_payment_intent_id: 'pi_sys_test' };
            const buyer = { id: 1, name: 'alice' };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [order] })   // UPDATE stripe_payment_intent_id
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [order] })
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({});
            expect(res.status).toBe(201);
            expect(res.body.id).toBe(1);
            expect(res.body.items).toBeDefined();
        });

        it('returns UBL XML when Accept: application/xml', async () => {
            const cartItems = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 9.99, created_at: new Date('2026-01-01'), stripe_payment_intent_id: 'pi_sys_test' };
            const buyer = { id: 1, name: 'alice', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'BobShop', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [order] })   // UPDATE stripe_payment_intent_id
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [order] })
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .set('Accept', 'application/xml')
                .send({});
            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/application\/xml/);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
        });

        it('returns 400 when cart is empty', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({});
            expect(res.status).toBe(400);
        });

        it('returns 404 when voucher does not exist', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 1, price: 9.99 }] })
                .mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ voucher_code: 'INVALID' });
            expect(res.status).toBe(404);
        });

        it('returns 400 when voucher has expired', async () => {
            const expired = { id: 7, name: 'OLD', discount: 0.1, expiry: new Date('2020-01-01') };
            pool.query
                .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 1, price: 9.99 }] })
                .mockResolvedValueOnce({ rows: [expired] });
            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ voucher_code: 'OLD' });
            expect(res.status).toBe(400);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).post('/orders').send({});
            expect(res.status).toBe(401);
        });
    });

    describe('GET /orders', () => {
        it('returns all orders', async () => {
            const orders = [{ id: 1 }, { id: 2 }];
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
        it('returns order as JSON', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending', buyer_name: 'alice', buyer_city: null, buyer_country: null };
            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [] });
            const res = await request(app).get('/orders/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
        });

        it('returns UBL XML when Accept: application/xml', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 9.99, created_at: new Date('2026-01-01') };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'alice', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'BobShop', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app).get('/orders/1').set('Accept', 'application/xml');
            expect(res.status).toBe(200);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
        });

        it('returns 404 when order not found', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app).get('/orders/999');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /orders/:id', () => {
        it('updates order status (admin only)', async () => {
            const updated = { id: 1, status: 'confirmed' };
            pool.query.mockResolvedValue({ rows: [updated] });
            const res = await request(app)
                .patch('/orders/1')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ status: 'confirmed' });
            expect(res.status).toBe(200);
        });

        it('returns 403 for non-admin', async () => {
            const res = await request(app)
                .patch('/orders/1')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ status: 'confirmed' });
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /orders/:id', () => {
        it('deletes order (admin only)', async () => {
            const order = { id: 1 };
            pool.query.mockResolvedValue({ rows: [order] });
            const res = await request(app)
                .delete('/orders/1')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
            expect(res.status).toBe(200);
        });

        it('returns 404 when order not found', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app)
                .delete('/orders/999')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
            expect(res.status).toBe(404);
        });
    });
});
