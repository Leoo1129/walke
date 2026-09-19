import { getOrderAccess } from '../controllers/orderController.js';

// Must run after requireAuth. Rejects users who are not a party to the order in :id
// and exposes their role as req.orderAccess ({ isAdmin, isBuyer, isSeller }).
export async function requireOrderAccess(req, res, next) {
    req.orderAccess = await getOrderAccess(req.params.id, req.user);
    next();
}
