import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_TOKEN = jwt.sign({ id: 1, name: 'testuser' }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn() }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Products API (Black Box)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /products', () => {

        it('creates a product successfully', async () => {

            const product = { id: 1, name: 'Widget', price: 9.99, seller_id: 1 };

            pool.query.mockResolvedValue({ rows: [product] });

            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({
                    name: 'Widget',
                    price: 9.99,
                    seller_id: 1
                });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(product);
        });

        // it('fails when required fields are missing', async () => {

        //     const res = await request(app)
        //         .post('/products')
        //         .send({
        //             price: 9.99
        //         });

        //     expect(res.status).toBe(400);
        // });

        it('returns 500 on database failure', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({
                    name: 'Widget',
                    price: 9.99,
                    seller_id: 1
                });

            expect(res.status).toBe(500);
        });

    });

    describe('GET /products', () => {

        it('returns all products', async () => {

            const products = [
                { id: 1, name: 'Widget', price: 9.99, seller_id: 1 },
                { id: 2, name: 'Gadget', price: 19.99, seller_id: 2 }
            ];

            pool.query.mockResolvedValue({ rows: products });

            const res = await request(app).get('/products');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(products);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/products');

            expect(res.status).toBe(500);
        });

    });

    describe('GET /products/:id', () => {

        it('returns a product when it exists', async () => {

            const product = { id: 1, name: 'Widget', price: 9.99, seller_id: 1 };

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

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/products/1');

            expect(res.status).toBe(500);
        });

    });

    describe('PATCH /products/:id', () => {

        it('updates a product successfully', async () => {

            const updated = { id: 1, name: 'Updated', price: 9.99, seller_id: 1 };

            pool.query.mockResolvedValue({ rows: [updated] });

            const res = await request(app)
                .patch('/products/1')
                .send({ name: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(updated);
        });

        // it('returns 404 if product does not exist', async () => {

        //     pool.query.mockResolvedValue({ rows: [] });

        //     const res = await request(app)
        //         .patch('/products/999')
        //         .send({ name: 'Ghost' });

        //     expect(res.status).toBe(404);
        // });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .patch('/products/1')
                .send({ name: 'x' });

            expect(res.status).toBe(500);
        });

    });

    describe('DELETE /products/:id', () => {

        it('deletes a product successfully', async () => {

            const product = { id: 1, name: 'Widget', price: 9.99, seller_id: 1 };

            pool.query.mockResolvedValue({ rows: [product] });

            const res = await request(app).delete('/products/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(product);
        });

        it('returns 404 if product does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).delete('/products/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).delete('/products/1');

            expect(res.status).toBe(500);
        });

    });

});