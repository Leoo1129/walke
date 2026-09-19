import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/env.js';

const JWT_SECRET = getJwtSecret();

export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.slice(7);
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Attach req.user when a valid token is sent, but let anonymous requests through.
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
        } catch {
            // An invalid token is treated the same as no token
        }
    }
    next();
}

export function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}

export function requireVerified(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.email_verified === false) {
            return res.status(403).json({ error: 'Please verify your email address before performing this action' });
        }
        next();
    });
}
