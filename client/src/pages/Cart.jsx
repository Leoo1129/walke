import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useCurrency } from '../context/CurrencyContext';

export default function Cart() {
    const [cart, setCart] = useState([]);
    const [voucher, setVoucher] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();

    async function load() {
        try {
            const r = await api.get('/cart');
            setCart(r.data);
        } catch {
            setCart([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function updateQty(pid, qty) {
        if (qty < 1) return removeItem(pid);
        await api.patch(`/cart/${pid}`, { quantity: qty });
        load();
    }

    async function removeItem(pid) {
        await api.delete(`/cart/${pid}`);
        load();
    }

    async function placeOrder() {
        try {
            const body = voucher ? { voucher_code: voucher } : {};
            await api.post('/orders', body);
            alert('Order placed!');
            navigate('/orders');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to place order');
        }
    }

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

    return (
        <div style={styles.wrap}>
            <h2 style={{ marginBottom: 24 }}>Cart</h2>
            {cart.length === 0 ? (
                <p>Your cart is empty. <span style={styles.link} onClick={() => navigate('/')}>Continue shopping</span></p>
            ) : (
                <>
                    <div style={styles.list}>
                        {cart.map(item => (
                            <div key={item.product_id} style={styles.row}>
                                {item.image_url && <img src={item.image_url} alt={item.name} style={styles.img} />}
                                <div style={styles.info}>
                                    <p style={styles.name}>{item.name}</p>
                                    <p style={styles.price}>{formatPrice(item.price)} each</p>
                                </div>
                                <div style={styles.qtyWrap}>
                                    <button onClick={() => updateQty(item.product_id, item.quantity - 1)} style={styles.qtyBtn}>−</button>
                                    <span style={styles.qty}>{item.quantity}</span>
                                    <button onClick={() => updateQty(item.product_id, item.quantity + 1)} style={styles.qtyBtn}>+</button>
                                </div>
                                <p style={styles.lineTotal}>{formatPrice(item.price * item.quantity)}</p>
                                <button onClick={() => removeItem(item.product_id)} style={styles.removeBtn}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div style={styles.summary}>
                        <input
                            placeholder="Voucher code (optional)"
                            value={voucher}
                            onChange={e => setVoucher(e.target.value)}
                            style={styles.input}
                        />
                        <p style={styles.total}>Total: <strong>{formatPrice(total)}</strong></p>
                        <button onClick={placeOrder} style={styles.orderBtn}>Place Order</button>
                    </div>
                </>
            )}
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 700, margin: '0 auto' },
    list: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 8 },
    img: { width: 60, height: 60, objectFit: 'cover', borderRadius: 4 },
    info: { flex: 1 },
    name: { fontWeight: 600, marginBottom: 2 },
    price: { fontSize: 13, color: 'var(--text-muted)' },
    qtyWrap: { display: 'flex', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 28, height: 28, border: '1px solid var(--border-input)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', borderRadius: 4, fontSize: 16 },
    qty: { width: 24, textAlign: 'center', fontSize: 15 },
    lineTotal: { fontWeight: 600, minWidth: 60, textAlign: 'right' },
    removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 },
    summary: { padding: 16, background: 'var(--surface-alt)', borderRadius: 8 },
    input: { padding: '8px 12px', border: '1px solid var(--border-input)', borderRadius: 4, fontSize: 14, marginBottom: 12, width: '100%' },
    total: { fontSize: 18, marginBottom: 12 },
    orderBtn: { width: '100%', padding: '12px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 },
    link: { color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' },
};
