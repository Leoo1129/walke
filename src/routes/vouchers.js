import { Router } from 'express';
import { requireVerified } from '../middleware/auth.js';
import {
    createVoucher,
    deleteVoucher,
    getVoucher,
    getVouchers,
    updateVoucher
} from '../controllers/voucherController.js';
import { validateBody, validateIdParam } from '../validation/validate.js';
import { createVoucherSchema } from '../validation/schemas.js';

const router = Router();
router.param('id', validateIdParam);

router.post('/', requireVerified, validateBody(createVoucherSchema), async (req, res) => {
    const { name, discount, expiry, max_uses, business_id } = req.body;
    const result = await createVoucher(name, discount, expiry, max_uses, business_id, req.user.id, req.user.is_admin);
    return res.status(201).json(result);
});

router.get('/', async (req, res) => {
    const result = await getVouchers();
    return res.status(200).json(result);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const result = await getVoucher(id);
    return res.status(200).json(result);
});

router.patch('/:id', requireVerified, async (req, res) => {
    const { id } = req.params;
    const result = await updateVoucher(id, req.body, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

router.delete('/:id', requireVerified, async (req, res) => {
    const { id } = req.params;
    const result = await deleteVoucher(id, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

export default router;
