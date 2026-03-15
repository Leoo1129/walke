export async function handleErrors(res, callback) {
    try {
    // wait for callback for when it's an async database operation...
        return await callback(); 
    }
    catch (e) {
        // log errors for changes...
        console.error(e);
        // Fallback for generic "throw new Error()" or database crashes
        const status = e.name === 'InputError' ? 400 : (e.statusCode || 500);
        return res.status(status).json({ error: e.message || 'Internal Server Error' });
    }
}
