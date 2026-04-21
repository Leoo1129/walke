import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

vi.mock('../../src/services/mailer.js', () => ({
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn()
    }
}));

import { verifyEmail, requestPasswordReset, validateResetToken, resetPassword } from '../../src/controllers/authController.js';
import pool from '../../src/database/database.js';
import bcrypt from 'bcrypt';

describe('authController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('verifyEmail', () => {
        it('throws 400 for invalid or expired token', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(verifyEmail('bad-token')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('returns new JWT and success message on valid token', async () => {
            const row = { id: 1, user_id: 1, email: 'alice@example.com' };
            const user = { id: 1, name: 'alice', is_admin: false };
            pool.query
                .mockResolvedValueOnce({ rows: [row] })
                .mockResolvedValueOnce({ rows: [user] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await verifyEmail('valid-token');
            expect(result).toHaveProperty('token');
            expect(typeof result.token).toBe('string');
            expect(result.message).toBe('Email verified successfully');
        });

        it('deletes the token after verification', async () => {
            const row = { id: 5, user_id: 1, email: 'alice@example.com' };
            const user = { id: 1, name: 'alice', is_admin: false };
            pool.query
                .mockResolvedValueOnce({ rows: [row] })
                .mockResolvedValueOnce({ rows: [user] })
                .mockResolvedValueOnce({ rows: [] });

            await verifyEmail('valid-token');
            const deleteCall = pool.query.mock.calls.find(c => c[0].includes('DELETE FROM email_tokens'));
            expect(deleteCall).toBeDefined();
            expect(deleteCall[1]).toContain(5);
        });
    });

    describe('requestPasswordReset', () => {
        it('returns silently when email is not registered (prevents user enumeration)', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const result = await requestPasswordReset('unknown@example.com');
            expect(result).toBeUndefined();
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('creates a reset token and sends email for registered user', async () => {
            const user = { id: 1 };
            pool.query
                .mockResolvedValueOnce({ rows: [user] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const { sendPasswordResetEmail } = await import('../../src/services/mailer.js');
            await requestPasswordReset('alice@example.com');

            expect(pool.query).toHaveBeenCalledTimes(3);
            expect(sendPasswordResetEmail).toHaveBeenCalledWith('alice@example.com', expect.any(String));
        });

        it('deletes old reset tokens before creating new one', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await requestPasswordReset('alice@example.com');
            const deleteCall = pool.query.mock.calls.find(c => c[0].includes('DELETE FROM email_tokens') && c[0].includes('\'reset\''));
            expect(deleteCall).toBeDefined();
        });
    });

    describe('validateResetToken', () => {
        it('throws 400 for invalid or expired token', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(validateResetToken('bad-token')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('returns { valid: true } for a valid token', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const result = await validateResetToken('good-token');
            expect(result).toEqual({ valid: true });
        });
    });

    describe('resetPassword', () => {
        it('throws 400 when password is too short', async () => {
            await expect(resetPassword('token', 'abc')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 when password is empty', async () => {
            await expect(resetPassword('token', '')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 for invalid or expired reset token', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(resetPassword('bad-token', 'newpassword')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('hashes new password and updates user', async () => {
            const row = { id: 1, user_id: 1 };
            pool.query
                .mockResolvedValueOnce({ rows: [row] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });
            bcrypt.hash.mockResolvedValueOnce('new_hashed_password');

            const result = await resetPassword('valid-token', 'mynewpassword');
            expect(bcrypt.hash).toHaveBeenCalledWith('mynewpassword', 10);
            expect(result.message).toBe('Password reset successfully');
        });

        it('deletes the token after resetting password', async () => {
            const row = { id: 7, user_id: 1 };
            pool.query
                .mockResolvedValueOnce({ rows: [row] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await resetPassword('valid-token', 'mynewpassword');
            const deleteCall = pool.query.mock.calls.find(c => c[0].includes('DELETE FROM email_tokens'));
            expect(deleteCall[1]).toContain(7);
        });
    });
});
