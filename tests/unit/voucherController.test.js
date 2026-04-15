import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const ADMIN_TOKEN = jwt.sign({ id: 1, name: 'testuser', is_admin: true }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn() }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Vouchers API (Black Box)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /vouchers', () => {

        it('creates a voucher successfully', async () => {

            const voucher = { id: 1, name: 'Summer Sale', discount: 10, expiry: null, max_uses: 100 };

            pool.query
                .mockResolvedValueOnce({ rows: [] })      // duplicate-name check: no existing voucher
                .mockResolvedValueOnce({ rows: [voucher] }); // INSERT

            const res = await request(app)
                .post('/vouchers')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({
                    name: 'Summer Sale',
                    discount: 10,
                    expiry: null,
                    max_uses: 100
                });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(voucher);
        });

        it('returns 500 on database failure', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .post('/vouchers')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({
                    name: 'Summer Sale',
                    discount: 10
                });

            expect(res.status).toBe(500);
        });

    });

    describe('GET /vouchers', () => {

        it('returns all vouchers', async () => {

            const vouchers = [
                { id: 1, name: 'Summer Sale', discount: 10, expiry: null, max_uses: 100 },
                { id: 2, name: 'Half Off', discount: 50, expiry: null, max_uses: 50 }
            ];

            pool.query.mockResolvedValue({ rows: vouchers });

            const res = await request(app).get('/vouchers');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(vouchers);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/vouchers');

            expect(res.status).toBe(500);
        });

    });

    describe('GET /vouchers/:id', () => {

        it('returns a voucher when it exists', async () => {

            const voucher = { id: 1, name: 'Summer Sale', discount: 10, expiry: null, max_uses: 100 };

            pool.query.mockResolvedValue({ rows: [voucher] });

            const res = await request(app).get('/vouchers/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(voucher);
        });

        it('returns 404 when voucher does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).get('/vouchers/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/vouchers/1');

            expect(res.status).toBe(500);
        });

    });

    describe('PATCH /vouchers/:id', () => {

        it('updates a voucher successfully', async () => {

            const updated = { id: 1, name: 'Updated', discount: 20, expiry: null, max_uses: 50 };

            pool.query.mockResolvedValue({ rows: [updated] });

            const res = await request(app)
                .patch('/vouchers/1')
                .send({ name: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(updated);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .patch('/vouchers/1')
                .send({ name: 'x' });

            expect(res.status).toBe(500);
        });

    });

    describe('DELETE /vouchers/:id', () => {

        it('deletes a voucher successfully', async () => {

            const voucher = { id: 1, name: 'Summer Sale', discount: 10, expiry: null, max_uses: 100 };

            pool.query.mockResolvedValue({ rows: [voucher] });

            const res = await request(app).delete('/vouchers/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(voucher);
        });

        it('returns 404 if voucher does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).delete('/vouchers/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).delete('/vouchers/1');

            expect(res.status).toBe(500);
        });

    });

});
