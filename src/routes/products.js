import { Router } from 'express';
import { requireVerified } from '../middleware/auth.js';
import { assertBusinessRole } from '../controllers/businessController.js';
import {
    createProduct,
    deleteProduct,
    getProduct,
    getProducts,
    updateProduct
} from '../controllers/productController.js';
import { validateBody, validateIdParam } from '../validation/validate.js';
import { createProductSchema, updateProductSchema } from '../validation/schemas.js';

const router = Router();
router.param('id', validateIdParam);

router.post('/', requireVerified, validateBody(createProductSchema), async (req, res) => {
    const { name, price, tags, image_url, business_id } = req.body;
    // Products are always listed under the caller; only admins may list on behalf of someone else
    const seller_id = req.user.is_admin && req.body.seller_id ? req.body.seller_id : req.user.id;
    if (business_id && !req.user.is_admin) {
        await assertBusinessRole(business_id, req.user.id, 'editor');
    }
    const result = await createProduct(name, price, seller_id, tags, image_url, business_id);
    return res.status(201).json(result);
});

router.get('/', async (req, res) => {
    const { seller_id, business_id } = req.query;
    const result = await getProducts(seller_id || null, business_id || null);
    return res.status(200).json(result);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const result = await getProduct(id);
    return res.status(200).json(result);
});

router.patch('/:id', requireVerified, validateBody(updateProductSchema), async (req, res) => {
    const { id } = req.params;
    const result = await updateProduct(id, req.body, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

router.delete('/:id', requireVerified, async (req, res) => {
    const { id } = req.params;
    const result = await deleteProduct(id, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

export default router;
