import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'procurement',
    password: 'password',
    port: 5342
});

export default pool;
