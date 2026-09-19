import { z } from './validate.js';

// Blank form fields arrive as '' from the React client; treat them as "not provided".
const blankToNull = value => (typeof value === 'string' && value.trim() === '' ? null : value);
const optionalText = max => z.preprocess(blankToNull, z.string().trim().max(max).nullish());
const optionalId = z.preprocess(blankToNull, z.coerce.number().int().positive().nullish());

const id = z.coerce.number().int().positive();
const email = z.string().trim().pipe(z.email('must be a valid email address'));
export const password = z.string()
    .min(8, 'must be at least 8 characters')
    .max(128, 'must be at most 128 characters');

// ── Auth & users ──
export const loginSchema = z.object({
    name: z.string().trim().min(1, 'is required'),
    password: z.string().min(1, 'is required'),
});

export const registerSchema = z.object({
    name: z.string().trim().min(1, 'is required').max(50),
    email,
    password,
    street: optionalText(200),
    city: optionalText(100),
    postcode: optionalText(20),
    country: optionalText(100),
    bio: optionalText(1000),
});

export const updateUserSchema = z.object({
    name: z.string().trim().min(1).max(50).optional(),
    email: email.optional(),
    street: optionalText(200),
    city: optionalText(100),
    postcode: optionalText(20),
    country: optionalText(100),
    bio: optionalText(1000),
    logo_url: optionalText(500),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'is required'),
    password,
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'is required'),
});

// ── Products ──
const tags = z.array(z.string().trim().min(1).max(50)).max(20);

export const createProductSchema = z.object({
    name: z.string().trim().min(1, 'is required').max(200),
    price: z.coerce.number().nonnegative().max(1_000_000),
    seller_id: optionalId,
    tags: tags.optional().default([]),
    image_url: optionalText(500),
    business_id: optionalId,
});

export const updateProductSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    price: z.coerce.number().nonnegative().max(1_000_000).optional(),
    tags: tags.optional(),
    image_url: optionalText(500),
});

// ── Cart & orders ──
export const addToCartSchema = z.object({
    product_id: id,
    quantity: z.coerce.number().int().min(1, 'must be at least 1').max(1000),
});

export const updateCartSchema = z.object({
    quantity: z.coerce.number().int().min(1, 'must be at least 1').max(1000),
});

export const createOrderSchema = z.object({
    voucher_code: optionalText(50),
});

export const chatMessageSchema = z.object({
    message: z.string().trim().min(1, 'cannot be empty').max(2000),
});

export const xmlEmailSchema = z.object({
    type: z.enum(['order', 'response', 'cancel'], { error: 'must be order, response, or cancel' }),
    email,
});

// ── Vouchers ──
export const createVoucherSchema = z.object({
    name: z.string().trim().min(1, 'is required').max(50),
    discount: z.coerce.number().positive('must be greater than 0'),
    expiry: z.preprocess(blankToNull, z.iso.date().or(z.iso.datetime()).nullish()),
    max_uses: optionalId,
    business_id: optionalId,
});

// ── Businesses ──
export const createBusinessSchema = z.object({
    name: z.string().trim().min(1, 'is required').max(100),
    bio: optionalText(1000),
    logo_url: optionalText(500),
    abn: optionalText(20),
});
