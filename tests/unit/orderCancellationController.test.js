import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const BUYER_TOKEN = jwt.sign({ id: 1, name: 'BuyerUser' }, 'dev-secret-change-in-production');
const OTHER_TOKEN = jwt.sign({ id: 9, name: 'OtherUser' }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn() }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Order Cancellation API (Black Box)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /orders/:id/cancel', () => {

        it('cancels an order successfully', async () => {

            const order = { id: 1, buyer_id: 1, status: 'confirmed', total_price: 29.97 };
            const cancellation = { id: 1, order_id: 1, buyer_id: 1, reason: null, created_at: new Date('2026-01-01') };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({});

            expect(res.status).toBe(201);
            expect(res.body.order_id).toBe(1);
            expect(res.body.buyer_id).toBe(1);
        });

        it('cancels with a reason', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97 };
            const cancellation = { id: 2, order_id: 1, buyer_id: 1, reason: 'Changed my mind', created_at: new Date('2026-01-01') };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({ reason: 'Changed my mind' });

            expect(res.status).toBe(201);
            expect(res.body.reason).toBe('Changed my mind');
        });

        it('returns UBL XML when Accept: application/xml', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97 };
            const cancellation = { id: 1, order_id: 1, buyer_id: 1, reason: 'No longer needed', created_at: new Date('2026-01-01') };
            const items = [{ product_id: 2, quantity: 3, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'BuyerUser', street: '1 Main St', city: 'Sydney', postcode: '2000', country: 'AU' };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })         // check order exists
                .mockResolvedValueOnce({ rows: [cancellation] })  // insert cancellation
                .mockResolvedValueOnce({ rows: [] })              // update status
                .mockResolvedValueOnce({ rows: [cancellation] })  // getOrderCancellationDetails: get cancellation
                .mockResolvedValueOnce({ rows: [order] })         // get order
                .mockResolvedValueOnce({ rows: items })           // get items
                .mockResolvedValueOnce({ rows: [buyer] })         // get buyer
                .mockResolvedValueOnce({ rows: [seller] });       // get sellers

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .set('Accept', 'application/xml')
                .send({ reason: 'No longer needed' });

            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/application\/xml/);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
            expect(res.text).toContain('<cbc:Note>No longer needed</cbc:Note>');
            expect(res.text).toContain('<cac:OrderReference>');
            expect(res.text).toContain('<cac:BuyerCustomerParty>');
            expect(res.text).toContain('<cbc:Name>BuyerUser</cbc:Name>');
            expect(res.text).toContain('<cac:SellerSupplierParty>');
        });

        it('returns 404 when order does not exist', async () => {

            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders/999/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({});

            expect(res.status).toBe(404);
        });

        it('returns 403 when user is not the buyer', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97 };

            pool.query.mockResolvedValueOnce({ rows: [order] });

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${OTHER_TOKEN}`)
                .send({});

            expect(res.status).toBe(403);
        });

        it('returns 400 when order is already cancelled', async () => {

            const order = { id: 1, buyer_id: 1, status: 'cancelled', total_price: 29.97 };

            pool.query.mockResolvedValueOnce({ rows: [order] });

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({});

            expect(res.status).toBe(400);
        });

        it('returns 401 without auth token', async () => {

            const res = await request(app)
                .post('/orders/1/cancel')
                .send({});

            expect(res.status).toBe(401);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .post('/orders/1/cancel')
                .set('Authorization', `Bearer ${BUYER_TOKEN}`)
                .send({});

            expect(res.status).toBe(500);
        });

    });

    describe('GET /orders/:id/cancel', () => {

        it('returns cancellation as JSON by default', async () => {

            const cancellation = { id: 1, order_id: 1, buyer_id: 1, reason: 'Changed my mind', created_at: new Date('2026-01-01') };
            const order = { id: 1, buyer_id: 1, status: 'cancelled', total_price: 29.97 };
            const items = [{ product_id: 2, quantity: 3, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'BuyerUser', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app).get('/orders/1/cancel');

            expect(res.status).toBe(200);
            expect(res.body.order_id).toBe(1);
            expect(res.body.buyer_id).toBe(1);
        });

        it('returns UBL OrderCancellation XML when Accept: application/xml', async () => {

            const cancellation = { id: 1, order_id: 1, buyer_id: 1, reason: 'Too expensive', created_at: new Date('2026-01-01') };
            const order = { id: 1, buyer_id: 1, status: 'cancelled', total_price: 29.97 };
            const items = [{ product_id: 2, quantity: 3, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'BuyerUser', street: '1 Main St', city: 'Sydney', postcode: '2000', country: 'AU' };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [cancellation] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app)
                .get('/orders/1/cancel')
                .set('Accept', 'application/xml');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/xml/);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
            expect(res.text).toContain('<cbc:Note>Too expensive</cbc:Note>');
            expect(res.text).toContain('<cac:OrderReference>');
            expect(res.text).toContain('<cac:BuyerCustomerParty>');
            expect(res.text).toContain('<cbc:Name>BuyerUser</cbc:Name>');
            expect(res.text).toContain('<cac:SellerSupplierParty>');
        });

        it('returns 404 when no cancellation exists', async () => {

            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/orders/1/cancel');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/orders/1/cancel');

            expect(res.status).toBe(500);
        });

    });

});
