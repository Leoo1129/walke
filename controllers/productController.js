import * as ProductModel from '../models/productModel.js';

export async function createProduct(req, res) {
    const { name, price, seller_id, tags } = req.body;
    if (!name || price == null || !seller_id) {
        return res.status(400).json({ error: 'name, price, and seller_id are required' });
    }
    try {
        const product = await ProductModel.createProduct(name, price, seller_id, tags);
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getProducts(_req, res) {
    try {
        const products = await ProductModel.getProducts();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getProduct(req, res) {
    const { id } = req.params;
    try {
        const product = await ProductModel.getProductById(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateProduct(req, res) {
    const { id } = req.params;
    try {
        const product = await ProductModel.updateProduct(id, req.body);
        if (!product) return res.status(404).json({ error: 'Product not found or no valid fields to update' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteProduct(req, res) {
    const { id } = req.params;
    try {
        const product = await ProductModel.deleteProduct(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
