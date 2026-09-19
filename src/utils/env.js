import process from 'process';

const DEV_JWT_SECRET = 'dev-secret-change-in-production';

export const isProduction = process.env.NODE_ENV === 'production';

// Refuse to sign tokens with a well-known fallback secret in production.
export function getJwtSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (isProduction) {
        throw new Error('JWT_SECRET must be set when NODE_ENV=production');
    }
    return DEV_JWT_SECRET;
}
