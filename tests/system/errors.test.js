import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { app } from '../../src/app.js';
import pool from '../../src/database/database.js';

describe('Error handling (system)', () => {
    it('returns JSON 404 for unknown API routes', async () => {
        const res = await request(app).get('/does-not-exist').set('Accept', 'application/json');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'route not found' });
    });

    it('does not leak internal error details on 500', async () => {
        pool.query.mockRejectedValueOnce(new Error('relation "products" does not exist'));
        const res = await request(app).get('/products/1');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Internal Server Error' });
    });

    it('returns 400 for malformed JSON bodies', async () => {
        const res = await request(app)
            .post('/login')
            .set('Content-Type', 'application/json')
            .send('{"name": "alice", ');
        expect(res.status).toBe(400);
    });

    it('serves routes under the /api prefix used by the production frontend', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
