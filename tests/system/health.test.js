import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../database/database.js', () => ({
    default: { query: vi.fn() }
}));

import { app } from '../../src/app.js';

describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
        const res = await request(app).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('order-service');
        expect(res.body).toHaveProperty('uptime');
    });
});