import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TOKEN = jwt.sign({ id: 1, name: 'alice', email_verified: true }, 'dev-secret-change-in-production');
const auth = { Authorization: `Bearer ${TOKEN}` };

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

vi.mock('../../src/services/mailer.js', () => ({
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendXmlEmail: vi.fn(),
}));

import { app } from '../../src/app.js';
import pool from '../../src/database/database.js';

describe('Request validation (system)', () => {
    beforeEach(() => vi.resetAllMocks());

    describe('registration', () => {
        it('rejects an invalid email with a field-level message', async () => {
            const res = await request(app).post('/users').send({ name: 'alice', password: 'longenough', email: 'not-an-email' });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('email: must be a valid email address');
            expect(res.body.details).toEqual([{ field: 'email', message: 'must be a valid email address' }]);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('rejects passwords shorter than 8 characters', async () => {
            const res = await request(app).post('/users').send({ name: 'alice', password: 'short', email: 'a@b.com' });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('password: must be at least 8 characters');
        });

        it('reports every invalid field', async () => {
            const res = await request(app).post('/users').send({});
            expect(res.status).toBe(400);
            expect(res.body.details.map(d => d.field)).toEqual(['name', 'email', 'password']);
        });
    });

    describe('products', () => {
        it('rejects a negative price', async () => {
            const res = await request(app).post('/products').set(auth).send({ name: 'Widget', price: -5 });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/^price:/);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('coerces numeric strings and trims names', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const res = await request(app).post('/products').set(auth).send({ name: '  Widget  ', price: '9.50' });
            expect(res.status).toBe(201);
            const [, params] = pool.query.mock.calls[0];
            expect(params[0]).toBe('Widget');
            expect(params[1]).toBe(9.5);
        });

        it('returns 400 (not a database 500) for a non-numeric id', async () => {
            const res = await request(app).get('/products/abc');
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('id must be a positive integer');
            expect(pool.query).not.toHaveBeenCalled();
        });
    });

    describe('cart', () => {
        it('rejects fractional quantities', async () => {
            const res = await request(app).post('/cart').set(auth).send({ product_id: 2, quantity: 1.5 });
            expect(res.status).toBe(400);
        });
    });

    describe('vouchers', () => {
        it('rejects an unparseable expiry date', async () => {
            const res = await request(app).post('/vouchers').set(auth).send({ name: 'SALE', discount: 0.1, expiry: 'next tuesday' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/^expiry:/);
        });

        it('treats a blank expiry from the form as no expiry', async () => {
            pool.query.mockResolvedValue({ rows: [{ id: 1, name: 'SALE' }] });
            const res = await request(app).post('/vouchers').set(auth).send({ name: 'SALE', discount: 0.1, expiry: '' });
            expect(res.status).not.toBe(400);
        });
    });

    describe('order chat', () => {
        it('rejects an empty message before touching the database', async () => {
            const res = await request(app).post('/orders/1/chat/5/message').set(auth).send({ message: '   ' });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('message: cannot be empty');
            expect(pool.query).not.toHaveBeenCalled();
        });
    });
});
