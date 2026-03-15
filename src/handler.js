export async function handleErrors(res, callback) {
  try {
    // wait for callback for when it's an async database operation...
    return await callback(); 
  }
  catch (e) {
    if (e instanceof RegisterError || e instanceof IndexError || 
    e instanceof InputError || e instanceof GameError || 
    e instanceof PlayerError)
      return res.status(400).json({ error: e.message });

    else if (e instanceof SessionError)
      return res.status(401).json({ error: e.message });

    else if (e instanceof AccessDeniedError)
      return res.status(403).json({ error: e.message });

    // also log errors for changes...
    console.error(e);
    // Fallback for generic "throw new Error()" or database crashes
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
