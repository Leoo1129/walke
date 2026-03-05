const http = require("http")

const server = http.createServer(function (req, res)
{
    res.writeHead(200)

    res.end("Hello Earth!")
})

server.listen(3000)