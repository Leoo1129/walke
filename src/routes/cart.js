import { Router } from 'express';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import {
    addToCart,
    getCart,
    removeFromCart,
    updateCartItem
} from '../controllers/cartController.js';

const router = Router();

router.post('/', requireVerified, async (req, res) => {
    const { product_id, quantity } = req.body;
    const result = await addToCart(req.user.id, product_id, quantity);
    return res.status(201).json(result);
});

router.get('/', requireAuth, async (req, res) => {
    const result = await getCart(req.user.id);
    return res.status(200).json(result);
});

router.patch('/:product_id', requireAuth, async (req, res) => {
    const { product_id } = req.params;
    const { quantity } = req.body;
    const result = await updateCartItem(req.user.id, product_id, quantity);
    return res.status(200).json(result);
});

router.delete('/:product_id', requireAuth, async (req, res) => {
    const { product_id } = req.params;
    const result = await removeFromCart(req.user.id, product_id);
    return res.status(200).json(result);
});

export default router;
