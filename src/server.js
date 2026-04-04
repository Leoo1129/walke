// npm imports
import express, { json } from 'express';
import cors from 'cors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
const config = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));

// controller imports
import {
    createOrder,
    getOrder,
    getOrderDetails,
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

import {
    createOrderResponse,
    getOrderResponseDetails
} from './controllers/orderResponseController.js';

import {
    createOrderCancellation,
    getOrderCancellationDetails
} from './controllers/orderCancellationController.js';

import {
    wantsXml,
    orderToXml,
    orderResponseToXml,
    orderCancellationToXml
} from './controllers/XMLController.js';

import { handleErrors } from './handler.js';

// setup web applicatioon -- from 1531...
// Use middleware to access .json files
const app = express();
app.use(json());
app.use(express.json());

// Use middleware for allowing access form different domain: for frontend
app.use(cors());
app.use(express.static('public'));

const file = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
app.get('/', (req, res) => res.redirect('/docs'));
app.use('/docs', sui.serve, sui.setup(YAML.parse(file), {
    swaggerOptions: { docExpansion: 'full' }
}));

const PORT = parseInt(process.env.PORT || config.port);


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

// ---------------------------------- Order Controller ----------------------------------
app.post('/orders', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { voucher_code } = req.body;
        const { order, items, buyer, sellers } = await createOrder(req.user.id, voucher_code);

        if (wantsXml(req)) {
            return res.status(201)
                .set('Content-Type', 'application/xml')
                .send(orderToXml(order, items, buyer, sellers));
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

app.post('/orders/:id/response', requireAuth, async (req, res) => {
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

app.get('/orders/:id/response', async (req, res) => {
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

app.post('/orders/:id/cancel', requireAuth, async (req, res) => {
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

app.get('/orders/:id/cancel', async (req, res) => {
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
app.post('/products', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { name, price, seller_id, tags, image_url } = req.body;
        const result = await createProduct(name, price, seller_id, tags, image_url);
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

app.listen(PORT, function()
{
    console.log('⚡️ Server started on port ' + PORT);
});

export { app };
