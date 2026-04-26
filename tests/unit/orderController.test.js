import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

// vi.hoisted ensures these are available when the stripe mock factory runs
const { mockPaymentIntents, MockStripe } = vi.hoisted(() => {
    const mockPaymentIntents = { create: vi.fn(), retrieve: vi.fn() };
    // Regular function (not arrow) so `new MockStripe()` works as a constructor
    function MockStripe() { return { paymentIntents: mockPaymentIntents }; }
    return { mockPaymentIntents, MockStripe };
});

vi.mock('stripe', () => ({ default: MockStripe }));

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

import { createOrder, getOrders, getOrder, updateOrder, deleteOrder, confirmPayment } from '../../src/controllers/orderController.js';
import pool from '../../src/database/database.js';

describe('orderController', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockPaymentIntents.create.mockResolvedValue({ id: 'pi_test123', client_secret: 'cs_test_secret' });
    });

    describe('createOrder', () => {
        it('throws InputError when buyer_id is missing', async () => {
            await expect(createOrder(null)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws 400 when cart is empty', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(createOrder(1)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 404 when voucher code does not exist', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 1, price: 10, product_name: 'X', seller_id: 2 }] })
                .mockResolvedValueOnce({ rows: [] });
            await expect(createOrder(1, 'BADCODE')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 400 when voucher is expired', async () => {
            const expired = { id: 1, name: 'OLD', discount: 0.1, expiry: new Date('2020-01-01') };
            pool.query
                .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 1, price: 10, product_name: 'X', seller_id: 2 }] })
                .mockResolvedValueOnce({ rows: [expired] });
            await expect(createOrder(1, 'OLD')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('creates order from cart items and clears cart', async () => {
            const cartItems = [{ product_id: 1, quantity: 2, price: 10, product_name: 'Widget', seller_id: 5 }];
            const order = { id: 1, buyer_id: 1, status: 'pending', total_price: 20, voucher_id: null, stripe_payment_intent_id: 'pi_test123' };
            const buyer = { id: 1, name: 'Alice', street: null, city: null, postcode: null, country: null };
            const seller = { id: 5, name: 'BobShop', street: null, city: null, postcode: null, country: null };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })        // SELECT cart_items
                .mockResolvedValueOnce({ rows: [order] })          // UPDATE stripe_payment_intent_id
                .mockResolvedValueOnce({ rows: [buyer] })          // SELECT buyer
                .mockResolvedValueOnce({ rows: [seller] });        // SELECT sellers

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)              // BEGIN
                    .mockResolvedValueOnce({ rows: [order] })      // INSERT orders
                    .mockResolvedValueOnce(undefined)              // INSERT order_items
                    .mockResolvedValueOnce(undefined)              // DELETE cart_items
                    .mockResolvedValueOnce(undefined),             // COMMIT
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const result = await createOrder(1);
            expect(result.order).toEqual(order);
            expect(result.items).toEqual(cartItems);
            expect(result.buyer).toEqual(buyer);
            expect(result.client_secret).toBe('cs_test_secret');
            const deleteCall = mockClient.query.mock.calls.find(c => c[0].includes('DELETE FROM cart_items'));
            expect(deleteCall).toBeDefined();
        });

        it('applies percentage voucher discount (discount < 1)', async () => {
            const cartItems = [{ product_id: 1, quantity: 2, price: 10, product_name: 'X', seller_id: 5 }];
            const voucher = { id: 2, name: 'SAVE20', discount: 0.2, expiry: null };
            const order = { id: 2, buyer_id: 1, status: 'pending', total_price: 16, voucher_id: 2, stripe_payment_intent_id: 'pi_test123' };
            const buyer = { id: 1, name: 'Alice' };
            const seller = { id: 5, name: 'Bob' };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [order] })          // UPDATE stripe_payment_intent_id
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

            const result = await createOrder(1, 'SAVE20');
            expect(result.order.voucher_id).toBe(2);
            const insertCall = mockClient.query.mock.calls.find(c => c[0].includes('INSERT INTO orders'));
            expect(insertCall[1][2]).toBe(16);
        });

        it('applies flat discount voucher (discount >= 1)', async () => {
            const cartItems = [{ product_id: 1, quantity: 1, price: 50, product_name: 'X', seller_id: 5 }];
            const voucher = { id: 3, name: 'FLAT10', discount: 10, expiry: null };
            const order = { id: 3, buyer_id: 1, status: 'pending', total_price: 40, voucher_id: 3, stripe_payment_intent_id: 'pi_test123' };
            const buyer = { id: 1, name: 'Alice' };
            const seller = { id: 5, name: 'Bob' };

            pool.query
                .mockResolvedValueOnce({ rows: cartItems })
                .mockResolvedValueOnce({ rows: [voucher] })
                .mockResolvedValueOnce({ rows: [order] })          // UPDATE stripe_payment_intent_id
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

            await createOrder(1, 'FLAT10');
            const insertCall = mockClient.query.mock.calls.find(c => c[0].includes('INSERT INTO orders'));
            expect(insertCall[1][2]).toBe(40);
        });

        it('rolls back transaction on error', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 1, price: 10, product_name: 'X', seller_id: 5 }] });

            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockRejectedValueOnce(new Error('db error')),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            await expect(createOrder(1)).rejects.toThrow('db error');
            const calls = mockClient.query.mock.calls.map(c => c[0]);
            expect(calls).toContain('ROLLBACK');
        });
    });

    describe('getOrders', () => {
        it('returns all orders when no seller_id provided', async () => {
            const orders = [{ id: 1 }, { id: 2 }];
            pool.query.mockResolvedValueOnce({ rows: orders });

            const result = await getOrders();
            expect(result).toEqual(orders);
            expect(pool.query.mock.calls[0][0]).not.toContain('seller_id');
        });

        it('returns orders filtered by seller_id', async () => {
            const orders = [{ id: 1 }];
            pool.query.mockResolvedValueOnce({ rows: orders });

            const result = await getOrders(5);
            expect(result).toEqual(orders);
            expect(pool.query.mock.calls[0][0]).toContain('seller_id');
            expect(pool.query.mock.calls[0][1]).toContain(5);
        });

        it('throws 404 when no orders exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getOrders()).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getOrder', () => {
        it('returns order with items, buyer, and sellers', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending', buyer_name: 'Alice', buyer_city: 'Sydney', buyer_country: 'AU' };
            const items = [{ product_id: 2, quantity: 1, price: 9.99, seller_id: 5 }];
            const sellers = [{ id: 5, name: 'BobShop' }];

            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: items })
                .mockResolvedValueOnce({ rows: sellers });

            const result = await getOrder(1);
            expect(result.id).toBe(1);
            expect(result.items).toEqual(items);
            expect(result.sellers).toEqual(sellers);
            expect(result.buyer).toMatchObject({ name: 'Alice', city: 'Sydney' });
        });

        it('throws 404 when order does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getOrder(999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('returns empty sellers array when no items have seller_ids', async () => {
            const order = { id: 1, buyer_id: 1, buyer_name: 'Alice', buyer_city: null, buyer_country: null };
            pool.query
                .mockResolvedValueOnce({ rows: [order] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await getOrder(1);
            expect(result.sellers).toEqual([]);
        });
    });

    describe('updateOrder', () => {
        it('throws 400 when no valid fields provided', async () => {
            await expect(updateOrder(1, { invalid: 'x' })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 when order not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(updateOrder(999, { status: 'confirmed' })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('updates order status', async () => {
            const updated = { id: 1, status: 'confirmed' };
            pool.query.mockResolvedValueOnce({ rows: [updated] });

            const result = await updateOrder(1, { status: 'confirmed' });
            expect(result.status).toBe('confirmed');
        });
    });

    describe('deleteOrder', () => {
        it('throws 404 when order does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(deleteOrder(999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('deletes and returns the order', async () => {
            const order = { id: 1, buyer_id: 1, status: 'pending' };
            pool.query.mockResolvedValueOnce({ rows: [order] });

            const result = await deleteOrder(1);
            expect(result).toEqual(order);
        });
    });

    describe('confirmPayment', () => {
        it('throws 404 when order not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(confirmPayment(999, 1)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 403 when user does not own the order', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, buyer_id: 2, payment_status: 'awaiting_payment', stripe_payment_intent_id: 'pi_1' }] });
            await expect(confirmPayment(1, 99)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('returns existing order immediately if already paid', async () => {
            const order = { id: 1, buyer_id: 1, payment_status: 'paid', stripe_payment_intent_id: 'pi_1' };
            pool.query.mockResolvedValueOnce({ rows: [order] });

            const result = await confirmPayment(1, 1);
            expect(result.payment_status).toBe('paid');
            expect(mockPaymentIntents.retrieve).not.toHaveBeenCalled();
        });

        it('throws 400 when order has no payment intent', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, buyer_id: 1, payment_status: 'awaiting_payment', stripe_payment_intent_id: null }] });
            await expect(confirmPayment(1, 1)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 402 when payment intent is not succeeded', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, buyer_id: 1, payment_status: 'awaiting_payment', stripe_payment_intent_id: 'pi_1' }] });
            mockPaymentIntents.retrieve.mockResolvedValueOnce({ status: 'requires_payment_method' });

            await expect(confirmPayment(1, 1)).rejects.toMatchObject({ statusCode: 402 });
        });

        it('updates payment_status to paid when intent succeeded', async () => {
            const updated = { id: 1, buyer_id: 1, payment_status: 'paid' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, buyer_id: 1, payment_status: 'awaiting_payment', stripe_payment_intent_id: 'pi_1' }] })
                .mockResolvedValueOnce({ rows: [updated] });
            mockPaymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' });

            const result = await confirmPayment(1, 1);
            expect(result.payment_status).toBe('paid');
            const updateCall = pool.query.mock.calls.find(c => c[0].includes('payment_status'));
            expect(updateCall).toBeDefined();
        });
    });
});
