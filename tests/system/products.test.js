import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const VERIFIED_TOKEN = jwt.sign({ id: 1, name: 'alice', email_verified: true }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { app } from '../../src/app.js';
import pool from '../../src/database/database.js';

describe('Products API (system)', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('POST /products', () => {
        it('creates a product successfully', async () => {
            const product = { id: 1, name: 'Widget', price: 9.99, seller_id: 1 };
            pool.query.mockResolvedValue({ rows: [product] });

            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Widget', price: 9.99, seller_id: 1 });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(product);
        });

        it('ignores a spoofed seller_id and lists the product under the caller', async () => {
            pool.query.mockResolvedValue({ rows: [{ id: 1, name: 'Widget', price: 9.99, seller_id: 1 }] });

            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Widget', price: 9.99, seller_id: 42 });

            expect(res.status).toBe(201);
            const [, params] = pool.query.mock.calls[0];
            expect(params[2]).toBe(1);
        });

        it('returns 403 when adding to a business the user cannot edit', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'viewer' }] });

            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Widget', price: 9.99, business_id: 3 });

            expect(res.status).toBe(403);
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('allows business editors to add products to the business', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'editor' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Widget', business_id: 3 }] });

            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Widget', price: 9.99, business_id: 3 });

            expect(res.status).toBe(201);
        });

        it('returns 400 when required fields are missing', async () => {
            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ price: 9.99 });
            expect(res.status).toBe(400);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).post('/products').send({ name: 'Widget', price: 9.99, seller_id: 1 });
            expect(res.status).toBe(401);
        });

        it('returns 500 on database failure', async () => {
            pool.query.mockRejectedValue(new Error('db error'));
            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Widget', price: 9.99, seller_id: 1 });
            expect(res.status).toBe(500);
        });
    });

    describe('GET /products', () => {
        it('returns all active products', async () => {
            const products = [{ id: 1, name: 'Widget' }, { id: 2, name: 'Gadget' }];
            pool.query.mockResolvedValue({ rows: products });

            const res = await request(app).get('/products');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(products);
        });

        it('returns empty array when no products exist', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app).get('/products');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('filters by seller_id query param', async () => {
            pool.query.mockResolvedValue({ rows: [{ id: 1 }] });
            const res = await request(app).get('/products?seller_id=1');
            expect(res.status).toBe(200);
        });
    });

    describe('GET /products/:id', () => {
        it('returns product when found', async () => {
            const product = { id: 1, name: 'Widget', price: 9.99 };
            pool.query.mockResolvedValue({ rows: [product] });

            const res = await request(app).get('/products/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(product);
        });

        it('returns 404 when product does not exist', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app).get('/products/999');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /products/:id', () => {
        it('updates product when user is owner', async () => {
            const updated = { id: 1, name: 'Updated', price: 9.99, seller_id: 1 };
            pool.query
                .mockResolvedValueOnce({ rows: [{ seller_id: 1 }] })
                .mockResolvedValueOnce({ rows: [updated] });

            const res = await request(app)
                .patch('/products/1')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });

        it('returns 403 when user does not own product', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 99 }] });
            const res = await request(app)
                .patch('/products/1')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Hack' });
            expect(res.status).toBe(403);
        });

        it('returns 404 when product not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .patch('/products/999')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Ghost' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /products/:id', () => {
        it('soft-deletes product when user is owner', async () => {
            const product = { id: 1, name: 'Widget', is_active: false };
            pool.query
                .mockResolvedValueOnce({ rows: [{ seller_id: 1 }] })
                .mockResolvedValueOnce({ rows: [product] });

            const res = await request(app)
                .delete('/products/1')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`);
            expect(res.status).toBe(200);
        });

        it('returns 404 when product does not exist', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app)
                .delete('/products/999')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`);
            expect(res.status).toBe(404);
        });
    });
});
