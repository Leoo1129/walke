import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_TOKEN = jwt.sign({ id: 1, name: 'testuser' }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn() }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Cart API (Black Box)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /cart', () => {

        it('adds an item to the cart successfully', async () => {

            const item = { user_id: 1, product_id: 2, quantity: 3 };

            pool.query.mockResolvedValue({ rows: [item] });

            const res = await request(app)
                .post('/cart')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ product_id: 2, quantity: 3 });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(item);
        });

        it('returns 400 when product_id is missing', async () => {

            const res = await request(app)
                .post('/cart')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ quantity: 3 });

            expect(res.status).toBe(400);
        });

        it('returns 400 when quantity is less than 1', async () => {

            const res = await request(app)
                .post('/cart')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ product_id: 2, quantity: 0 });

            expect(res.status).toBe(400);
        });

        it('returns 401 without auth token', async () => {

            const res = await request(app)
                .post('/cart')
                .send({ product_id: 2, quantity: 3 });

            expect(res.status).toBe(401);
        });

        it('returns 500 on database failure', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .post('/cart')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ product_id: 2, quantity: 3 });

            expect(res.status).toBe(500);
        });

    });

    describe('GET /cart', () => {

        it('returns all cart items for the logged-in user', async () => {

            const items = [
                { user_id: 1, product_id: 2, quantity: 3 },
                { user_id: 1, product_id: 5, quantity: 1 }
            ];

            pool.query.mockResolvedValue({ rows: items });

            const res = await request(app)
                .get('/cart')
                .set('Authorization', `Bearer ${TEST_TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(items);
        });

        it('returns empty array when cart is empty', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app)
                .get('/cart')
                .set('Authorization', `Bearer ${TEST_TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('returns 401 without auth token', async () => {

            const res = await request(app).get('/cart');

            expect(res.status).toBe(401);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .get('/cart')
                .set('Authorization', `Bearer ${TEST_TOKEN}`);

            expect(res.status).toBe(500);
        });

    });

    describe('PATCH /cart/:product_id', () => {

        it('updates cart item quantity successfully', async () => {

            const item = { user_id: 1, product_id: 2, quantity: 5 };

            pool.query.mockResolvedValue({ rows: [item] });

            const res = await request(app)
                .patch('/cart/2')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ quantity: 5 });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(item);
        });

        it('returns 404 when cart item does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app)
                .patch('/cart/999')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ quantity: 5 });

            expect(res.status).toBe(404);
        });

        it('returns 400 when quantity is less than 1', async () => {

            const res = await request(app)
                .patch('/cart/2')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ quantity: 0 });

            expect(res.status).toBe(400);
        });

        it('returns 401 without auth token', async () => {

            const res = await request(app)
                .patch('/cart/2')
                .send({ quantity: 5 });

            expect(res.status).toBe(401);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .patch('/cart/2')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ quantity: 5 });

            expect(res.status).toBe(500);
        });

    });

    describe('DELETE /cart/:product_id', () => {

        it('removes an item from the cart successfully', async () => {

            const item = { user_id: 1, product_id: 2, quantity: 3 };

            pool.query.mockResolvedValue({ rows: [item] });

            const res = await request(app)
                .delete('/cart/2')
                .set('Authorization', `Bearer ${TEST_TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(item);
        });

        it('returns 404 when cart item does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app)
                .delete('/cart/999')
                .set('Authorization', `Bearer ${TEST_TOKEN}`);

            expect(res.status).toBe(404);
        });

        it('returns 401 without auth token', async () => {

            const res = await request(app).delete('/cart/2');

            expect(res.status).toBe(401);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .delete('/cart/2')
                .set('Authorization', `Bearer ${TEST_TOKEN}`);

            expect(res.status).toBe(500);
        });

    });

});
