import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const sign = payload => jwt.sign({ email_verified: true, ...payload }, 'dev-secret-change-in-production');
const BUYER = sign({ id: 1, name: 'alice' });
const SELLER_A = sign({ id: 5, name: 'BobShop' });
const SELLER_B = sign({ id: 6, name: 'CarolShop' });
const STRANGER = sign({ id: 9, name: 'mallory' });
const ADMIN = sign({ id: 99, name: 'admin', is_admin: true });
const auth = token => ({ Authorization: `Bearer ${token}` });

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

vi.mock('../../src/services/mailer.js', () => ({
    sendXmlEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
}));

import { app } from '../../src/app.js';
import pool from '../../src/database/database.js';
import { sendXmlEmail } from '../../src/services/mailer.js';

const access = (is_seller = false) => ({ rows: [{ buyer_id: 1, is_seller }] });
const chats = [{ id: 1, order_id: 1, seller_id: 5 }, { id: 2, order_id: 1, seller_id: 6 }];

describe('Order access control (system)', () => {
    beforeEach(() => vi.resetAllMocks());

    describe('GET /orders/:id/chats', () => {
        it('shows the buyer every chat on the order', async () => {
            pool.query.mockResolvedValueOnce(access()).mockResolvedValueOnce({ rows: chats });
            const res = await request(app).get('/orders/1/chats').set(auth(BUYER));
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        it('shows a seller only their own chat', async () => {
            pool.query.mockResolvedValueOnce(access(true)).mockResolvedValueOnce({ rows: chats });
            const res = await request(app).get('/orders/1/chats').set(auth(SELLER_B));
            expect(res.status).toBe(200);
            expect(res.body).toEqual([chats[1]]);
        });

        it('rejects users outside the order', async () => {
            pool.query.mockResolvedValueOnce(access());
            const res = await request(app).get('/orders/1/chats').set(auth(STRANGER));
            expect(res.status).toBe(403);
        });

        it('lets an admin see everything without being a party', async () => {
            pool.query.mockResolvedValueOnce(access()).mockResolvedValueOnce({ rows: chats });
            const res = await request(app).get('/orders/1/chats').set(auth(ADMIN));
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });

    describe('GET /orders/:id/chat/:seller_id', () => {
        it('stops one seller reading another seller\'s negotiation', async () => {
            pool.query.mockResolvedValueOnce(access(true));
            const res = await request(app).get('/orders/1/chat/5').set(auth(SELLER_B));
            expect(res.status).toBe(403);
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('lets the seller read their own chat', async () => {
            pool.query
                .mockResolvedValueOnce(access(true))
                .mockResolvedValueOnce({ rows: [chats[0]] })
                .mockResolvedValueOnce({ rows: [] });
            const res = await request(app).get('/orders/1/chat/5').set(auth(SELLER_A));
            expect(res.status).toBe(200);
            expect(res.body.messages).toEqual([]);
        });
    });

    describe('POST /orders/:id/xml-email', () => {
        it('refuses to email an order the user is not part of', async () => {
            pool.query.mockResolvedValueOnce(access());
            const res = await request(app)
                .post('/orders/1/xml-email')
                .set(auth(STRANGER))
                .send({ type: 'order', email: 'mallory@example.com' });
            expect(res.status).toBe(403);
            expect(sendXmlEmail).not.toHaveBeenCalled();
        });

        it('returns 404 for an order that does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/orders/404/xml-email')
                .set(auth(BUYER))
                .send({ type: 'order', email: 'alice@example.com' });
            expect(res.status).toBe(404);
        });
    });
});
