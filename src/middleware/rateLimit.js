import { rateLimit } from 'express-rate-limit';
import process from 'process';

const MINUTE = 60 * 1000;

// Build a per-IP limiter for sensitive endpoints. Disabled under the test runner so
// suites that hit the same route many times are unaffected (pass enabled: true to test it).
export function createLimiter({ windowMs, limit, message, enabled = process.env.NODE_ENV !== 'test' }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        skip: () => !enabled,
        handler: (req, res) => res.status(429).json({ error: message }),
    });
}

// Brute-forcing passwords.
export const loginLimiter = createLimiter({
    windowMs: 15 * MINUTE,
    limit: 10,
    message: 'Too many login attempts, please try again in 15 minutes',
});

// Mass account creation.
export const registerLimiter = createLimiter({
    windowMs: 60 * MINUTE,
    limit: 5,
    message: 'Too many accounts created from this IP, please try again later',
});

// Email-sending and token-guessing endpoints (password reset, verification).
// A factory so each route keeps its own counter.
export const emailLimiter = () => createLimiter({
    windowMs: 15 * MINUTE,
    limit: 5,
    message: 'Too many requests, please try again in 15 minutes',
});
