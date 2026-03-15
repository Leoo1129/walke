export async function handleErrors(res, callback) {
    try {
    // wait for callback for when it's an async database operation...
        return await callback(); 
    }
    catch (e) {
        // log errors for changes...
        console.error(e);
        // Fallback for generic "throw new Error()" or database crashes
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
