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

function orderToXml(order, items, buyer, sellers) {
    const preDiscountTotal = Math.round(
        items.reduce((sum, { price, quantity }) => sum + price * quantity, 0) * 100
    ) / 100;
    const finalTotal = parseFloat(order.total_price ?? preDiscountTotal);
    const saved = Math.round((preDiscountTotal - finalTotal) * 100) / 100;

    const issueDate = new Date(order.created_at);
    const issueDateStr = issueDate.toISOString().split('T')[0];
    const issueTimeStr = issueDate.toISOString().split('T')[1].replace(/\.\d+Z$/, '');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('Order', {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Order-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
        });

    root.ele('cbc:UBLVersionID').txt('2.1');
    root.ele('cbc:ID').txt(String(order.id));
    root.ele('cbc:IssueDate').txt(issueDateStr);
    root.ele('cbc:IssueTime').txt(issueTimeStr);
    root.ele('cbc:DocumentCurrencyCode').txt('AUD');
    root.ele('cbc:Note').txt(`Status: ${order.status}`);

    const buyerParty = root.ele('cac:BuyerCustomerParty').ele('cac:Party');
    buyerParty.ele('cac:PartyName').ele('cbc:Name').txt(buyer?.name ?? '');
    const buyerAddr = buyerParty.ele('cac:PostalAddress');
    if (buyer?.street) buyerAddr.ele('cbc:StreetName').txt(buyer.street);
    if (buyer?.city) buyerAddr.ele('cbc:CityName').txt(buyer.city);
    if (buyer?.postcode) buyerAddr.ele('cbc:PostalZone').txt(buyer.postcode);
    if (buyer?.country) buyerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(buyer.country);

    for (const seller of (sellers || [])) {
        const sellerParty = root.ele('cac:SellerSupplierParty').ele('cac:Party');
        sellerParty.ele('cac:PartyIdentification').ele('cbc:ID').txt(String(seller.id));
        sellerParty.ele('cac:PartyName').ele('cbc:Name').txt(seller.name ?? '');
        const sellerAddr = sellerParty.ele('cac:PostalAddress');
        if (seller.street) sellerAddr.ele('cbc:StreetName').txt(seller.street);
        if (seller.city) sellerAddr.ele('cbc:CityName').txt(seller.city);
        if (seller.postcode) sellerAddr.ele('cbc:PostalZone').txt(seller.postcode);
        if (seller.country) sellerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(seller.country);
    }

    items.forEach((item, index) => {
        const lineExt = Math.round(item.price * item.quantity * 100) / 100;
        const line = root.ele('cac:OrderLine');
        const lineItem = line.ele('cac:LineItem');
        lineItem.ele('cbc:ID').txt(String(index + 1));
        lineItem.ele('cbc:Quantity', { unitCode: 'C62' }).txt(String(item.quantity));
        lineItem.ele('cbc:LineExtensionAmount', { currencyID: 'AUD' }).txt(String(lineExt));
        lineItem.ele('cac:Price').ele('cbc:PriceAmount', { currencyID: 'AUD' }).txt(String(item.price));
        const itemEle = lineItem.ele('cac:Item');
        itemEle.ele('cbc:Name').txt(item.product_name ?? '');
        itemEle.ele('cac:SellersItemIdentification').ele('cbc:ID').txt(String(item.product_id));
    });

    const totals = root.ele('cac:AnticipatedMonetaryTotal');
    totals.ele('cbc:LineExtensionAmount', { currencyID: 'AUD' }).txt(String(preDiscountTotal));
    if (saved > 0) totals.ele('cbc:AllowanceTotalAmount', { currencyID: 'AUD' }).txt(String(saved));
    totals.ele('cbc:PayableAmount', { currencyID: 'AUD' }).txt(String(finalTotal));

    return root.end({ prettyPrint: true });
}

function orderResponseToXml(response, order, items, buyer, seller) {
    const issueDate = new Date(response.created_at);
    const issueDateStr = issueDate.toISOString().split('T')[0];
    const issueTimeStr = issueDate.toISOString().split('T')[1].replace(/\.\d+Z$/, '');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('OrderResponse', {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:OrderResponse-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
        });

    root.ele('cbc:UBLVersionID').txt('2.1');
    root.ele('cbc:ID').txt(String(response.id));
    root.ele('cbc:IssueDate').txt(issueDateStr);
    root.ele('cbc:IssueTime').txt(issueTimeStr);
    root.ele('cbc:OrderCommunicationTypeCode').txt(response.response_code);
    if (response.note) root.ele('cbc:Note').txt(response.note);

    root.ele('cac:OrderReference').ele('cbc:ID').txt(String(order.id));

    const sellerParty = root.ele('cac:SellerSupplierParty').ele('cac:Party');
    sellerParty.ele('cac:PartyIdentification').ele('cbc:ID').txt(String(seller.id));
    sellerParty.ele('cac:PartyName').ele('cbc:Name').txt(seller.name ?? '');
    const sellerAddr = sellerParty.ele('cac:PostalAddress');
    if (seller.street) sellerAddr.ele('cbc:StreetName').txt(seller.street);
    if (seller.city) sellerAddr.ele('cbc:CityName').txt(seller.city);
    if (seller.postcode) sellerAddr.ele('cbc:PostalZone').txt(seller.postcode);
    if (seller.country) sellerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(seller.country);

    const buyerParty = root.ele('cac:BuyerCustomerParty').ele('cac:Party');
    buyerParty.ele('cac:PartyName').ele('cbc:Name').txt(buyer?.name ?? '');
    const buyerAddr = buyerParty.ele('cac:PostalAddress');
    if (buyer?.street) buyerAddr.ele('cbc:StreetName').txt(buyer.street);
    if (buyer?.city) buyerAddr.ele('cbc:CityName').txt(buyer.city);
    if (buyer?.postcode) buyerAddr.ele('cbc:PostalZone').txt(buyer.postcode);
    if (buyer?.country) buyerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(buyer.country);

    items.forEach((item, index) => {
        const lineExt = Math.round(item.price * item.quantity * 100) / 100;
        const line = root.ele('cac:OrderLine');
        const lineItem = line.ele('cac:LineItem');
        lineItem.ele('cbc:ID').txt(String(index + 1));
        lineItem.ele('cbc:Quantity', { unitCode: 'C62' }).txt(String(item.quantity));
        lineItem.ele('cbc:LineExtensionAmount', { currencyID: 'AUD' }).txt(String(lineExt));
        lineItem.ele('cac:Price').ele('cbc:PriceAmount', { currencyID: 'AUD' }).txt(String(item.price));
        const itemEle = lineItem.ele('cac:Item');
        itemEle.ele('cbc:Name').txt(item.product_name ?? '');
        itemEle.ele('cac:SellersItemIdentification').ele('cbc:ID').txt(String(item.product_id));
    });

    return root.end({ prettyPrint: true });
}

function orderCancellationToXml(cancellation, order, buyer, sellers) {
    const issueDate = new Date(cancellation.created_at);
    const issueDateStr = issueDate.toISOString().split('T')[0];
    const issueTimeStr = issueDate.toISOString().split('T')[1].replace(/\.\d+Z$/, '');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('OrderCancellation', {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:OrderCancellation-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
        });

    root.ele('cbc:UBLVersionID').txt('2.1');
    root.ele('cbc:ID').txt(String(cancellation.id));
    root.ele('cbc:IssueDate').txt(issueDateStr);
    root.ele('cbc:IssueTime').txt(issueTimeStr);
    if (cancellation.reason) root.ele('cbc:Note').txt(cancellation.reason);

    root.ele('cac:OrderReference').ele('cbc:ID').txt(String(order.id));

    const buyerParty = root.ele('cac:BuyerCustomerParty').ele('cac:Party');
    buyerParty.ele('cac:PartyName').ele('cbc:Name').txt(buyer?.name ?? '');
    const buyerAddr = buyerParty.ele('cac:PostalAddress');
    if (buyer?.street) buyerAddr.ele('cbc:StreetName').txt(buyer.street);
    if (buyer?.city) buyerAddr.ele('cbc:CityName').txt(buyer.city);
    if (buyer?.postcode) buyerAddr.ele('cbc:PostalZone').txt(buyer.postcode);
    if (buyer?.country) buyerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(buyer.country);

    for (const seller of (sellers || [])) {
        const sellerParty = root.ele('cac:SellerSupplierParty').ele('cac:Party');
        sellerParty.ele('cac:PartyIdentification').ele('cbc:ID').txt(String(seller.id));
        sellerParty.ele('cac:PartyName').ele('cbc:Name').txt(seller.name ?? '');
        const sellerAddr = sellerParty.ele('cac:PostalAddress');
        if (seller.street) sellerAddr.ele('cbc:StreetName').txt(seller.street);
        if (seller.city) sellerAddr.ele('cbc:CityName').txt(seller.city);
        if (seller.postcode) sellerAddr.ele('cbc:PostalZone').txt(seller.postcode);
        if (seller.country) sellerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(seller.country);
    }

    return root.end({ prettyPrint: true });
}

// ---------------------------------- Order Controller ----------------------------------
app.post('/orders', requireAuth, async (req, res) => {
    return await handleErrors(res, async () => {
        const { voucher_id } = req.body;
        const { order, items, buyer, sellers } = await createOrder(req.user.id, voucher_id);

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