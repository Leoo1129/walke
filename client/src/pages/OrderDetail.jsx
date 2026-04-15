import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function OrderDetail() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [response, setResponse] = useState(null);
    const [cancellation, setCancellation] = useState(null);
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [msgInput, setMsgInput] = useState('');
    const [xmlView, setXmlView] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    async function load() {
        const r = await api.get(`/orders/${id}`);
        setOrder(r.data);
        api.get(`/orders/${id}/response`).then(r => setResponse(r.data)).catch(() => {});
        api.get(`/orders/${id}/cancel`).then(r => setCancellation(r.data)).catch(() => {});
        api.get(`/orders/${id}/chats`).then(r => setChats(r.data)).catch(() => {});
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function loadChat(seller_id) {
        const r = await api.get(`/orders/${id}/chat/${seller_id}`);
        setActiveChat(seller_id);
        setChatMessages(r.data.messages || []);
    }

    async function sendMessage(seller_id) {
        if (!msgInput.trim()) return;
        await api.post(`/orders/${id}/chat/${seller_id}/message`, { message: msgInput });
        setMsgInput('');
        loadChat(seller_id);
    }

    async function finalizeChat(seller_id, action) {
        await api.post(`/orders/${id}/chat/${seller_id}/finalize`, { action });
        loadChat(seller_id);
        load();
    }

    async function respondToOrder(code) {
        const note = code === 'RE' ? prompt('Reason for rejection?') : '';
        try {
            await api.post(`/orders/${id}/response`, { response_code: code, note });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    async function cancelOrder() {
        const reason = prompt('Reason for cancellation?');
        if (reason === null) return;
        try {
            await api.post(`/orders/${id}/cancel`, { reason });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    async function viewXml(type) {
        try {
            let url = `/orders/${id}`;
            if (type === 'response') url = `/orders/${id}/response`;
            if (type === 'cancel') url = `/orders/${id}/cancel`;
            const token = localStorage.getItem('token');
            const res = await fetch(`/api${url}`, {
                headers: { Accept: 'application/xml', Authorization: `Bearer ${token}` }
            });
            const xml = await res.text();
            setXmlView(xml);
        } catch {
            alert('Failed to fetch XML');
        }
    }

    async function downloadXml(type) {
        try {
            let url = `/orders/${id}`;
            if (type === 'response') url = `/orders/${id}/response`;
            if (type === 'cancel') url = `/orders/${id}/cancel`;
            const token = localStorage.getItem('token');
            const res = await fetch(`/api${url}`, {
                headers: { Accept: 'application/xml', Authorization: `Bearer ${token}` }
            });
            const xml = await res.text();
            const blob = new Blob([xml], { type: 'application/xml' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `order-${id}-${type}.xml`;
            a.click();
        } catch {
            alert('Failed to download XML');
        }
    }

    if (!order) return <p style={{ padding: 24 }}>Loading...</p>;

    const isSeller = order.items?.some(i => i.seller_id === user?.id);
    const isBuyer = order.buyer_id === user?.id;
    const statusColor = { pending: '#f39c12', confirmed: '#27ae60', rejected: '#e74c3c', cancelled: '#95a5a6' };

    // Map seller_id → seller name for chat tabs
    const sellerMap = {};
    (order.sellers || []).forEach(s => { sellerMap[s.id] = s; });

    return (
        <div style={styles.wrap}>
            <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>

            {/* Header */}
            <div style={styles.header}>
                <h2 style={{ margin: 0 }}>Order #{order.id}</h2>
                <span style={{ ...styles.badge, background: statusColor[order.status] || '#999' }}>{order.status}</span>
            </div>

            {/* Summary row */}
            <div style={styles.summaryRow}>
                <div style={styles.summaryCard}>
                    <span style={styles.summaryLabel}>Total</span>
                    <span style={styles.summaryValue}>${Number(order.total_price || 0).toFixed(2)}</span>
                </div>
                <div style={styles.summaryCard}>
                    <span style={styles.summaryLabel}>Placed</span>
                    <span style={styles.summaryValue}>{new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {order.voucher_id && (
                    <div style={styles.summaryCard}>
                        <span style={styles.summaryLabel}>Voucher</span>
                        <span style={styles.summaryValue}>Applied</span>
                    </div>
                )}
            </div>

            {/* Buyer info */}
            {order.buyer && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Buyer</h3>
                    <div style={styles.personRow}>
                        <Link to={`/profile/${order.buyer.id}`} style={styles.personName}>{order.buyer.name}</Link>
                        {(order.buyer.city || order.buyer.country) && (
                            <span style={styles.personMeta}>{[order.buyer.city, order.buyer.country].filter(Boolean).join(', ')}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Sellers info */}
            {order.sellers && order.sellers.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Sellers</h3>
                    <div style={styles.sellerList}>
                        {order.sellers.map(s => (
                            <div key={s.id} style={styles.personRow}>
                                <Link to={`/profile/${s.id}`} style={styles.personName}>{s.name}</Link>
                                {(s.city || s.country) && (
                                    <span style={styles.personMeta}>{[s.city, s.country].filter(Boolean).join(', ')}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Items */}
            {order.items && order.items.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Items ({order.items.length})</h3>
                    <div style={styles.itemList}>
                        {order.items.map((item, i) => (
                            <div key={i} style={styles.item}>
                                {item.image_url && <img src={item.image_url} alt={item.name} style={styles.itemImg} />}
                                <div style={styles.itemInfo}>
                                    <span style={styles.itemName}>{item.name || `Product #${item.product_id}`}</span>
                                    {item.seller_name && <span style={styles.itemSeller}>by {item.seller_name}</span>}
                                </div>
                                <div style={styles.itemRight}>
                                    <span style={styles.itemQty}>×{item.quantity}</span>
                                    <span style={styles.itemPrice}>${Number(item.price || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Seller response */}
            {response && (
                <div style={{ ...styles.section, borderLeft: `4px solid ${response.response_code === 'AB' ? '#27ae60' : response.response_code === 'RE' ? '#e74c3c' : '#2980b9'}` }}>
                    <h3 style={styles.sectionTitle}>Seller Response</h3>
                    <div style={styles.responseRow}>
                        <span style={{ ...styles.responseBadge, background: response.response_code === 'AB' ? '#27ae60' : response.response_code === 'RE' ? '#e74c3c' : '#2980b9' }}>
                            {response.response_code === 'AB' ? 'Accepted' : response.response_code === 'RE' ? 'Rejected' : 'Info Requested'}
                        </span>
                        <span style={styles.responseCode}>({response.response_code})</span>
                    </div>
                    {response.note && <p style={styles.responseNote}>{response.note}</p>}
                </div>
            )}

            {/* Cancellation */}
            {cancellation && (
                <div style={{ ...styles.section, borderLeft: '4px solid #e74c3c' }}>
                    <h3 style={styles.sectionTitle}>Order Cancelled</h3>
                    <p style={{ margin: 0, fontSize: 14 }}>Reason: {cancellation.reason}</p>
                </div>
            )}

            {/* XML Actions */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Documents (UBL/XML)</h3>
                <div style={styles.xmlBar}>
                    <button onClick={() => viewXml('order')} style={styles.xmlBtn}>View Order XML</button>
                    <button onClick={() => downloadXml('order')} style={styles.xmlBtn}>⬇ Order XML</button>
                    {response && <>
                        <button onClick={() => viewXml('response')} style={styles.xmlBtn}>View Response XML</button>
                        <button onClick={() => downloadXml('response')} style={styles.xmlBtn}>⬇ Response XML</button>
                    </>}
                    {cancellation && <>
                        <button onClick={() => viewXml('cancel')} style={styles.xmlBtn}>View Cancellation XML</button>
                        <button onClick={() => downloadXml('cancel')} style={styles.xmlBtn}>⬇ Cancellation XML</button>
                    </>}
                </div>
                {xmlView && (
                    <div style={styles.xmlBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <strong style={{ color: '#d4d4d4' }}>XML</strong>
                            <button onClick={() => setXmlView(null)} style={styles.closeBtn}>✕ Close</button>
                        </div>
                        <pre style={styles.xmlPre}>{xmlView}</pre>
                    </div>
                )}
            </div>

            {/* Seller actions */}
            {isSeller && order.status === 'pending' && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Respond to Order</h3>
                    <div style={styles.actions}>
                        <button onClick={() => respondToOrder('AB')} style={styles.acceptBtn}>✓ Accept (AB)</button>
                        <button onClick={() => respondToOrder('RE')} style={styles.rejectBtn}>✗ Reject (RE)</button>
                        <button onClick={() => respondToOrder('IP')} style={styles.infoBtn}>ℹ Request Info (IP)</button>
                    </div>
                </div>
            )}

            {/* Buyer cancel */}
            {isBuyer && order.status === 'pending' && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Actions</h3>
                    <button onClick={cancelOrder} style={styles.rejectBtn}>Cancel Order</button>
                </div>
            )}

            {/* Chat */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Order Chat</h3>
                {chats.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>No chats yet.</p>
                ) : (
                    <div style={styles.chatList}>
                        {chats.map(c => {
                            const seller = sellerMap[c.seller_id];
                            return (
                                <button key={c.id} onClick={() => loadChat(c.seller_id)} style={{ ...styles.chatTab, background: activeChat === c.seller_id ? '#111' : '#f0f0f0', color: activeChat === c.seller_id ? '#fff' : '#111' }}>
                                    {seller ? seller.name : `Seller #${c.seller_id}`}
                                    <span style={{ ...styles.chatStatus, background: activeChat === c.seller_id ? '#444' : '#ddd', color: activeChat === c.seller_id ? '#ccc' : '#666' }}>{c.status}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
                {isSeller && (
                    <button onClick={async () => {
                        await api.post(`/orders/${id}/chat/${user.id}`);
                        load();
                    }} style={{ ...styles.infoBtn, marginTop: 8 }}>
                        Open Chat as Seller
                    </button>
                )}
                {activeChat && (
                    <div style={styles.chatBox}>
                        <div style={styles.messages}>
                            {chatMessages.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No messages yet.</p>}
                            {chatMessages.map(m => (
                                <div key={m.id} style={{ ...styles.message, alignSelf: m.sender_id === user?.id ? 'flex-end' : 'flex-start', background: m.sender_id === user?.id ? '#111' : '#e9e9e9', color: m.sender_id === user?.id ? '#fff' : '#111' }}>
                                    <span style={styles.msgRole}>{m.sender_role}</span>
                                    <p style={{ margin: 0 }}>{m.message}</p>
                                    {m.action && <span style={styles.msgAction}>Action: {m.action}</span>}
                                </div>
                            ))}
                        </div>
                        <div style={styles.msgInputRow}>
                            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Type a message..." style={styles.msgInputField} onKeyDown={e => e.key === 'Enter' && sendMessage(activeChat)} />
                            <button onClick={() => sendMessage(activeChat)} style={styles.sendBtn}>Send</button>
                        </div>
                        <div style={styles.finalizeRow}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Finalize:</span>
                            <button onClick={() => finalizeChat(activeChat, 'accept')} style={styles.acceptBtn}>Accept</button>
                            <button onClick={() => finalizeChat(activeChat, 'reject')} style={styles.rejectBtn}>Reject</button>
                            <button onClick={() => finalizeChat(activeChat, 'confirm')} style={styles.infoBtn}>Confirm</button>
                            <button onClick={() => finalizeChat(activeChat, 'cancel')} style={{ ...styles.rejectBtn, background: '#888' }}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 860, margin: '0 auto' },
    back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16, padding: 0 },
    header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
    badge: { color: '#fff', padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
    summaryRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
    summaryCard: { display: 'flex', flexDirection: 'column', padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 100 },
    summaryLabel: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    summaryValue: { fontSize: 16, fontWeight: 600 },
    section: { marginBottom: 16, padding: 16, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' },
    sectionTitle: { margin: '0 0 12px 0', fontSize: 15, fontWeight: 600 },
    personRow: { display: 'flex', alignItems: 'center', gap: 10 },
    personName: { fontWeight: 600, fontSize: 14, textDecoration: 'none' },
    personMeta: { color: 'var(--text-muted)', fontSize: 13 },
    sellerList: { display: 'flex', flexDirection: 'column', gap: 8 },
    itemList: { display: 'flex', flexDirection: 'column', gap: 8 },
    item: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' },
    itemImg: { width: 48, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0, background: 'var(--surface-alt)' },
    itemInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
    itemName: { fontSize: 14, fontWeight: 500 },
    itemSeller: { fontSize: 12, color: 'var(--text-muted)' },
    itemRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
    itemQty: { fontSize: 13, color: 'var(--text-muted)' },
    itemPrice: { fontSize: 14, fontWeight: 600 },
    responseRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
    responseBadge: { color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600 },
    responseCode: { color: 'var(--text-muted)', fontSize: 13 },
    responseNote: { margin: 0, fontSize: 14, color: 'var(--text-muted)' },
    xmlBar: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    xmlBtn: { padding: '6px 12px', background: '#2980b9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    xmlBox: { background: '#1e1e1e', borderRadius: 8, padding: 16 },
    xmlPre: { color: '#d4d4d4', fontSize: 12, overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 },
    closeBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14 },
    actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    acceptBtn: { padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    rejectBtn: { padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    infoBtn: { padding: '8px 16px', background: '#2980b9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    chatList: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    chatTab: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    chatStatus: { padding: '1px 6px', borderRadius: 8, fontSize: 11 },
    chatBox: { marginTop: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' },
    messages: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, minHeight: 120, maxHeight: 300, overflowY: 'auto', background: 'var(--surface-alt)' },
    message: { maxWidth: '70%', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
    msgRole: { fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 2, textTransform: 'capitalize' },
    msgAction: { fontSize: 11, marginTop: 4, display: 'block', fontStyle: 'italic' },
    msgInputRow: { display: 'flex', borderTop: '1px solid var(--border)' },
    msgInputField: { flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, background: 'var(--surface)', color: 'var(--text)' },
    sendBtn: { padding: '10px 16px', background: '#111', color: '#fff', border: 'none', cursor: 'pointer' },
    finalizeRow: { display: 'flex', gap: 8, padding: '8px 12px', background: 'var(--surface-alt)', alignItems: 'center', flexWrap: 'wrap' },
};
