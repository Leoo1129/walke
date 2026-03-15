import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/productModel.js', () => ({
    createProduct: vi.fn(),
    getProducts: vi.fn(),
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn()
}));

import * as ProductModel from '../../models/productModel.js';
import {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct
} from '../../controllers/productController.js';

const mockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('productController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createProduct', () => {
        it('returns 201 with the created product', async () => {
            const product = { id: 1, name: 'Widget', price: 9.99, seller_id: 1, tags: [] };
            ProductModel.createProduct.mockResolvedValueOnce(product);

            const req = { body: { name: 'Widget', price: 9.99, seller_id: 1 } };
            const res = mockRes();
            await createProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(product);
        });

        it('returns 400 when name is missing', async () => {
            const req = { body: { price: 9.99, seller_id: 1 } };
            const res = mockRes();
            await createProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(ProductModel.createProduct).not.toHaveBeenCalled();
        });

        it('returns 400 when price is missing', async () => {
            const req = { body: { name: 'Widget', seller_id: 1 } };
            const res = mockRes();
            await createProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 when seller_id is missing', async () => {
            const req = { body: { name: 'Widget', price: 9.99 } };
            const res = mockRes();
            await createProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 500 on unexpected error', async () => {
            ProductModel.createProduct.mockRejectedValueOnce(new Error('db error'));

            const req = { body: { name: 'Widget', price: 9.99, seller_id: 1 } };
            const res = mockRes();
            await createProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getProducts', () => {
        it('returns all products with 200', async () => {
            const products = [{ id: 1, name: 'Widget' }];
            ProductModel.getProducts.mockResolvedValueOnce(products);

            const res = mockRes();
            await getProducts({}, res);

            expect(res.json).toHaveBeenCalledWith(products);
        });

        it('returns 500 on unexpected error', async () => {
            ProductModel.getProducts.mockRejectedValueOnce(new Error('db error'));

            const res = mockRes();
            await getProducts({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getProduct', () => {
        it('returns the product when found', async () => {
            const product = { id: 1, name: 'Widget' };
            ProductModel.getProductById.mockResolvedValueOnce(product);

            const req = { params: { id: '1' } };
            const res = mockRes();
            await getProduct(req, res);

            expect(res.json).toHaveBeenCalledWith(product);
        });

        it('returns 404 when product not found', async () => {
            ProductModel.getProductById.mockResolvedValueOnce(null);

            const req = { params: { id: '999' } };
            const res = mockRes();
            await getProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 500 on unexpected error', async () => {
            ProductModel.getProductById.mockRejectedValueOnce(new Error('db error'));

            const req = { params: { id: '1' } };
            const res = mockRes();
            await getProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('updateProduct', () => {
        it('returns the updated product', async () => {
            const product = { id: 1, name: 'Updated', price: 19.99 };
            ProductModel.updateProduct.mockResolvedValueOnce(product);

            const req = { params: { id: '1' }, body: { name: 'Updated' } };
            const res = mockRes();
            await updateProduct(req, res);

            expect(res.json).toHaveBeenCalledWith(product);
        });

        it('returns 404 when product not found or no valid fields', async () => {
            ProductModel.updateProduct.mockResolvedValueOnce(null);

            const req = { params: { id: '999' }, body: { name: 'Ghost' } };
            const res = mockRes();
            await updateProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 500 on unexpected error', async () => {
            ProductModel.updateProduct.mockRejectedValueOnce(new Error('db error'));

            const req = { params: { id: '1' }, body: { name: 'x' } };
            const res = mockRes();
            await updateProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteProduct', () => {
        it('returns the deleted product', async () => {
            const product = { id: 1, name: 'Widget' };
            ProductModel.deleteProduct.mockResolvedValueOnce(product);

            const req = { params: { id: '1' } };
            const res = mockRes();
            await deleteProduct(req, res);

            expect(res.json).toHaveBeenCalledWith(product);
        });

        it('returns 404 when product not found', async () => {
            ProductModel.deleteProduct.mockResolvedValueOnce(null);

            const req = { params: { id: '999' } };
            const res = mockRes();
            await deleteProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 500 on unexpected error', async () => {
            ProductModel.deleteProduct.mockRejectedValueOnce(new Error('db error'));

            const req = { params: { id: '1' } };
            const res = mockRes();
            await deleteProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});