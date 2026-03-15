import express, { json } from 'express';
import cors from 'cors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import config from './config.json' with { type: 'json' };

// setup web applicatioon
const app = express();

// Use middleware to access .json files
app.use(json());
app.use(express.json())

// Use middleware for allowing access form different domain -- for frontend
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
const HOST = process.env.IP || '127.0.0.1';


// ------------------------------------------------------------------------------------------------------
// ------------------------------ Sever functionalities and API below here ------------------------------
// ------------------------------------------------------------------------------------------------------


// const orderController = require("./controllers/orderController")
import * as productController from '../controllers/productController.js';
// const userController = require("./controllers/userController")
// const voucherController = require("./controllers/voucherController")

app.use(function(req, res, next)
{
    console.log(req.method + " " + req.url)
    next()
})


app.get("/", function(req, res)
{
    res.send("Walke API running")
})


app.get("/health", function(req, res)
{
    res.status(200).json({
        status: "ok",
        service: "order-service",
        uptime: process.uptime()
    })
})


// app.post("/orders", orderController.createOrder)
// app.post("/orders", orderController.getOrder)
// app.post("/orders", orderController.updateOrder)

app.post("/products", productController.createProduct)
app.get("/products", productController.getProducts)
app.get("/products/:id", productController.getProduct)
app.patch("/products/:id", productController.updateProduct)
app.delete("/products/:id", productController.deleteProduct)

// app.post("/users", userController.createUser)
// app.post("/users", userController.deleteUser)
// app.post("/users", userController.updateUser)

// app.post("/vouchers", voucherController.createVoucher)
// app.post("/vouchers", voucherController.deleteVoucher)
// app.post("/vouchers", voucherController.updateVoucher)


app.use(function(req, res)
{
    res.status(404).json({
        error: "route not found"
    })
})


export { app };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(PORT, function()
    {
        console.log("⚡️ Server started on port " + PORT)
    })
}