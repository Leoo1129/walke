import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const USER1_TOKEN = jwt.sign({ id: 1, name: 'alice', email_verified: true }, 'dev-secret-change-in-production');
const ADMIN_TOKEN = jwt.sign({ id: 1, name: 'alice', is_admin: true, email_verified: true }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

vi.mock('../../src/services/mailer.js', () => ({
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Users API (system)', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('POST /users', () => {
        it('creates a user and returns verification message', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'alice', email: 'alice@example.com' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app).post('/users').send({ name: 'alice', password: 'secret', email: 'alice@example.com' });
            expect(res.status).toBe(201);
            expect(res.body.message).toContain('verify your address');
        });

        it('returns 409 when email is already in use', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

            const res = await request(app).post('/users').send({ name: 'alice', password: 'secret', email: 'taken@example.com' });
            expect(res.status).toBe(409);
        });

        it('returns 500 on database failure', async () => {
            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).post('/users').send({ name: 'alice', password: 'secret', email: 'a@b.com' });
            expect(res.status).toBe(500);
        });
    });

    describe('GET /users', () => {
        it('returns all users', async () => {
            const users = [{ id: 1, name: 'alice' }, { id: 2, name: 'bob' }];
            pool.query.mockResolvedValue({ rows: users });

            const res = await request(app).get('/users');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(users);
        });

        it('searches users by name query param', async () => {
            const users = [{ id: 1, name: 'alice' }];
            pool.query.mockResolvedValue({ rows: users });

            const res = await request(app).get('/users?name=alic');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(users);
        });

        it('returns 500 on database error', async () => {
            pool.query.mockRejectedValue(new Error('db error'));
            const res = await request(app).get('/users');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /users/:id', () => {
        it('returns user by id', async () => {
            const user = { id: 1, name: 'alice', email: 'a@b.com' };
            pool.query.mockResolvedValue({ rows: [user] });

            const res = await request(app).get('/users/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(user);
        });

        it('returns 404 when user not found', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            const res = await request(app).get('/users/999');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /users/:id', () => {
        it('updates own profile successfully', async () => {
            const updated = { id: 1, name: 'alice updated' };
            pool.query.mockResolvedValue({ rows: [updated] });

            const res = await request(app)
                .patch('/users/1')
                .set('Authorization', `Bearer ${USER1_TOKEN}`)
                .send({ name: 'alice updated' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('alice updated');
        });

        it('returns 401 without auth token', async () => {
            const res = await request(app).patch('/users/1').send({ name: 'x' });
            expect(res.status).toBe(401);
        });

        it('returns 403 when updating another user as non-admin', async () => {
            const res = await request(app)
                .patch('/users/99')
                .set('Authorization', `Bearer ${USER1_TOKEN}`)
                .send({ name: 'x' });
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /users/:id', () => {
        it('deletes own account successfully', async () => {
            const user = { id: 1, name: 'alice' };
            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [user] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .delete('/users/1')
                .set('Authorization', `Bearer ${USER1_TOKEN}`);
            expect(res.status).toBe(200);
        });

        it('returns 404 when user does not exist', async () => {
            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .delete('/users/999')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
            expect(res.status).toBe(404);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).delete('/users/1');
            expect(res.status).toBe(401);
        });
    });
});
