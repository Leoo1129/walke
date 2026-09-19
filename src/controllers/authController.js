import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/env.js';
import pool from '../database/database.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/mailer.js';

const JWT_SECRET = getJwtSecret();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

export async function requestEmailVerification(userId, email) {
    const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
    );
    if (existing.length > 0) {
        const err = new Error('Email address is already in use');
        err.statusCode = 409;
        throw err;
    }

    await pool.query(
        'DELETE FROM email_tokens WHERE user_id = $1 AND type = \'verify\'',
        [userId]
    );

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
        'INSERT INTO email_tokens (user_id, token, email, type, expires_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, token, email, 'verify', expiresAt]
    );

    await sendVerificationEmail(email, token);
}

export async function verifyEmail(token) {
    const { rows: [row] } = await pool.query(
        'SELECT * FROM email_tokens WHERE token = $1 AND type = \'verify\' AND expires_at > NOW()',
        [token]
    );

    if (!row) {
        const err = new Error('Invalid or expired verification link');
        err.statusCode = 400;
        throw err;
    }

    const { rows: [user] } = await pool.query(
        'UPDATE users SET email = $1, email_verified = TRUE WHERE id = $2 RETURNING id, name, is_admin',
        [row.email, row.user_id]
    );

    await pool.query('DELETE FROM email_tokens WHERE id = $1', [row.id]);

    const newToken = jwt.sign(
        { id: user.id, name: user.name, is_admin: user.is_admin, email_verified: true },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    return { token: newToken, message: 'Email verified successfully' };
}

export async function requestPasswordReset(email) {
    const { rows: [user] } = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND is_active = TRUE',
        [email]
    );

    if (!user) return;

    await pool.query(
        'DELETE FROM email_tokens WHERE user_id = $1 AND type = \'reset\'',
        [user.id]
    );

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
        'INSERT INTO email_tokens (user_id, token, email, type, expires_at) VALUES ($1, $2, $3, $4, $5)',
        [user.id, token, email, 'reset', expiresAt]
    );

    await sendPasswordResetEmail(email, token);
}

export async function validateResetToken(token) {
    const { rows: [row] } = await pool.query(
        'SELECT id FROM email_tokens WHERE token = $1 AND type = \'reset\' AND expires_at > NOW()',
        [token]
    );

    if (!row) {
        const err = new Error('Invalid or expired reset link');
        err.statusCode = 400;
        throw err;
    }

    return { valid: true };
}

export async function resetPassword(token, password) {
    if (!password || password.length < 6) {
        const err = new Error('Password must be at least 6 characters');
        err.statusCode = 400;
        throw err;
    }

    const { rows: [row] } = await pool.query(
        'SELECT * FROM email_tokens WHERE token = $1 AND type = \'reset\' AND expires_at > NOW()',
        [token]
    );

    if (!row) {
        const err = new Error('Invalid or expired reset link');
        err.statusCode = 400;
        throw err;
    }

    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [password_hash, row.user_id]
    );

    await pool.query('DELETE FROM email_tokens WHERE id = $1', [row.id]);

    return { message: 'Password reset successfully' };
}
