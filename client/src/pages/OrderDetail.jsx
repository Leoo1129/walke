import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function OrderDetail() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [response, setResponse] = useState(null);
    const [cancellation, setCancellation] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    async function load() {
        const [orderRes] = await Promise.all([
            api.get(`/orders/${id}`),
        ]);
        setOrder(orderRes.data);
        api.get(`/orders/${id}/response`).then(r => setResponse(r.data)).catch(() => {});
        api.get(`/orders/${id}/cancel`).then(r => setCancellation(r.data)).catch(() => {});
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function respondToOrder(code) {
        const note = code === 'RE' ? prompt('Reason for rejection?') : '';
        try {
            await api.post(`/orders/${id}/response`, { response_code: code, note });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    if (!order) return <p style={{ padding: 24 }}>Loading...</p>;

    const isSeller = order.items?.some(i => i.seller_id === user?.id);
    const statusColor = { pending: '#f39c12', confirmed: '#27ae60', rejected: '#e74c3c', cancelled: '#95a5a6' };

    return (
        <div style={styles.wrap}>
            <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>
            <div style={styles.header}>
                <h2>Order #{order.id}</h2>
                <span style={{ ...styles.badge, background: statusColor[order.status] || '#999' }}>{order.status}</span>
            </div>

            <p>Total: <strong>${Number(order.total_price || 0).toFixed(2)}</strong></p>
            <p style={styles.date}>Placed: {new Date(order.created_at).toLocaleDateString()}</p>

            {order.items && (
                <div style={styles.section}>
                    <h3>Items</h3>
                    {order.items.map(item => (
                        <div key={item.product_id} style={styles.item}>
                            <span>{item.name || `Product #${item.product_id}`}</span>
                            <span>x{item.quantity}</span>
                            <span>${Number(item.price || 0).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}

            {response && (
                <div style={styles.section}>
                    <h3>Seller Response</h3>
                    <p>Code: <strong>{response.response_code}</strong></p>
                    {response.note && <p>Note: {response.note}</p>}
                </div>
            )}

            {cancellation && (
                <div style={{ ...styles.section, background: '#fef0f0' }}>
                    <h3>Cancellation</h3>
                    <p>Reason: {cancellation.reason}</p>
                </div>
            )}

            {isSeller && order.status === 'pending' && (
                <div style={styles.section}>
                    <h3>Respond to Order</h3>
                    <div style={styles.actions}>
                        <button onClick={() => respondToOrder('AB')} style={styles.acceptBtn}>Accept (AB)</button>
                        <button onClick={() => respondToOrder('RE')} style={styles.rejectBtn}>Reject (RE)</button>
                        <button onClick={() => respondToOrder('IP')} style={styles.infoBtn}>Request Info (IP)</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 700, margin: '0 auto' },
    back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16, padding: 0 },
    header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
    badge: { color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12 },
    date: { color: '#888', fontSize: 13, marginBottom: 16 },
    section: { marginTop: 24, padding: 16, background: '#f9f9f9', borderRadius: 8 },
    item: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 14 },
    actions: { display: 'flex', gap: 10, marginTop: 8 },
    acceptBtn: { padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    rejectBtn: { padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    infoBtn: { padding: '8px 16px', background: '#2980b9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
