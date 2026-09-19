import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createLimiter } from '../../src/middleware/rateLimit.js';

function appWith(limiter) {
    const app = express();
    app.post('/login', limiter, (req, res) => res.status(200).json({ ok: true }));
    return app;
}

describe('rate limiting', () => {
    it('returns 429 with a JSON error once the limit is exceeded', async () => {
        const app = appWith(createLimiter({ windowMs: 60_000, limit: 2, message: 'slow down', enabled: true }));

        await request(app).post('/login').expect(200);
        await request(app).post('/login').expect(200);
        const res = await request(app).post('/login').expect(429);

        expect(res.body).toEqual({ error: 'slow down' });
        expect(res.headers['ratelimit-policy']).toBeDefined();
    });

    it('does nothing when disabled', async () => {
        const app = appWith(createLimiter({ windowMs: 60_000, limit: 1, message: 'slow down', enabled: false }));

        for (let i = 0; i < 5; i++) {
            await request(app).post('/login').expect(200);
        }
    });
});
