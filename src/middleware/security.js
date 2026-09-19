import helmet from 'helmet';
import cors from 'cors';
import process from 'process';
import { isProduction } from '../utils/env.js';

// Security headers. The CSP allows only the third parties the frontend actually uses:
// Stripe (card elements + API), Google Fonts (storefront themes) and the exchange-rate API.
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: ['\'self\'', 'https://js.stripe.com'],
            styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
            fontSrc: ['\'self\'', 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ['\'self\'', 'data:', 'blob:', 'https:'],
            connectSrc: ['\'self\'', 'https://api.stripe.com', 'https://open.er-api.com'],
            frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
        },
    },
    // Uploaded images are embedded by the frontend, which may run on another origin in development.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// CORS_ORIGINS is a comma-separated allowlist, e.g. "https://walke.app,https://admin.walke.app".
// Without it every origin is allowed in development, and only same-origin requests in production.
export function corsPolicy() {
    const allowlist = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);

    if (allowlist.length === 0) {
        return cors({ origin: !isProduction });
    }
    return cors({ origin: allowlist });
}

// Log method, path, status and duration once each response has been sent.
export function requestLogger(req, res, next) {
    if (process.env.NODE_ENV === 'test') return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
    });
    next();
}
