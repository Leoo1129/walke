import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));

delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

const { isMailConfigured, sendVerificationEmail, sendPasswordResetEmail, sendXmlEmail } = await import('../../src/services/mailer.js');
const nodemailer = (await import('nodemailer')).default;

describe('mailer without SMTP credentials', () => {
    afterEach(() => vi.restoreAllMocks());

    it('is reported as not configured and never creates a transport', () => {
        expect(isMailConfigured).toBe(false);
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('lets registration continue and logs the verification link for local testing', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        await expect(sendVerificationEmail('a@b.com', 'tok123')).resolves.toBeUndefined();
        expect(log.mock.calls[0][0]).toContain('/verify-email?token=tok123');
    });

    it('lets password reset continue', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        await expect(sendPasswordResetEmail('a@b.com', 'tok')).resolves.toBeUndefined();
    });

    it('fails XML delivery with a clear 503', async () => {
        await expect(sendXmlEmail('a@b.com', '<xml/>', 'Order', 'o.xml')).rejects.toMatchObject({ statusCode: 503 });
    });
});
