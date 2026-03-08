const { Pool } = require("pg")

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "procurement",
    password: "password",
    port: 5342
})

module.exports = pool