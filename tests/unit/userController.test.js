import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn() }
}));

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password')
    }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Users API (Black Box)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /users', () => {

        it('creates a user successfully', async () => {

            const user = { id: 1, name: 'Alice', street: null, city: null, postcode: null, country: null, created_at: null, last_updated: null };

            pool.query.mockResolvedValue({ rows: [user] });

            const res = await request(app)
                .post('/users')
                .send({
                    name: 'Alice',
                    password: 'secret123'
                });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(user);
        });

        it('returns 500 on database failure', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .post('/users')
                .send({
                    name: 'Alice',
                    password: 'secret123'
                });

            expect(res.status).toBe(500);
        });

    });

    describe('GET /users', () => {

        it('returns all users', async () => {

            const users = [
                { id: 1, name: 'Alice', street: null, city: null, postcode: null, country: null },
                { id: 2, name: 'Bob', street: null, city: null, postcode: null, country: null }
            ];

            pool.query.mockResolvedValue({ rows: users });

            const res = await request(app).get('/users');

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

        it('returns a user when it exists', async () => {

            const user = { id: 1, name: 'Alice', street: null, city: null, postcode: null, country: null };

            pool.query.mockResolvedValue({ rows: [user] });

            const res = await request(app).get('/users/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(user);
        });

        it('returns 404 when user does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).get('/users/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/users/1');

            expect(res.status).toBe(500);
        });

    });

    describe('PATCH /users/:id', () => {

        it('updates a user successfully', async () => {

            const updated = { id: 1, name: 'Alice Updated', street: '123 St', city: 'Sydney', postcode: '2000', country: 'AU' };

            pool.query.mockResolvedValue({ rows: [updated] });

            const res = await request(app)
                .patch('/users/1')
                .send({ name: 'Alice Updated' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(updated);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .patch('/users/1')
                .send({ name: 'x' });

            expect(res.status).toBe(500);
        });

    });

    describe('DELETE /users/:id', () => {

        it('deletes a user successfully', async () => {

            const user = { id: 1, name: 'Alice', street: null, city: null, postcode: null, country: null };

            pool.query.mockResolvedValue({ rows: [user] });

            const res = await request(app).delete('/users/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(user);
        });

        it('returns 404 if user does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).delete('/users/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).delete('/users/1');

            expect(res.status).toBe(500);
        });

    });

});
