import pkg from 'pg';
const { Pool } = pkg;

// Prefer DATABASE_URL; otherwise pg falls back to the standard PGHOST/PGUSER/PGPASSWORD/PGDATABASE
// environment variables, so no credentials need to live in source control.
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : { database: process.env.PGDATABASE || 'procurement' }
);

export default pool;
