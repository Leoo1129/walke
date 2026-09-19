import { Router } from 'express';
import { requireAdmin, requireAuth, requireVerified } from '../middleware/auth.js';
import { requireOrderAccess } from '../middleware/orderAccess.js';
import {
    orderCancellationToXml,
    orderResponseToXml,
    orderToXml,
    wantsXml
} from '../controllers/XMLController.js';
import {
    finalizeChat,
    getChat,
    getOrCreateChat,
    getOrderChats,
    sendMessage
} from '../controllers/chatController.js';
import { createOrderCancellation, getOrderCancellationDetails } from '../controllers/orderCancellationController.js';
import {
    confirmPayment,
    createOrder,
    deleteOrder,
    getOrder,
    getOrderDetails,
    getOrders,
    updateOrder
} from '../controllers/orderController.js';
import { createOrderResponse, getAllSellerResponses, getOrderResponseDetails } from '../controllers/orderResponseController.js';
import { sendXmlEmail } from '../services/mailer.js';
import { HttpError } from '../utils/errors.js';

const router = Router();

router.post('/', requireVerified, async (req, res) => {
    const { voucher_code } = req.body;
    const { order, items, buyer, sellers, client_secret } = await createOrder(req.user.id, voucher_code);

    if (wantsXml(req)) {
        return res.status(201)
            .set('Content-Type', 'application/xml')
            .send(orderToXml(order, items, buyer, sellers));
    }

    return res.status(201).json({ ...order, items, client_secret });
});

// Admins can list every order; everyone else sees orders they bought, or (with ?seller_id)
// orders containing their own products.
router.get('/', requireAuth, async (req, res) => {
    const { seller_id } = req.query;

    if (req.user.is_admin) {
        return res.status(200).json(await getOrders(seller_id || null));
    }
    if (seller_id) {
        if (parseInt(seller_id) !== req.user.id) {
            return res.status(403).json({ error: 'You can only view orders for your own products' });
        }
        return res.status(200).json(await getOrders(req.user.id));
    }
    return res.status(200).json(await getOrders(null, req.user.id));
});

router.get('/:id', requireAuth, requireOrderAccess, async (req, res) => {
    const { id } = req.params;
    if (wantsXml(req)) {
        const { order, items, buyer, sellers } = await getOrderDetails(id);
        return res.status(200)
            .set('Content-Type', 'application/xml')
            .send(orderToXml(order, items, buyer, sellers));
    }
    const result = await getOrder(id);
    return res.status(200).json(result);
});

router.patch('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const result = await updateOrder(id, req.body);
    return res.status(200).json(result);
});

router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const result = await deleteOrder(id);
    return res.status(200).json(result);
});

router.post('/:id/xml-email', requireAuth, requireOrderAccess, async (req, res) => {
    const { id } = req.params;
    const { type, email } = req.body;

    if (!email) {
        throw new HttpError(400, 'email is required');
    }

    let xml, subject, filename;
    if (type === 'order') {
        const { order, items, buyer, sellers } = await getOrderDetails(id);
        xml = orderToXml(order, items, buyer, sellers);
        subject = `Order #${id} — UBL/XML Document`;
        filename = `order-${id}.xml`;
    } else if (type === 'response') {
        const { response, order, items, buyer, seller } = await getOrderResponseDetails(id);
        xml = orderResponseToXml(response, order, items, buyer, seller);
        subject = `Order #${id} Response — UBL/XML Document`;
        filename = `order-${id}-response.xml`;
    } else if (type === 'cancel') {
        const { cancellation, order, buyer, sellers } = await getOrderCancellationDetails(id);
        xml = orderCancellationToXml(cancellation, order, buyer, sellers);
        subject = `Order #${id} Cancellation — UBL/XML Document`;
        filename = `order-${id}-cancellation.xml`;
    } else {
        throw new HttpError(400, 'type must be order, response, or cancel');
    }

    await sendXmlEmail(email, xml, subject, filename);
    return res.status(200).json({ message: `XML sent to ${email}` });
});

router.post('/:id/response', requireVerified, async (req, res) => {
    const { id } = req.params;
    const { response_code, note } = req.body;
    await createOrderResponse(id, req.user.id, response_code, note);

    if (wantsXml(req)) {
        const { response, order, items, buyer, seller } = await getOrderResponseDetails(id);
        return res.status(201)
            .set('Content-Type', 'application/xml')
            .send(orderResponseToXml(response, order, items, buyer, seller));
    }

    const { response } = await getOrderResponseDetails(id);
    return res.status(201).json(response);
});

router.get('/:id/response', requireAuth, requireOrderAccess, async (req, res) => {
    const { id } = req.params;
    const { response, order, items, buyer, seller } = await getOrderResponseDetails(id);

    if (wantsXml(req)) {
        return res.status(200)
            .set('Content-Type', 'application/xml')
            .send(orderResponseToXml(response, order, items, buyer, seller));
    }

    return res.status(200).json(response);
});

router.post('/:id/cancel', requireVerified, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const cancellation = await createOrderCancellation(id, req.user.id, reason);

    if (wantsXml(req)) {
        const details = await getOrderCancellationDetails(id);
        return res.status(201)
            .set('Content-Type', 'application/xml')
            .send(orderCancellationToXml(details.cancellation, details.order, details.buyer, details.sellers));
    }

    return res.status(201).json(cancellation);
});

router.get('/:id/cancel', requireAuth, requireOrderAccess, async (req, res) => {
    const { id } = req.params;
    const { cancellation, order, buyer, sellers } = await getOrderCancellationDetails(id);

    if (wantsXml(req)) {
        return res.status(200)
            .set('Content-Type', 'application/xml')
            .send(orderCancellationToXml(cancellation, order, buyer, sellers));
    }

    return res.status(200).json(cancellation);
});

// A buyer/seller chat is visible only to the buyer, that seller, and admins.
function assertChatParticipant(req) {
    const { isAdmin, isBuyer } = req.orderAccess;
    if (!isAdmin && !isBuyer && parseInt(req.params.seller_id) !== req.user.id) {
        throw new HttpError(403, 'You are not a participant in this chat');
    }
}

router.post('/:id/chat/:seller_id', requireVerified, requireOrderAccess, async (req, res) => {
    assertChatParticipant(req);
    const { id, seller_id } = req.params;
    const chat = await getOrCreateChat(id, parseInt(seller_id));
    return res.status(200).json(chat);
});

router.get('/:id/chats', requireAuth, requireOrderAccess, async (req, res) => {
    const { id } = req.params;
    const chats = await getOrderChats(id);
    const { isAdmin, isBuyer } = req.orderAccess;
    // Sellers only see their own negotiation, not other sellers' chats on the same order
    const visible = isAdmin || isBuyer ? chats : chats.filter(c => c.seller_id === req.user.id);
    return res.status(200).json(visible);
});

router.get('/:id/chat/:seller_id', requireAuth, requireOrderAccess, async (req, res) => {
    assertChatParticipant(req);
    const { id, seller_id } = req.params;
    const chat = await getChat(id, parseInt(seller_id));
    return res.status(200).json(chat);
});

router.post('/:id/chat/:seller_id/message', requireVerified, async (req, res) => {
    const { id, seller_id } = req.params;
    const { message } = req.body;
    const msg = await sendMessage(id, parseInt(seller_id), req.user.id, message);
    return res.status(201).json(msg);
});

router.post('/:id/chat/:seller_id/finalize', requireVerified, async (req, res) => {
    const { id, seller_id } = req.params;
    const { action } = req.body;
    const result = await finalizeChat(id, parseInt(seller_id), req.user.id, action);
    return res.status(200).json(result);
});

router.get('/:id/responses', requireAuth, requireOrderAccess, async (req, res) => {
    const { id } = req.params;
    const responses = await getAllSellerResponses(id);
    return res.status(200).json(responses);
});

router.post('/:id/pay', requireVerified, async (req, res) => {
    const { id } = req.params;
    const order = await confirmPayment(id, req.user.id);
    return res.status(200).json(order);
});

export default router;
