import { Router } from 'express';
import { emailLimiter, loginLimiter } from '../middleware/rateLimit.js';
import {
    requestPasswordReset,
    resetPassword,
    validateResetToken,
    verifyEmail
} from '../controllers/authController.js';
import { login } from '../controllers/userController.js';

const router = Router();

router.post('/login', loginLimiter, async (req, res) => {
    const { name, password } = req.body;
    const result = await login(name, password);
    return res.status(200).json(result);
});

router.post('/auth/verify-email', emailLimiter(), async (req, res) => {
    const { token } = req.body;
    const result = await verifyEmail(token);
    return res.status(200).json(result);
});

router.post('/auth/forgot-password', emailLimiter(), async (req, res) => {
    const { email } = req.body;
    await requestPasswordReset(email);
    return res.status(200).json({ message: 'If that email is registered, a reset link has been sent' });
});

router.get('/auth/reset-password/:token', async (req, res) => {
    const result = await validateResetToken(req.params.token);
    return res.status(200).json(result);
});

router.post('/auth/reset-password', emailLimiter(), async (req, res) => {
    const { token, password } = req.body;
    const result = await resetPassword(token, password);
    return res.status(200).json(result);
});

export default router;
