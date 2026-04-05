import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_TOKEN = jwt.sign({ id: 5, name: 'SellerUser' }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: {
        query: vi.fn(),
        connect: vi.fn()
    }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Order Response API (Black Box)', () => {

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('POST /orders/:id/response', () => {

        it('creates a response successfully (AB)', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97 };
            const sellerItems = [{ product_id: 2 }];
            const response = { id: 1, order_id: 1, seller_id: 5, response_code: 'AB', note: null, created_at: new Date('2026-01-01') };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'BuyerUser', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            // pool.query: 2 pre-transaction checks + 5 for getOrderResponseDetails
            pool.query
                .mockResolvedValueOnce({ rows: [order] })       // check order exists
                .mockResolvedValueOnce({ rows: sellerItems })   // check seller items
                .mockResolvedValueOnce({ rows: [response] })    // getOrderResponseDetails: get response
                .mockResolvedValueOnce({ rows: [order] })       // get order
                .mockResolvedValueOnce({ rows: items })         // get items
                .mockResolvedValueOnce({ rows: [buyer] })       // get buyer
                .mockResolvedValueOnce({ rows: [seller] });     // get seller

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)                                            // BEGIN
                    .mockResolvedValueOnce({ rows: [response] })                                // INSERT response
                    .mockResolvedValueOnce({ rows: [{ seller_id: 5 }] })                        // SELECT allSellers
                    .mockResolvedValueOnce({ rows: [{ seller_id: 5, response_code: 'AB' }] })   // SELECT latestResponses
                    .mockResolvedValueOnce({ rows: [{ n: '1' }] })                              // SELECT COUNT(*) remaining
                    .mockResolvedValueOnce({ rows: [] })                                        // UPDATE status = confirmed
                    .mockResolvedValueOnce(undefined),                                          // COMMIT
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ response_code: 'AB' });

            expect(res.status).toBe(201);
            expect(res.body.response_code).toBe('AB');
            expect(res.body.order_id).toBe(1);
        });

        it('creates a rejection (RE)', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97 };
            const sellerItems = [{ product_id: 2 }];
            const response = { id: 2, order_id: 1, seller_id: 5, response_code: 'RE', note: 'Out of stock', created_at: new Date('2026-01-01') };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'BuyerUser', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: sellerItems })
                .mockResolvedValueOnce({ rows: [response] })    // getOrderResponseDetails
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)               // BEGIN
                    .mockResolvedValueOnce({ rows: [response] })    // INSERT response
                    .mockResolvedValueOnce({ rows: [{ id: 2 }] })  // SELECT seller's product IDs
                    .mockResolvedValueOnce({ rows: [] })            // DELETE order_items
                    .mockResolvedValueOnce({ rows: [] })            // SELECT remaining items (empty → all removed)
                    .mockResolvedValueOnce({ rows: [] })            // UPDATE status = rejected
                    .mockResolvedValueOnce(undefined),              // COMMIT (early return path)
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ response_code: 'RE', note: 'Out of stock' });

            expect(res.status).toBe(201);
            expect(res.body.response_code).toBe('RE');
        });


        it('returns 404 when order does not exist', async () => {

            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders/999/response')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ response_code: 'AB' });

            expect(res.status).toBe(404);
        });

        it('returns 400 when response_code is invalid', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97 };

            pool.query.mockResolvedValueOnce({ rows: [order] });

            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ response_code: 'XX' });

            expect(res.status).toBe(400);
        });

        it('returns 403 when seller has no items in order', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97 };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ response_code: 'AB' });

            expect(res.status).toBe(403);
        });

        it('returns 401 without auth token', async () => {

            const res = await request(app)
                .post('/orders/1/response')
                .send({ response_code: 'AB' });

            expect(res.status).toBe(401);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .post('/orders/1/response')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ response_code: 'AB' });

            expect(res.status).toBe(500);
        });

    });

    describe('GET /orders/:id/response', () => {

        it('returns response as JSON by default', async () => {

            const response = { id: 1, order_id: 1, seller_id: 5, response_code: 'AB', note: null, created_at: new Date('2026-01-01') };
            const order = { id: 1, buyer_id: 1, status: 'confirmed', total_price: 29.97 };
            const items = [{ product_id: 2, quantity: 3, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'BuyerUser', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [response] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app).get('/orders/1/response');

            expect(res.status).toBe(200);
            expect(res.body.response_code).toBe('AB');
            expect(res.body.order_id).toBe(1);
        });

        it('returns UBL OrderResponse XML when Accept: application/xml', async () => {

            const response = { id: 1, order_id: 1, seller_id: 5, response_code: 'AB', note: 'Confirmed', created_at: new Date('2026-01-01') };
            const order = { id: 1, buyer_id: 1, status: 'confirmed', total_price: 29.97 };
            const items = [{ product_id: 2, quantity: 3, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'BuyerUser', street: '1 Main St', city: 'Sydney', postcode: '2000', country: 'AU' };
            const seller = { id: 5, name: 'SellerUser', street: '2 Shop St', city: 'Melbourne', postcode: '3000', country: 'AU' };

            pool.query
                .mockResolvedValueOnce({ rows: [response] })
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app)
                .get('/orders/1/response')
                .set('Accept', 'application/xml');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/xml/);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
            expect(res.text).toContain('<cbc:OrderCommunicationTypeCode>AB</cbc:OrderCommunicationTypeCode>');
            expect(res.text).toContain('<cbc:Note>Confirmed</cbc:Note>');
            expect(res.text).toContain('<cac:OrderReference>');
            expect(res.text).toContain('<cac:SellerSupplierParty>');
            expect(res.text).toContain('<cbc:Name>SellerUser</cbc:Name>');
            expect(res.text).toContain('<cac:BuyerCustomerParty>');
            expect(res.text).toContain('<cbc:Name>BuyerUser</cbc:Name>');
            expect(res.text).toContain('<cac:OrderLine>');
            expect(res.text).toContain('<cbc:Name>Widget</cbc:Name>');
        });

        it('returns 404 when no response exists', async () => {

            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/orders/1/response');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/orders/1/response');

            expect(res.status).toBe(500);
        });

    });

});
