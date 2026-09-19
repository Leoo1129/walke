import fs from 'fs';
import process from 'process';
import { app } from './app.js';
import pool from './database/database.js';

const config = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const PORT = parseInt(process.env.PORT || config.port);

const server = app.listen(PORT, () => {
    console.log('⚡️ Server started on port ' + PORT);
});

// Finish in-flight requests and close database connections before exiting
function shutdown(signal) {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
        pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
