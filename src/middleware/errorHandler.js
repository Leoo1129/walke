import multer from 'multer';

// Central error handler. Express 5 forwards errors thrown in async route handlers here.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    let status = err.statusCode || err.status || 500;

    if (err instanceof multer.MulterError) {
        status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    }

    if (status >= 500) {
        console.error(err);
        // Never leak database or stack details to clients
        return res.status(status).json({ error: 'Internal Server Error' });
    }

    return res.status(status).json({ error: err.message });
}

export function notFound(req, res) {
    res.status(404).json({ error: 'route not found' });
}
