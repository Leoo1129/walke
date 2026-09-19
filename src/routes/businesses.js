import { Router } from 'express';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import {
    createBusiness,
    deleteBusiness,
    getBusiness,
    getBusinesses,
    getMembers,
    getStorefront,
    inviteMember,
    removeMember,
    updateBusiness,
    updateMemberRole,
    upsertStorefront
} from '../controllers/businessController.js';
import { validateBody, validateIdParam } from '../validation/validate.js';
import { createBusinessSchema } from '../validation/schemas.js';

const router = Router();
router.param('id', validateIdParam);
router.param('user_id', validateIdParam);

router.post('/', requireVerified, validateBody(createBusinessSchema), async (req, res) => {
    const { name, bio, logo_url, abn } = req.body;
    const result = await createBusiness(name, bio, logo_url, req.user.id, abn);
    return res.status(201).json(result);
});

router.get('/', async (req, res) => {
    const { member_id } = req.query;
    const result = await getBusinesses(member_id || null);
    return res.status(200).json(result);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const result = await getBusiness(id);
    return res.status(200).json(result);
});

router.patch('/:id', requireVerified, async (req, res) => {
    const { id } = req.params;
    const result = await updateBusiness(id, req.body, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

router.delete('/:id', requireVerified, async (req, res) => {
    const { id } = req.params;
    const result = await deleteBusiness(id, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

router.get('/:id/members', requireAuth, async (req, res) => {
    const { id } = req.params;
    const result = await getMembers(id);
    return res.status(200).json(result);
});

router.post('/:id/members', requireVerified, async (req, res) => {
    const { id } = req.params;
    const { user_id, role } = req.body;
    const result = await inviteMember(id, user_id, role, req.user.id, req.user.is_admin);
    return res.status(201).json(result);
});

router.patch('/:id/members/:user_id', requireVerified, async (req, res) => {
    const { id, user_id } = req.params;
    const { role } = req.body;
    const result = await updateMemberRole(id, user_id, role, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

router.delete('/:id/members/:user_id', requireVerified, async (req, res) => {
    const { id, user_id } = req.params;
    const result = await removeMember(id, user_id, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

router.get('/:id/storefront', async (req, res) => {
    const { id } = req.params;
    const result = await getStorefront(id);
    return res.status(200).json(result);
});

router.patch('/:id/storefront', requireAuth, async (req, res) => {
    const { id } = req.params;
    const result = await upsertStorefront(id, req.body, req.user.id, req.user.is_admin);
    return res.status(200).json(result);
});

export default router;
