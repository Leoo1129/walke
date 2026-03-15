import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn() }
}));

import pool from '../../src/database/database.js'

import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} from '../../src/models/productModel.js';

describe('productModel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createProduct', () => {
        it('inserts a product and returns it', async () => {
            const mockProduct = { id: 1, name: 'Widget', price: 9.99, seller_id: 1, tags: ['gadget'] };
            pool.query.mockResolvedValueOnce({ rows: [mockProduct] });

            const result = await createProduct('Widget', 9.99, 1, ['gadget']);

            expect(result).toEqual(mockProduct);
            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO products (name, price, seller_id, tags) VALUES ($1, $2, $3, $4) RETURNING *',
                ['Widget', 9.99, 1, ['gadget']]
            );
        });

        it('defaults tags to empty array when not provided', async () => {
            const mockProduct = { id: 2, name: 'Gadget', price: 4.99, seller_id: 1, tags: [] };
            pool.query.mockResolvedValueOnce({ rows: [mockProduct] });

            await createProduct('Gadget', 4.99, 1);

            expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['Gadget', 4.99, 1, []]);
        });
    });

    describe('getProducts', () => {
        it('returns all products', async () => {
            const mockProducts = [
                { id: 1, name: 'Widget', price: 9.99 },
                { id: 2, name: 'Gadget', price: 4.99 }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockProducts });

            const result = await getProducts();

            expect(result).toEqual(mockProducts);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM products');
        });

        it('returns empty array when no products exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const result = await getProducts();

            expect(result).toEqual([]);
        });
    });

    describe('getProductById', () => {
        it('returns the product when found', async () => {
            const mockProduct = { id: 1, name: 'Widget', price: 9.99 };
            pool.query.mockResolvedValueOnce({ rows: [mockProduct] });

            const result = await getProductById(1);

            expect(result).toEqual(mockProduct);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM products WHERE id = $1', [1]);
        });

        it('returns null when not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const result = await getProductById(999);

            expect(result).toBeNull();
        });
    });

    describe('updateProduct', () => {
        it('updates allowed fields and returns the updated product', async () => {
            const mockProduct = { id: 1, name: 'Updated', price: 19.99, tags: [] };
            pool.query.mockResolvedValueOnce({ rows: [mockProduct] });

            const result = await updateProduct(1, { name: 'Updated', price: 19.99 });

            expect(result).toEqual(mockProduct);
        });

        it('returns null without querying when no allowed fields are provided', async () => {
            const result = await updateProduct(1, { seller_id: 99 });

            expect(result).toBeNull();
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('ignores disallowed fields like seller_id', async () => {
            const mockProduct = { id: 1, name: 'Widget', price: 9.99, tags: [] };
            pool.query.mockResolvedValueOnce({ rows: [mockProduct] });

            await updateProduct(1, { name: 'Widget', seller_id: 99 });

            const queryValues = pool.query.mock.calls[0][1];
            expect(queryValues).not.toContain(99);
        });

        it('returns null when product not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const result = await updateProduct(999, { name: 'Ghost' });

            expect(result).toBeNull();
        });
    });

    describe('deleteProduct', () => {
        it('deletes and returns the deleted product', async () => {
            const mockProduct = { id: 1, name: 'Widget', price: 9.99 };
            pool.query.mockResolvedValueOnce({ rows: [mockProduct] });

            const result = await deleteProduct(1);

            expect(result).toEqual(mockProduct);
            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM products WHERE id = $1 RETURNING *',
                [1]
            );
        });

        it('returns null when product not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const result = await deleteProduct(999);

            expect(result).toBeNull();
        });
    });
});