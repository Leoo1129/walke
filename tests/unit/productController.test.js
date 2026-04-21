import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

import { createProduct, getProducts, getProduct, updateProduct, deleteProduct } from '../../src/controllers/productController.js';
import pool from '../../src/database/database.js';

describe('productController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('createProduct', () => {
        it('throws InputError when name is missing', async () => {
            await expect(createProduct(null, 9.99, 1)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when price is missing', async () => {
            await expect(createProduct('Widget', null, 1)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when seller_id is missing', async () => {
            await expect(createProduct('Widget', 9.99, null)).rejects.toMatchObject({ name: 'InputError' });
        });

        it('creates and returns a product', async () => {
            const product = { id: 1, name: 'Widget', price: 9.99, seller_id: 1, tags: [], image_url: null, business_id: null };
            pool.query.mockResolvedValueOnce({ rows: [product] });

            const result = await createProduct('Widget', 9.99, 1);
            expect(result).toEqual(product);
            expect(pool.query.mock.calls[0][1]).toEqual(['Widget', 9.99, 1, [], null, null]);
        });

        it('passes tags, image_url, and business_id to query', async () => {
            const product = { id: 2, name: 'Camera', price: 799, seller_id: 3, tags: ['electronics'], image_url: 'img.jpg', business_id: 5 };
            pool.query.mockResolvedValueOnce({ rows: [product] });

            await createProduct('Camera', 799, 3, ['electronics'], 'img.jpg', 5);
            expect(pool.query.mock.calls[0][1]).toEqual(['Camera', 799, 3, ['electronics'], 'img.jpg', 5]);
        });
    });

    describe('getProducts', () => {
        it('returns all active products when no filters given', async () => {
            const products = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
            pool.query.mockResolvedValueOnce({ rows: products });

            const result = await getProducts();
            expect(result).toEqual(products);
        });

        it('returns empty array when no products exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const result = await getProducts();
            expect(result).toEqual([]);
        });

        it('filters by seller_id when provided', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            await getProducts(7);
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('seller_id');
            expect(pool.query.mock.calls[0][1]).toContain(7);
        });

        it('filters by business_id when provided', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            await getProducts(null, 3);
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('business_id');
        });
    });

    describe('getProduct', () => {
        it('returns the product when found', async () => {
            const product = { id: 1, name: 'Widget', price: 9.99, seller_name: 'Alice' };
            pool.query.mockResolvedValueOnce({ rows: [product] });

            const result = await getProduct(1);
            expect(result).toEqual(product);
        });

        it('throws 404 when product does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getProduct(999)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('propagates database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('db error'));
            await expect(getProduct(1)).rejects.toThrow('db error');
        });
    });

    describe('updateProduct', () => {
        it('throws 404 when product does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(updateProduct(999, { name: 'New' }, 1)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 403 when requester does not own product', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 99 }] });
            await expect(updateProduct(1, { name: 'New' }, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 400 when no valid fields provided', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 1 }] });
            await expect(updateProduct(1, { unknown_field: 'x' }, 1)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('allows admin to update any product', async () => {
            const existing = { seller_id: 99 };
            const updated = { id: 1, name: 'Admin Updated', price: 9.99, seller_id: 99 };
            pool.query
                .mockResolvedValueOnce({ rows: [existing] })
                .mockResolvedValueOnce({ rows: [updated] });

            const result = await updateProduct(1, { name: 'Admin Updated' }, 1, true);
            expect(result).toEqual(updated);
        });

        it('updates product when owner makes request', async () => {
            const existing = { seller_id: 1 };
            const updated = { id: 1, name: 'New Name', price: 9.99, seller_id: 1 };
            pool.query
                .mockResolvedValueOnce({ rows: [existing] })
                .mockResolvedValueOnce({ rows: [updated] });

            const result = await updateProduct(1, { name: 'New Name' }, 1);
            expect(result.name).toBe('New Name');
        });
    });

    describe('deleteProduct', () => {
        it('throws 404 when product does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(deleteProduct(999, 1)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 403 when requester does not own product', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 99 }] });
            await expect(deleteProduct(1, 1, false)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('soft-deletes product and returns it', async () => {
            const product = { id: 1, name: 'Widget', is_active: false };
            pool.query
                .mockResolvedValueOnce({ rows: [{ seller_id: 1 }] })
                .mockResolvedValueOnce({ rows: [product] });

            const result = await deleteProduct(1, 1);
            expect(result.is_active).toBe(false);
        });

        it('allows admin to delete any product', async () => {
            const product = { id: 1, name: 'Widget', is_active: false };
            pool.query
                .mockResolvedValueOnce({ rows: [{ seller_id: 99 }] })
                .mockResolvedValueOnce({ rows: [product] });

            const result = await deleteProduct(1, 1, true);
            expect(result).toEqual(product);
        });
    });
});
