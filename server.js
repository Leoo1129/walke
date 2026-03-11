const express = require("express")

const orderController = require("./controllers/orderController")
const productController = require("./controllers/productController")
const userController = require("./controllers/userController")
const voucherController = require("./controllers/voucherController")

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())

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

// app.post("/products", productController.createProduct)
// app.get("/products", productController.getProducts)
// app.post("/orders", orderController.deleteProduct)

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


app.listen(PORT, function()
{
    console.log("⚡️ Server started on port " + PORT)
})