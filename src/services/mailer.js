import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM = process.env.SMTP_FROM || `"Walke" <${process.env.SMTP_USER}>`;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export async function sendVerificationEmail(email, token) {
    const link = `${APP_URL}/verify-email?token=${token}`;
    await transporter.sendMail({
        from: FROM,
        to: email,
        subject: 'Verify your Walke email address',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="margin-bottom:8px">Welcome to Walke</h2>
                <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
                <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:4px">Verify Email</a>
                <p style="color:#888;font-size:13px">Or copy this link: ${link}</p>
                <p style="color:#888;font-size:13px">If you did not create a Walke account, you can ignore this email.</p>
            </div>
        `,
    });
}

export async function sendXmlEmail(to, xml, subject, filename) {
    await transporter.sendMail({
        from: FROM,
        to,
        subject,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="margin-bottom:8px">Your Walke XML Document</h2>
                <p>Your requested XML document (<strong>${filename}</strong>) is attached to this email.</p>
                <p style="color:#888;font-size:13px">This document conforms to the UBL 2.1 standard.</p>
            </div>
        `,
        attachments: [{ filename, content: xml, contentType: 'application/xml' }],
    });
}

export async function sendPasswordResetEmail(email, token) {
    const link = `${APP_URL}/reset-password?token=${token}`;
    await transporter.sendMail({
        from: FROM,
        to: email,
        subject: 'Reset your Walke password',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="margin-bottom:8px">Password Reset</h2>
                <p>Click the button below to reset your password. This link expires in <strong>5 minutes</strong>.</p>
                <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:4px">Reset Password</a>
                <p style="color:#888;font-size:13px">Or copy this link: ${link}</p>
                <p style="color:#888;font-size:13px">If you did not request a password reset, you can safely ignore this email.</p>
            </div>
        `,
    });
}
