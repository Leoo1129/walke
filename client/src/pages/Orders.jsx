import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/orders')
            .then(r => {
                const mine = r.data.filter(o => o.buyer_id === user?.id);
                setOrders(mine);
            })
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, []);

    async function cancelOrder(id) {
        const reason = prompt('Reason for cancellation?');
        if (reason === null) return;
        try {
            await api.post(`/orders/${id}/cancel`, { reason });
            const r = await api.get('/orders');
            setOrders(r.data.filter(o => o.buyer_id === user?.id));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to cancel');
        }
    }

    const statusColor = { pending: '#f39c12', confirmed: '#27ae60', rejected: '#e74c3c', cancelled: '#95a5a6' };

    if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

    return (
        <div style={styles.wrap}>
            <h2 style={{ marginBottom: 24 }}>My Orders</h2>
            {orders.length === 0 ? (
                <p>No orders yet. <span style={styles.link} onClick={() => navigate('/')}>Shop now</span></p>
            ) : (
                <div style={styles.list}>
                    {orders.map(o => (
                        <div key={o.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <span>Order #{o.id}</span>
                                <span style={{ ...styles.badge, background: statusColor[o.status] || '#999' }}>{o.status}</span>
                            </div>
                            <p>Total: <strong>${Number(o.total_price || 0).toFixed(2)}</strong></p>
                            <p style={styles.date}>{new Date(o.created_at).toLocaleDateString()}</p>
                            <div style={styles.actions}>
                                <button onClick={() => navigate(`/orders/${o.id}`)} style={styles.btn}>View Details</button>
                                {o.status === 'pending' && (
                                    <button onClick={() => cancelOrder(o.id)} style={styles.cancelBtn}>Cancel</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 800, margin: '0 auto' },
    list: { display: 'flex', flexDirection: 'column', gap: 12 },
    card: { border: '1px solid #ddd', borderRadius: 8, padding: 16 },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    badge: { color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12 },
    date: { color: '#888', fontSize: 13, marginTop: 4 },
    actions: { display: 'flex', gap: 8, marginTop: 12 },
    btn: { padding: '6px 14px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    cancelBtn: { padding: '6px 14px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    link: { color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' },
};
