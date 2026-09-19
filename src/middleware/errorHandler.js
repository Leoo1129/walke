import multer from 'multer';

// Central error handler. Express 5 forwards errors thrown in async route handlers here.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    let status = err.statusCode || err.status || 500;

    if (err instanceof multer.MulterError) {
        status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    }

    if (status >= 500) console.error(err);

    // Unexpected errors may carry database or stack details, so never send those to clients.
    // Deliberate HttpErrors (e.g. 503 "Stripe is not configured") keep their message.
    if (status === 500) {
        return res.status(status).json({ error: 'Internal Server Error' });
    }

    return res.status(status).json({ error: err.message });
}

export function notFound(req, res) {
    res.status(404).json({ error: 'route not found' });
}
