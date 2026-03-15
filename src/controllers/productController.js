import * as ProductModel from '../models/productModel.js';
class InputError extends Error {}

export async function createProduct(name, price, seller_id, tags) {
    if (!name || price == null || !seller_id)
        throw new InputError('name, price, and seller_id are required');

    const product = await ProductModel.createProduct(name, price, seller_id, tags);
    
    if (!product) {
        const error = new Error('No products found');
        error.statusCode = 404;
        throw error;
    }

    return product;
}

export async function getProducts() {
    const products = await ProductModel.getAll();

    if (!products || products.length === 0) {
        const error = new Error('No products found');
        error.statusCode = 404;
        throw error;
    }

    return products;
}

export async function getProduct(id) {
    const product = await ProductModel.getProductById(id);

    if (!product) {
        const error = new Error('Poduct not found');
        error.statusCode = 404;
        throw error;
    }

    return product;
}

export async function updateProduct(id) {

    const product = await ProductModel.updateProduct(id);
    if (!product) {
        const error = new Error('Product not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    return product;
}

export async function deleteProduct(id) {
    
    const product = await ProductModel.deleteProduct(id);
    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
    }

    return product;
}
