import { getOrderAccess } from '../controllers/orderController.js';

// Must run after requireAuth. Rejects users who are not a party to the order in :id
// and exposes their role as req.orderAccess ({ isAdmin, isBuyer, isSeller }).
export async function requireOrderAccess(req, res, next) {
    try {
        req.orderAccess = await getOrderAccess(req.params.id, req.user);
        next();
    } catch (e) {
        const status = e.statusCode || 500;
        if (status === 500) console.error(e);
        return res.status(status).json({ error: status === 500 ? 'Internal Server Error' : e.message });
    }
}
