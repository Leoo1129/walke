// npm imports
import express, { json } from 'express';
import { create } from 'xmlbuilder2';
import cors from 'cors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
const config = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));

// controller imports
import {
    createOrder,
    getOrder,
    getOrders,
    updateOrder,
    deleteOrder
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
    updateUser,
    deleteUser
} from './controllers/userController.js';

import { requireAuth } from './middleware/auth.js';

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

import { handleErrors } from './handler.js';


// setup web applicatioon
// Use middleware to access .json files
const app = express();
app.use(json());
app.use(express.json());

// Use middleware for allowing access form different domain: for frontend
app.use(cors());

try {
    const file = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
    app.get('/', (req, res) => res.redirect('/docs'));
    app.use('/docs', sui.serve, sui.setup(YAML.parse(file) || {}, {
        swaggerOptions: { docExpansion: 'full' }
    }));
} catch (_) {
    // swagger.yaml not found or invalid — skip docs route
}

const PORT = parseInt(process.env.PORT || config.port);
const HOST = process.env.IP || '127.0.0.1'; // eslint-disable-line no-unused-vars


// ------------------------------------------------------------------------------------------------------
// ------------------------------ Sever functionalities and API below here ------------------------------
// ------------------------------------------------------------------------------------------------------


// ---------------------------------- Auth ----------------------------------
app.post('/login', async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, password } = req.body;
        const result = await login(name, password);
        return res.status(200).json(result);
    });
});

// ---------------------------------- User Controller ----------------------------------
app.post('/users', async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, password, street, city, postcode, country } = req.body;
        const result = await createUser(name, password, street, city, postcode, country);
        return res.status(201).json(result);
    });
});

app.get('/users', async (req, res) => {
    return await handleErrors(res, async () => {
        const result = await getUsers();
        return res.status(200).json(result);
    });
});

app.get('/users/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getUser(id);
        return res.status(200).json(result);
    });
});

app.patch('/users/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateUser(id, req.body);
        return res.status(200).json(result);
    });
});

app.delete('/users/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteUser(id);
        return res.status(200).json(result);
    });
});

// ---------------------------------- Cart Controller ----------------------------------
app.post('/cart', requireAuth, async (req, res) => {
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

function wantsXml(req) {
    return (req.headers.accept || '').includes('application/xml');
}

function orderToXml(order, items) {
    const preDiscountTotal = Math.round(
        items.reduce((sum, { price, quantity }) => sum + price * quantity, 0) * 100
    ) / 100;
    const finalTotal = order.total_price ?? preDiscountTotal;
    const saved = Math.round((preDiscountTotal - finalTotal) * 100) / 100;

    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('order');

    root.ele('id').txt(String(order.id));
    root.ele('buyer_id').txt(String(order.buyer_id));
    root.ele('status').txt(order.status);
    root.ele('voucher_id').txt(order.voucher_id != null ? String(order.voucher_id) : '');
    root.ele('created_at').txt(String(order.created_at));

    const itemsEle = root.ele('items');
    for (const item of items) {
        const subtotal = Math.round(item.price * item.quantity * 100) / 100;
        const itemEle = itemsEle.ele('item');
        itemEle.ele('product_id').txt(String(item.product_id));
        itemEle.ele('product_name').txt(item.product_name ?? '');
        itemEle.ele('seller_id').txt(String(item.seller_id ?? ''));
        itemEle.ele('unit_price').txt(String(item.price));
        itemEle.ele('quantity').txt(String(item.quantity));
        itemEle.ele('subtotal').txt(String(subtotal));
    }

    const sellerIds = [...new Set(items.map(i => i.seller_id).filter(Boolean))];
    const sellersEle = root.ele('sellers');
    for (const sid of sellerIds) {
        sellersEle.ele('seller_id').txt(String(sid));
    }

    const summaryEle = root.ele('summary');
    summaryEle.ele('items_subtotal').txt(String(preDiscountTotal));
    summaryEle.ele('discount_saved').txt(String(saved));
    summaryEle.ele('total_price').txt(String(finalTotal));

    return root.end({ prettyPrint: true });
}

// ---------------------------------- Order Controller ----------------------------------
app.post('/orders', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { voucher_id } = req.body;
        const { order, items } = await createOrder(req.user.id, voucher_id);

        if (wantsXml(req)) {
            return res.status(201)
                .set('Content-Type', 'application/xml')
                .send(orderToXml(order, items));
        }

        return res.status(201).json({ ...order, items });
    });
});

app.get('/orders', async (req, res) => {
    return await handleErrors(res, async () => {
        const result = await getOrders();
        return res.status(200).json(result);
    });
});

app.get('/orders/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await getOrder(id);
        return res.status(200).json(result);
    });
});

app.patch('/orders/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateOrder(id, req.body);
        return res.status(200).json(result);
    });
});

app.delete('/orders/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteOrder(id);
        return res.status(200).json(result);
    });
});

// ---------------------------------- Product Controller ----------------------------------
app.post('/products', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, price, seller_id, tags } = req.body;
        const result = await createProduct(name, price, seller_id, tags);
        return res.status(201).json(result);
    });
});

app.get('/products', async (req, res) => {
    return await handleErrors(res, async () => {
        const result = await getProducts();
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

app.patch('/products/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateProduct(id, req.body);
        return res.status(200).json(result);
    });
});

app.delete('/products/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteProduct(id);
        return res.status(200).json(result);
    });
});

// ---------------------------------- Voucher Controller ----------------------------------
app.post('/vouchers', async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, discount, expiry, max_uses } = req.body;
        const result = await createVoucher(name, discount, expiry, max_uses);
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

app.patch('/vouchers/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await updateVoucher(id, req.body);
        return res.status(200).json(result);
    });
});

app.delete('/vouchers/:id', async (req, res) => {
    return await handleErrors(res, async () => {
        const { id } = req.params;
        const result = await deleteVoucher(id);
        return res.status(200).json(result);
    });
});

// ---------------------------------- Other ----------------------------------
app.use(function(req, res, next)
{
    console.log(req.method + ' ' + req.url);
    next();
});


app.get('/', function(req, res)
{
    res.send('Walke API running');
});


app.get('/health', function(req, res)
{
    res.status(200).json({
        status: 'ok',
        service: 'order-service',
        uptime: process.uptime()
    });
});

app.use(function(req, res)
{
    res.status(404).json({
        error: 'route not found'
    });
});

export { app };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(PORT, function()
    {
        console.log('⚡️ Server started on port ' + PORT);
    });
}