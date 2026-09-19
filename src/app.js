import 'dotenv/config';
import express from 'express';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import { securityHeaders, corsPolicy, requestLogger } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import businessRoutes from './routes/businesses.js';
import imageRoutes from './routes/images.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import voucherRoutes from './routes/vouchers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');

const app = express();
app.disable('x-powered-by');
// Behind a reverse proxy (e.g. Render, Nginx) set TRUST_PROXY=1 so rate limits see the real client IP
if (process.env.TRUST_PROXY) app.set('trust proxy', parseInt(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(requestLogger);
app.use(securityHeaders);
app.use(corsPolicy());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT, 'public')));

const spec = YAML.parse(fs.readFileSync(path.join(ROOT, 'swagger.yaml'), 'utf8'));
app.use('/docs', sui.serve, sui.setup(spec, { swaggerOptions: { docExpansion: 'full' } }));

// Strip /api prefix so the production frontend's /api/* calls hit the same routes
app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) req.url = req.url.slice(4);
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'order-service', uptime: process.uptime() });
});

app.use(authRoutes);
app.use('/users', userRoutes);
app.use('/businesses', businessRoutes);
app.use('/images', imageRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/products', productRoutes);
app.use('/vouchers', voucherRoutes);

// Serve the built React frontend, falling back to index.html for client-side routes
app.use(express.static(CLIENT_DIST));
app.use((req, res, next) => {
    const indexPath = path.join(CLIENT_DIST, 'index.html');
    if (req.method === 'GET' && req.accepts('html') && fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    next();
});

app.use(notFound);
app.use(errorHandler);

export { app };
