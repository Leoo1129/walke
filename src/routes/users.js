import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { registerLimiter } from '../middleware/rateLimit.js';
import { requestEmailVerification } from '../controllers/authController.js';
import {
    createUser,
    deleteUser,
    getUser,
    getUsers,
    searchUsers,
    toPublicProfile,
    updateUser
} from '../controllers/userController.js';
import { validateBody, validateIdParam } from '../validation/validate.js';
import { registerSchema, updateUserSchema } from '../validation/schemas.js';

const router = Router();
router.param('id', validateIdParam);

router.post('/', registerLimiter, validateBody(registerSchema), async (req, res) => {
    const { name, password, street, city, postcode, country, bio, email } = req.body;
    const user = await createUser(name, password, street, city, postcode, country, bio, email);
    await requestEmailVerification(user.id, email);
    return res.status(201).json({ message: 'Account created. Please check your email to verify your address.' });
});

// Searching by name is available to any signed-in user (e.g. inviting business members);
// the full user list, which includes addresses, is admin-only.
router.get('/', requireAuth, async (req, res) => {
    const { name } = req.query;
    if (name) {
        const result = await searchUsers(name);
        return res.status(200).json(result);
    }
    if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const result = await getUsers();
    return res.status(200).json(result);
});

router.get('/:id', optionalAuth, async (req, res) => {
    const { id } = req.params;
    const result = await getUser(id);
    const canSeePrivate = req.user && (req.user.is_admin || req.user.id === parseInt(id));
    return res.status(200).json(canSeePrivate ? result : toPublicProfile(result));
});

router.patch('/:id', requireAuth, validateBody(updateUserSchema), async (req, res) => {
    const { id } = req.params;

    if (!req.user.is_admin && req.user.id !== parseInt(id)) {
        return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const { email, ...otherFields } = req.body;

    let result;
    if (Object.keys(otherFields).length > 0) {
        result = await updateUser(id, otherFields);
    } else {
        result = await getUser(id);
    }

    if (email !== undefined) {
        await requestEmailVerification(parseInt(id), email);
        return res.status(200).json({ ...result, emailVerificationSent: true });
    }

    return res.status(200).json(result);
});

router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    if (!req.user.is_admin && req.user.id !== parseInt(id)) {
        return res.status(403).json({ error: 'You can only delete your own account' });
    }

    const result = await deleteUser(id);
    return res.status(200).json(result);
});

export default router;
