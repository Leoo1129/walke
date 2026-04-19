import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

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
