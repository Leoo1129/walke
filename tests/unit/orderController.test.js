import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_TOKEN = jwt.sign({ id: 1, name: 'testuser' }, 'dev-secret-change-in-production');

vi.mock('../../src/database/database.js', () => ({
    default: {
        query: vi.fn(),
        connect: vi.fn()
    }
}));

import { app } from '../../src/server.js';
import pool from '../../src/database/database.js';

describe('Orders API (Black Box)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /orders', () => {

        it('returns UBL XML when Accept: application/xml', async () => {

            const cartItems = [{ product_id: 2, quantity: 3, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97, voucher_id: null, created_at: new Date('2026-01-01') };
            const buyer = { id: 1, name: 'testuser', street: '123 Main St', city: 'Sydney', postcode: '2000', country: 'AU' };
            const seller = { id: 5, name: 'SellerUser', street: '456 Shop St', city: 'Melbourne', postcode: '3000', country: 'AU' };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [order] })
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .set('Accept', 'application/xml')
                .send({});

            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/application\/xml/);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
            expect(res.text).toContain('<cbc:ID>1</cbc:ID>');
            expect(res.text).toContain('<cbc:Note>Status: pending</cbc:Note>');
            expect(res.text).toContain('<cac:BuyerCustomerParty>');
            expect(res.text).toContain('<cbc:Name>testuser</cbc:Name>');
            expect(res.text).toContain('<cac:SellerSupplierParty>');
            expect(res.text).toContain('<cbc:Name>SellerUser</cbc:Name>');
            expect(res.text).toContain('<cac:OrderLine>');
            expect(res.text).toContain('<cbc:Name>Widget</cbc:Name>');
            expect(res.text).toContain('<cac:AnticipatedMonetaryTotal>');
            expect(res.text).toContain('29.97');
        });

        it('returns JSON by default', async () => {

            const cartItems = [{ product_id: 2, quantity: 3, price: 9.99 }];
            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 29.97, voucher_id: null, created_at: '2026-01-01T00:00:00.000Z' };
            const buyer = { id: 1, name: 'testuser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [buyer] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [order] })
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({});

            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body.id).toBe(1);
            expect(res.body.items).toEqual(cartItems);
        });

        it('applies a percentage voucher (discount < 1)', async () => {

            const cartItems = [{ product_id: 2, quantity: 2, price: 10.00, seller_id: 5 }];
            const voucher = { id: 5, name: 'SAVE20', discount: 0.2, expiry: null };
            const order = { id: 2, buyer_id: 1, status: 'pending', total_price: 16.00, voucher_id: 5, created_at: new Date('2026-01-01') };
            const buyer = { id: 1, name: 'testuser', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [order] })
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ voucher_code: 'SAVE20' });

            expect(res.status).toBe(201);
            expect(res.body.voucher_id).toBe(5);
        });

        it('applies a flat discount voucher (discount >= 1)', async () => {

            const cartItems = [{ product_id: 3, quantity: 1, price: 50.00, seller_id: 5 }];
            const voucher = { id: 6, name: 'FLAT10', discount: 10, expiry: null };
            const order = { id: 3, buyer_id: 1, status: 'pending', total_price: 40.00, voucher_id: 6, created_at: new Date('2026-01-01') };
            const buyer = { id: 1, name: 'testuser', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [order] })
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ voucher_code: 'FLAT10' });

            expect(res.status).toBe(201);
        });

        it('returns 404 when voucher does not exist', async () => {

            const cartItems = [{ product_id: 2, quantity: 1, price: 9.99 }];

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ voucher_code: 'INVALID' });

            expect(res.status).toBe(404);
        });

        it('returns 400 when voucher has expired', async () => {

            const cartItems = [{ product_id: 2, quantity: 1, price: 9.99 }];
            const expired = { id: 7, name: 'OLD', discount: 0.1, expiry: new Date('2020-01-01') };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [expired] });

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({ voucher_code: 'OLD' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when cart is empty', async () => {

            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({});

            expect(res.status).toBe(400);
        });

        it('returns 401 without auth token', async () => {

            const res = await request(app).post('/orders').send({});

            expect(res.status).toBe(401);
        });

        it('returns 500 on database failure', async () => {

            pool.query.mockResolvedValueOnce({ rows: [{ product_id: 2, quantity: 3, price: 9.99 }] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockRejectedValueOnce(new Error('db error')),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const res = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${TEST_TOKEN}`)
                .send({});

            expect(res.status).toBe(500);
        });

    });

    describe('GET /orders', () => {

        it('returns all orders', async () => {

            const orders = [
                { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null },
                { id: 2, buyer_id: 2, status: 'completed', total_price: 9.99, voucher_id: null }
            ];

            pool.query.mockResolvedValue({ rows: orders });

            const res = await request(app).get('/orders');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(orders);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/orders');

            expect(res.status).toBe(500);
        });

    });

    describe('GET /orders/:id', () => {

        it('returns an order as JSON when it exists', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null, buyer_name: 'Alice', buyer_city: 'Sydney', buyer_country: 'AU' };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })  // order + buyer JOIN
                .mockResolvedValueOnce({ rows: [] });       // items (empty, so sellers query skipped)

            const res = await request(app).get('/orders/1');

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ id: 1, buyer_id: 1, status: 'pending', total_price: 19.99 });
            expect(res.body.items).toEqual([]);
            expect(res.body.sellers).toEqual([]);
        });

        it('returns UBL XML when Accept: application/xml', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null, created_at: new Date('2026-01-01') };
            const items = [{ product_id: 2, quantity: 2, price: 9.99, product_name: 'Widget', seller_id: 5 }];
            const buyer = { id: 1, name: 'testuser', street: '123 Main St', city: 'Sydney', postcode: '2000', country: 'AU' };
            const seller = { id: 5, name: 'SellerUser', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: [buyer] })
                .mockResolvedValueOnce({ rows: [seller] });

            const res = await request(app)
                .get('/orders/1')
                .set('Accept', 'application/xml');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/xml/);
            expect(res.text).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
            expect(res.text).toContain('<cbc:ID>1</cbc:ID>');
            expect(res.text).toContain('<cac:BuyerCustomerParty>');
            expect(res.text).toContain('<cbc:Name>testuser</cbc:Name>');
            expect(res.text).toContain('<cac:SellerSupplierParty>');
            expect(res.text).toContain('<cac:OrderLine>');
            expect(res.text).toContain('<cbc:Name>Widget</cbc:Name>');
            expect(res.text).toContain('<cac:AnticipatedMonetaryTotal>');
        });

        it('returns 404 when order does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).get('/orders/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).get('/orders/1');

            expect(res.status).toBe(500);
        });

    });

    describe('PATCH /orders/:id', () => {

        it('updates an order successfully', async () => {

            const updated = { id: 1, buyer_id: 1, status: 'completed', total_price: 19.99, voucher_id: null };

            pool.query.mockResolvedValue({ rows: [updated] });

            const res = await request(app)
                .patch('/orders/1')
                .send({ status: 'completed' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(updated);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app)
                .patch('/orders/1')
                .send({ status: 'completed' });

            expect(res.status).toBe(500);
        });

    });

    describe('DELETE /orders/:id', () => {

        it('deletes an order successfully', async () => {

            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 19.99, voucher_id: null };

            pool.query.mockResolvedValue({ rows: [order] });

            const res = await request(app).delete('/orders/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(order);
        });

        it('returns 404 if order does not exist', async () => {

            pool.query.mockResolvedValue({ rows: [] });

            const res = await request(app).delete('/orders/999');

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {

            pool.query.mockRejectedValue(new Error('db error'));

            const res = await request(app).delete('/orders/1');

            expect(res.status).toBe(500);
        });

    });

});
