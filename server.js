const express = require("express")

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())



app.get("/health", function(req, res)
{
    res.status(200).json({
        status: "ok",
        service: "order-service",
        uptime: process.uptime()
    })
})



app.post("/orders", function(req, res)
{
    const body = req.body

    if (!body.buyer_id)
    {
        return res.status(400).json({
            error: "buyer_id required"
        })
    }

    if (!Array.isArray(body.items) || body.items.length === 0)
    {
        return res.status(400).json({
            error: "items array required"
        })
    }

    for (const item of body.items)
    {
        if (!item.product_id || !item.quantity)
        {
            return res.status(400).json({
                error: "each item must include product_id and quantity"
            })
        }
    }



    const order_id = 69

    const order = {
        id: order_id,
        buyer_id: body.buyer_id,
        voucher_id: body.voucher_id || null,
        status: "pending",
        created_at: new Date(),
        items: body.items
    }

    res.status(201).json({
        message: "order created",
        order: order
    })
})



app.listen(PORT, function()
{
    console.log("⚡️ Server started on port " + PORT)
})