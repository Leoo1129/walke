// npm imports
import express, { json } from 'express'; 
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

}  from './controllers/userController.js';

import {
    createVoucher,
    getVoucher,
    getVouchers,
    updateVoucher,
    deleteVoucher
} from './controllers/voucherController.js';

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


// ---------------------------------- User Controller ----------------------------------
// app.post("/users", userController.createUser)
// app.post("/users", userController.deleteUser)
// app.post("/users", userController.updateUser)

// ---------------------------------- Order Controller ----------------------------------
app.post('/orders', async (req, res) => {
    return await handleErrors(res, async () => {
        const { buyer_id, items, total_price, voucher_id } = req.body;
        const result = await createOrder(buyer_id, items, total_price, voucher_id);
        return res.status(201).json(result);
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
app.post('/products', async (req, res) => {

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