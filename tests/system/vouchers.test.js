import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const ADMIN_TOKEN = jwt.sign({ id: 1, name: 'alice', is_admin: true, email_verified: true }, 'dev-secret-change-in-production');
const VERIFIED_TOKEN = jwt.sign({ id: 1, name: 'alice', email_verified: true }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { app } from '../../src/app.js';
import pool from '../../src/database/database.js';

describe('Vouchers API (system)', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('POST /vouchers', () => {
        it('creates global voucher as admin', async () => {
            const voucher = { id: 1, name: 'SALE20', discount: 0.2, expiry: null, max_uses: 100, business_id: null };
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [voucher] });

            const res = await request(app)
                .post('/vouchers')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ name: 'SALE20', discount: 0.2 });
            expect(res.status).toBe(201);
            expect(res.body).toEqual(voucher);
        });

        it('returns 403 when non-admin tries to create global voucher', async () => {
            const res = await request(app)
                .post('/vouchers')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'HACK', discount: 1 });
            expect(res.status).toBe(403);
        });

        it('returns 409 when voucher name already exists', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });
            const res = await request(app)
                .post('/vouchers')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ name: 'TAKEN', discount: 0.1 });
            expect(res.status).toBe(409);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).post('/vouchers').send({ name: 'X', discount: 0.1 });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /vouchers', () => {
        it('returns all vouchers', async () => {
            const vouchers = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
            pool.query.mockResolvedValue({ rows: vouchers });
            const res = await request(app).get('/vouchers');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(vouchers);
        });

        it('returns 404 when no vouchers exist', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app).get('/vouchers');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /vouchers/:id', () => {
        it('returns voucher by id', async () => {
            const voucher = { id: 1, name: 'SALE20', discount: 0.2 };
            pool.query.mockResolvedValue({ rows: [voucher] });
            const res = await request(app).get('/vouchers/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(voucher);
        });

        it('returns 404 when voucher not found', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app).get('/vouchers/999');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /vouchers/:id', () => {
        it('updates voucher as admin', async () => {
            const existing = { id: 1, name: 'OLD', discount: 0.1, business_id: null };
            const updated = { id: 1, name: 'NEW', discount: 0.2, business_id: null };
            pool.query
                .mockResolvedValueOnce({ rows: [existing] })
                .mockResolvedValueOnce({ rows: [updated] });

            const res = await request(app)
                .patch('/vouchers/1')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ name: 'NEW', discount: 0.2 });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('NEW');
        });

        it('returns 403 when non-admin updates global voucher', async () => {
            const existing = { id: 1, name: 'GLOBAL', business_id: null };
            pool.query.mockResolvedValueOnce({ rows: [existing] });
            const res = await request(app)
                .patch('/vouchers/1')
                .set('Authorization', `Bearer ${VERIFIED_TOKEN}`)
                .send({ name: 'Hack' });
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /vouchers/:id', () => {
        it('deletes voucher as admin', async () => {
            const voucher = { id: 1, name: 'SALE20', business_id: null };
            pool.query
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [voucher] });

            const res = await request(app)
                .delete('/vouchers/1')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
            expect(res.status).toBe(200);
        });

        it('returns 404 when voucher not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .delete('/vouchers/999')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
            expect(res.status).toBe(404);
        });
    });
});
