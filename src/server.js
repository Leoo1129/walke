// npm imports
import 'dotenv/config';
import express, { json } from 'express';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import multer from 'multer';
const config = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));

// controller imports
import {
    createOrder,
    getOrder,
    getOrderDetails,
    getOrders,
    updateOrder,
    deleteOrder,
    confirmPayment
} from './controllers/orderController.js';

import {
    createProduct,
    getProduct,
    getProducts,
    updateProduct,
    deleteProduct
} from './controllers/productController.js';

import {
    login,
    createUser,
    getUser,
    getUsers,
    searchUsers,
    updateUser,
    deleteUser,
    toPublicProfile
} from './controllers/userController.js';

import { requireAuth, requireAdmin, requireVerified, optionalAuth } from './middleware/auth.js';
import { requireOrderAccess } from './middleware/orderAccess.js';
import {
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    validateResetToken,
    resetPassword,
} from './controllers/authController.js';

import {
    createVoucher,
    getVoucher,
    getVouchers,
    updateVoucher,
    deleteVoucher
} from './controllers/voucherController.js';

import {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart
} from './controllers/cartController.js';

import {
    createOrderResponse,
    getOrderResponseDetails,
    getAllSellerResponses
} from './controllers/orderResponseController.js';

import {
    createOrderCancellation,
    getOrderCancellationDetails
} from './controllers/orderCancellationController.js';

import {
    createBusiness,
    getBusinesses,
    getBusiness,
    updateBusiness,
    deleteBusiness,
    getMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
    getStorefront,
    upsertStorefront,
    assertBusinessRole
} from './controllers/businessController.js';

import { processAndSaveImage } from './controllers/imageController.js';

import {
    wantsXml,
    orderToXml,
    orderResponseToXml,
    orderCancellationToXml
} from './controllers/XMLController.js';

import { handleErrors } from './handler.js';
import { securityHeaders, corsPolicy, requestLogger } from './middleware/security.js';
import { loginLimiter, registerLimiter, emailLimiter } from './middleware/rateLimit.js';
import { sendXmlEmail } from './services/mailer.js';

import {
    getOrCreateChat,
    getChat,
    getOrderChats,
    sendMessage,
    finalizeChat
} from './controllers/chatController.js';

// Set up the web application
const app = express();
app.disable('x-powered-by');
// Behind a reverse proxy (e.g. Render, Nginx) set TRUST_PROXY=1 so rate limits see the real client IP
if (process.env.TRUST_PROXY) app.set('trust proxy', parseInt(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.use(requestLogger);
app.use(securityHeaders);
app.use(corsPolicy());
app.use(json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const file = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
app.use('/docs', sui.serve, sui.setup(YAML.parse(file), {
    swaggerOptions: { docExpansion: 'full' }
}));

// Strip /api prefix so the production frontend's /api/* calls hit existing routes
app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) req.url = req.url.slice(4);
    next();
});

const PORT = parseInt(process.env.PORT || config.port);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});


// ------------------------------------------------------------------------------------------------------
// ------------------------------ Sever functionalities and API below here ------------------------------
// ------------------------------------------------------------------------------------------------------

// ---------------------------------- Auth ----------------------------------
app.post('/login', loginLimiter, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, password } = req.body;
        const result = await login(name, password);
        return res.status(200).json(result);
    });
});

app.post('/auth/verify-email', emailLimiter(), async (req, res) => {
    return await handleErrors(res, async () => {
        const { token } = req.body;
        const result = await verifyEmail(token);
        return res.status(200).json(result);
    });
});

app.post('/auth/forgot-password', emailLimiter(), async (req, res) => {
    return await handleErrors(res, async () => {
        const { email } = req.body;
        await requestPasswordReset(email);
        return res.status(200).json({ message: 'If that email is registered, a reset link has been sent' });
    });
});

app.get('/auth/reset-password/:token', async (req, res) => {
    return await handleErrors(res, async () => {
        const result = await validateResetToken(req.params.token);
        return res.status(200).json(result);
    });
});

app.post('/auth/reset-password', emailLimiter(), async (req, res) => {
    return await handleErrors(res, async () => {
        const { token, password } = req.body;
        const result = await resetPassword(token, password);
        return res.status(200).json(result);
    });
});

// ---------------------------------- User Controller ----------------------------------
app.post('/users', registerLimiter, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, password, street, city, postcode, country, bio, email } = req.body;
        const user = await createUser(name, password, street, city, postcode, country, bio, email);
        await requestEmailVerification(user.id, email);
        return res.status(201).json({ message: 'Account created. Please check your email to verify your address.' });
    });
});

// Searching by name is available to any signed-in user (e.g. inviting business members);
// the full user list, which includes addresses, is admin-only.
app.get('/users', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name } = req.query;
        if (name) {
            const result = await searchUsers(name);
            return res.status(200).json(result);
        }
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await getUsers();
        return res.status(200).json(result);
    });
});

app.get('/users/:id', optionalAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getUser(id);
        const canSeePrivate = req.user && (req.user.is_admin || req.user.id === parseInt(id));
        return res.status(200).json(canSeePrivate ? result : toPublicProfile(result));
    });
});

app.patch('/users/:id', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;

        if (!req.user.is_admin && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'You can only update your own profile' });
        }

        const { email, ...otherFields } = req.body;

        let result;
        if (Object.keys(otherFields).length > 0) {
            result = await updateUser(id, otherFields);
        } else {
            result = await getUser(id);
        }

        if (email !== undefined) {
            await requestEmailVerification(parseInt(id), email);
            return res.status(200).json({ ...result, emailVerificationSent: true });
        }

        return res.status(200).json(result);
    });
});

app.delete('/users/:id', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;

        if (!req.user.is_admin && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'You can only delete your own account' });
        }

        const result = await deleteUser(id);
        return res.status(200).json(result);
    });
});

// ── Business Controller ──
app.post('/businesses', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, bio, logo_url, abn } = req.body;
        const result = await createBusiness(name, bio, logo_url, req.user.id, abn);
        return res.status(201).json(result);
    });
});

app.get('/businesses', async (req, res) => {
    return await handleErrors(res, async () => {
        const { member_id } = req.query;
        const result = await getBusinesses(member_id || null);
        return res.status(200).json(result);
    });
});

app.get('/businesses/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getBusiness(id);
        return res.status(200).json(result);
    });
});

app.patch('/businesses/:id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateBusiness(id, req.body, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

app.delete('/businesses/:id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteBusiness(id, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

app.get('/businesses/:id/members', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getMembers(id);
        return res.status(200).json(result);
    });
});

app.post('/businesses/:id/members', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const { user_id, role } = req.body;
        const result = await inviteMember(id, user_id, role, req.user.id, req.user.is_admin);
        return res.status(201).json(result);
    });
});

app.patch('/businesses/:id/members/:user_id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id, user_id } = req.params;
        const { role } = req.body;
        const result = await updateMemberRole(id, user_id, role, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

app.delete('/businesses/:id/members/:user_id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id, user_id } = req.params;
        const result = await removeMember(id, user_id, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

app.get('/businesses/:id/storefront', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getStorefront(id);
        return res.status(200).json(result);
    });
});

app.patch('/businesses/:id/storefront', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await upsertStorefront(id, req.body, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

// ── Image Upload ──
app.post('/images', requireVerified, upload.single('image'), async (req, res) => {
    return await handleErrors(res, async () => {
        if (!req.file) {
            const error = new Error('No image file provided');
            error.statusCode = 400;
            throw error;
        }
        const url = await processAndSaveImage(req.file.buffer, req.file.originalname);
        return res.status(201).json({ url });
    });
});

// ---------------------------------- Cart Controller ----------------------------------
app.post('/cart', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { product_id, quantity } = req.body;
        const result = await addToCart(req.user.id, product_id, quantity);
        return res.status(201).json(result);
    });
});

app.get('/cart', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const result = await getCart(req.user.id);
        return res.status(200).json(result);
    });
});

app.patch('/cart/:product_id', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { product_id } = req.params;
        const { quantity } = req.body;
        const result = await updateCartItem(req.user.id, product_id, quantity);
        return res.status(200).json(result);
    });
});

app.delete('/cart/:product_id', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { product_id } = req.params;
        const result = await removeFromCart(req.user.id, product_id);
        return res.status(200).json(result);
    });
});

// ---------------------------------- Order Controller ----------------------------------
app.post('/orders', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { voucher_code } = req.body;
        const { order, items, buyer, sellers, client_secret } = await createOrder(req.user.id, voucher_code);

        if (wantsXml(req)) {
            return res.status(201)
                .set('Content-Type', 'application/xml')
                .send(orderToXml(order, items, buyer, sellers));
        }

        return res.status(201).json({ ...order, items, client_secret });
    });
});

// Admins can list every order; everyone else sees orders they bought, or (with ?seller_id)
// orders containing their own products.
app.get('/orders', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { seller_id } = req.query;

        if (req.user.is_admin) {
            return res.status(200).json(await getOrders(seller_id || null));
        }
        if (seller_id) {
            if (parseInt(seller_id) !== req.user.id) {
                return res.status(403).json({ error: 'You can only view orders for your own products' });
            }
            return res.status(200).json(await getOrders(req.user.id));
        }
        return res.status(200).json(await getOrders(null, req.user.id));
    });
});

app.get('/orders/:id', requireAuth, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        if (wantsXml(req)) {
            const { order, items, buyer, sellers } = await getOrderDetails(id);
            return res.status(200)
                .set('Content-Type', 'application/xml')
                .send(orderToXml(order, items, buyer, sellers));
        }
        const result = await getOrder(id);
        return res.status(200).json(result);
    });
});

app.patch('/orders/:id', requireAdmin, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateOrder(id, req.body);
        return res.status(200).json(result);
    });
});

app.delete('/orders/:id', requireAdmin, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteOrder(id);
        return res.status(200).json(result);
    });
});

app.post('/orders/:id/xml-email', requireAuth, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const { type, email } = req.body;

        if (!email) {
            const error = new Error('email is required');
            error.statusCode = 400;
            throw error;
        }

        let xml, subject, filename;
        if (type === 'order') {
            const { order, items, buyer, sellers } = await getOrderDetails(id);
            xml = orderToXml(order, items, buyer, sellers);
            subject = `Order #${id} — UBL/XML Document`;
            filename = `order-${id}.xml`;
        } else if (type === 'response') {
            const { response, order, items, buyer, seller } = await getOrderResponseDetails(id);
            xml = orderResponseToXml(response, order, items, buyer, seller);
            subject = `Order #${id} Response — UBL/XML Document`;
            filename = `order-${id}-response.xml`;
        } else if (type === 'cancel') {
            const { cancellation, order, buyer, sellers } = await getOrderCancellationDetails(id);
            xml = orderCancellationToXml(cancellation, order, buyer, sellers);
            subject = `Order #${id} Cancellation — UBL/XML Document`;
            filename = `order-${id}-cancellation.xml`;
        } else {
            const error = new Error('type must be order, response, or cancel');
            error.statusCode = 400;
            throw error;
        }

        await sendXmlEmail(email, xml, subject, filename);
        return res.status(200).json({ message: `XML sent to ${email}` });
    });
});

app.post('/orders/:id/response', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const { response_code, note } = req.body;
        await createOrderResponse(id, req.user.id, response_code, note);

        if (wantsXml(req)) {
            const { response, order, items, buyer, seller } = await getOrderResponseDetails(id);
            return res.status(201)
                .set('Content-Type', 'application/xml')
                .send(orderResponseToXml(response, order, items, buyer, seller));
        }

        const { response } = await getOrderResponseDetails(id);
        return res.status(201).json(response);
    });
});

app.get('/orders/:id/response', requireAuth, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const { response, order, items, buyer, seller } = await getOrderResponseDetails(id);

        if (wantsXml(req)) {
            return res.status(200)
                .set('Content-Type', 'application/xml')
                .send(orderResponseToXml(response, order, items, buyer, seller));
        }

        return res.status(200).json(response);
    });
});

app.post('/orders/:id/cancel', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const { reason } = req.body;
        const cancellation = await createOrderCancellation(id, req.user.id, reason);

        if (wantsXml(req)) {
            const details = await getOrderCancellationDetails(id);
            return res.status(201)
                .set('Content-Type', 'application/xml')
                .send(orderCancellationToXml(details.cancellation, details.order, details.buyer, details.sellers));
        }

        return res.status(201).json(cancellation);
    });
});

app.get('/orders/:id/cancel', requireAuth, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const { cancellation, order, buyer, sellers } = await getOrderCancellationDetails(id);

        if (wantsXml(req)) {
            return res.status(200)
                .set('Content-Type', 'application/xml')
                .send(orderCancellationToXml(cancellation, order, buyer, sellers));
        }

        return res.status(200).json(cancellation);
    });
});

// ---------------------------------- Product Controller ----------------------------------
app.post('/products', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, price, tags, image_url, business_id } = req.body;
        // Products are always listed under the caller; only admins may list on behalf of someone else
        const seller_id = req.user.is_admin && req.body.seller_id ? req.body.seller_id : req.user.id;
        if (business_id && !req.user.is_admin) {
            await assertBusinessRole(business_id, req.user.id, 'editor');
        }
        const result = await createProduct(name, price, seller_id, tags, image_url, business_id);
        return res.status(201).json(result);
    });
});

app.get('/products', async (req, res) => {
    return await handleErrors(res, async () => {
        const { seller_id, business_id } = req.query;
        const result = await getProducts(seller_id || null, business_id || null);
        return res.status(200).json(result);
    });
});

app.get('/products/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getProduct(id);
        return res.status(200).json(result);
    });
});

app.patch('/products/:id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateProduct(id, req.body, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

app.delete('/products/:id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteProduct(id, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

// ---------------------------------- Voucher Controller ----------------------------------
app.post('/vouchers', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, discount, expiry, max_uses, business_id } = req.body;
        const result = await createVoucher(name, discount, expiry, max_uses, business_id, req.user.id, req.user.is_admin);
        return res.status(201).json(result);
    });
});

app.get('/vouchers', async (req, res) => {
    return await handleErrors(res, async () => {
        const result = await getVouchers();
        return res.status(200).json(result);
    });
});

app.get('/vouchers/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getVoucher(id);
        return res.status(200).json(result);
    });
});

app.patch('/vouchers/:id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateVoucher(id, req.body, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

app.delete('/vouchers/:id', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteVoucher(id, req.user.id, req.user.is_admin);
        return res.status(200).json(result);
    });
});

// ── Chat Controller ──
// A buyer/seller chat is visible only to the buyer, that seller, and admins.
function assertChatParticipant(req) {
    const { isAdmin, isBuyer } = req.orderAccess;
    if (!isAdmin && !isBuyer && parseInt(req.params.seller_id) !== req.user.id) {
        const error = new Error('You are not a participant in this chat');
        error.statusCode = 403;
        throw error;
    }
}

app.post('/orders/:id/chat/:seller_id', requireVerified, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        assertChatParticipant(req);
        const { id, seller_id } = req.params;
        const chat = await getOrCreateChat(id, parseInt(seller_id));
        return res.status(200).json(chat);
    });
});

app.get('/orders/:id/chats', requireAuth, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const chats = await getOrderChats(id);
        const { isAdmin, isBuyer } = req.orderAccess;
        // Sellers only see their own negotiation, not other sellers' chats on the same order
        const visible = isAdmin || isBuyer ? chats : chats.filter(c => c.seller_id === req.user.id);
        return res.status(200).json(visible);
    });
});

app.get('/orders/:id/chat/:seller_id', requireAuth, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        assertChatParticipant(req);
        const { id, seller_id } = req.params;
        const chat = await getChat(id, parseInt(seller_id));
        return res.status(200).json(chat);
    });
});

app.post('/orders/:id/chat/:seller_id/message', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id, seller_id } = req.params;
        const { message } = req.body;
        const msg = await sendMessage(id, parseInt(seller_id), req.user.id, message);
        return res.status(201).json(msg);
    });
});

app.post('/orders/:id/chat/:seller_id/finalize', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id, seller_id } = req.params;
        const { action } = req.body;
        const result = await finalizeChat(id, parseInt(seller_id), req.user.id, action);
        return res.status(200).json(result);
    });
});

app.get('/orders/:id/responses', requireAuth, requireOrderAccess, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const responses = await getAllSellerResponses(id);
        return res.status(200).json(responses);
    });
});

app.post('/orders/:id/pay', requireVerified, async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const order = await confirmPayment(id, req.user.id);
        return res.status(200).json(order);
    });
});


// ---------------------------------- Other ----------------------------------
app.get('/health', function(req, res)
{
    res.status(200).json({
        status: 'ok',
        service: 'order-service',
        uptime: process.uptime()
    });
});

// Serve built React frontend
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// SPA catch-all: serve index.html for browser navigation, 404 JSON for API calls
app.use(function(req, res)
{
    const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    if (req.accepts('html') && fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.status(404).json({ error: 'route not found' });
});

app.listen(PORT, function()
{
    console.log('⚡️ Server started on port ' + PORT);
});

export { app };
