import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { addToCart, getCart, updateCartItem, removeFromCart } from '../../src/controllers/cartController.js';
import pool from '../../src/database/database.js';

describe('cartController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('addToCart', () => {
        it('throws InputError when product_id is missing', async () => {
            await expect(addToCart(1, null, 3)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when quantity is missing', async () => {
            await expect(addToCart(1, 2, null)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when quantity is less than 1', async () => {
            await expect(addToCart(1, 2, 0)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('inserts cart item and returns it', async () => {
            const item = { user_id: 1, product_id: 2, quantity: 3 };
            pool.query.mockResolvedValueOnce({ rows: [item] });

            const result = await addToCart(1, 2, 3);
            expect(result).toEqual(item);
            expect(pool.query).toHaveBeenCalledOnce();
            expect(pool.query.mock.calls[0][1]).toEqual([1, 2, 3]);
        });

        it('updates quantity when item already exists (upsert)', async () => {
            const updated = { user_id: 1, product_id: 2, quantity: 10 };
            pool.query.mockResolvedValueOnce({ rows: [updated] });

            const result = await addToCart(1, 2, 10);
            expect(result.quantity).toBe(10);
        });
    });

    describe('getCart', () => {
        it('returns all cart items for the user', async () => {
            const items = [
                { product_id: 1, quantity: 2, product_name: 'Widget', price: 9.99, image_url: null },
                { product_id: 3, quantity: 1, product_name: 'Gadget', price: 19.99, image_url: null },
            ];
            pool.query.mockResolvedValueOnce({ rows: items });

            const result = await getCart(1);
            expect(result).toEqual(items);
            expect(pool.query.mock.calls[0][1]).toEqual([1]);
        });

        it('returns empty array when cart is empty', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const result = await getCart(1);
            expect(result).toEqual([]);
        });

        it('propagates database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('db error'));
            await expect(getCart(1)).rejects.toThrow('db error');
        });
    });

    describe('updateCartItem', () => {
        it('throws InputError when quantity is 0', async () => {
            await expect(updateCartItem(1, 2, 0)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when quantity is negative', async () => {
            await expect(updateCartItem(1, 2, -5)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws 404 when cart item does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(updateCartItem(1, 999, 5)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('updates and returns the cart item', async () => {
            const item = { user_id: 1, product_id: 2, quantity: 5 };
            pool.query.mockResolvedValueOnce({ rows: [item] });

            const result = await updateCartItem(1, 2, 5);
            expect(result).toEqual(item);
            expect(pool.query.mock.calls[0][1]).toEqual([5, 1, 2]);
        });
    });

    describe('removeFromCart', () => {
        it('throws 404 when cart item does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(removeFromCart(1, 999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('deletes and returns the cart item', async () => {
            const item = { user_id: 1, product_id: 2, quantity: 3 };
            pool.query.mockResolvedValueOnce({ rows: [item] });

            const result = await removeFromCart(1, 2);
            expect(result).toEqual(item);
            expect(pool.query.mock.calls[0][1]).toEqual([1, 2]);
        });

        it('propagates database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('db error'));
            await expect(removeFromCart(1, 2)).rejects.toThrow('db error');
        });
    });
});
