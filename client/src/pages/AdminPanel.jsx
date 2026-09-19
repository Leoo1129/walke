import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const TABS = ['Users', 'Orders', 'Products', 'Vouchers'];

export default function AdminPanel() {
    const toast = useToast();
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();
    const [tab, setTab] = useState('Users');

    // Users
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [userEditForm, setUserEditForm] = useState({});

    // Orders
    const [orders, setOrders] = useState([]);

    // Products
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productEditForm, setProductEditForm] = useState({});

    // Vouchers
    const [vouchers, setVouchers] = useState([]);
    const [showCreateVoucher, setShowCreateVoucher] = useState(false);
    const [voucherForm, setVoucherForm] = useState({ name: '', discount: '', expiry: '', max_uses: '', business_id: '' });
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [voucherEditForm, setVoucherEditForm] = useState({});

    function loadAll() {
        loadUsers();
        loadOrders();
        loadProducts();
        loadVouchers();
    }

    function loadUsers() {
        api.get('/users').then(r => setUsers(r.data)).catch(() => setUsers([]));
    }

    function loadOrders() {
        api.get('/orders').then(r => setOrders(r.data)).catch(err => {
            if (err.response?.status === 404) setOrders([]);
        });
    }

    function loadProducts() {
        api.get('/products').then(r => setProducts(r.data)).catch(() => setProducts([]));
    }

    function loadVouchers() {
        api.get('/vouchers').then(r => setVouchers(r.data)).catch(err => {
            if (err.response?.status === 404) setVouchers([]);
        });
    }

    // Declared after the loaders it calls; admins only
    useEffect(() => {
        if (!user?.is_admin) { navigate('/'); return; }
        loadAll();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    // -- User actions --
    function startEditUser(u) {
        setEditingUser(u.id);
        setUserEditForm({ name: u.name || '', bio: u.bio || '', street: u.street || '', city: u.city || '', postcode: u.postcode || '', country: u.country || '' });
    }

    async function saveUser(e, userId) {
        e.preventDefault();
        try {
            await api.patch(`/users/${userId}`, userEditForm);
            setEditingUser(null);
            loadUsers();
        } catch (err) {
            toast.error(apiError(err, 'Failed to update user'));
        }
    }

    async function deleteUser(userId) {
        if (!window.confirm('Delete this user? This will soft-delete their account and cancel their orders.')) return;
        try {
            await api.delete(`/users/${userId}`);
            loadUsers();
        } catch (err) {
            toast.error(apiError(err, 'Failed to delete user'));
        }
    }

    // -- Product actions --
    function startEditProduct(p) {
        setEditingProduct(p.id);
        setProductEditForm({ name: p.name, price: p.price, tags: (p.tags || []).join(', ') });
    }

    async function saveProduct(e, productId) {
        e.preventDefault();
        try {
            const tags = productEditForm.tags ? productEditForm.tags.split(',').map(t => t.trim()) : [];
            await api.patch(`/products/${productId}`, { name: productEditForm.name, price: Number(productEditForm.price), tags });
            setEditingProduct(null);
            loadProducts();
        } catch (err) {
            toast.error(apiError(err, 'Failed to update product'));
        }
    }

    async function deleteProduct(productId) {
        if (!window.confirm('Remove this product? It will be hidden from the marketplace.')) return;
        try {
            await api.delete(`/products/${productId}`);
            loadProducts();
        } catch (err) {
            toast.error(apiError(err, 'Failed to remove product'));
        }
    }

    // -- Voucher actions --
    async function createVoucher(e) {
        e.preventDefault();
        try {
            await api.post('/vouchers', {
                name: voucherForm.name,
                discount: Number(voucherForm.discount),
                expiry: voucherForm.expiry || null,
                max_uses: voucherForm.max_uses ? Number(voucherForm.max_uses) : null,
                business_id: voucherForm.business_id ? Number(voucherForm.business_id) : null,
            });
            setShowCreateVoucher(false);
            setVoucherForm({ name: '', discount: '', expiry: '', max_uses: '', business_id: '' });
            loadVouchers();
        } catch (err) {
            toast.error(apiError(err, 'Failed to create voucher'));
        }
    }

    function startEditVoucher(v) {
        setEditingVoucher(v.id);
        setVoucherEditForm({ name: v.name, discount: v.discount, expiry: v.expiry ? v.expiry.slice(0, 16) : '', max_uses: v.max_uses || '' });
    }

    async function saveVoucher(e, voucherId) {
        e.preventDefault();
        try {
            await api.patch(`/vouchers/${voucherId}`, {
                name: voucherEditForm.name,
                discount: Number(voucherEditForm.discount),
                expiry: voucherEditForm.expiry || null,
                max_uses: voucherEditForm.max_uses ? Number(voucherEditForm.max_uses) : null,
            });
            setEditingVoucher(null);
            loadVouchers();
        } catch (err) {
            toast.error(apiError(err, 'Failed to update voucher'));
        }
    }

    async function deleteVoucher(voucherId) {
        if (!window.confirm('Delete this voucher?')) return;
        try {
            await api.delete(`/vouchers/${voucherId}`);
            loadVouchers();
        } catch (err) {
            toast.error(apiError(err, 'Failed to delete voucher'));
        }
    }

    const statusColor = { pending: '#f39c12', confirmed: '#27ae60', rejected: '#e74c3c', cancelled: '#95a5a6' };

    return (
        <div style={s.wrap}>
            <h2 style={{ marginBottom: 4 }}>Admin Panel</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>Walke administration — handle with care.</p>

            {/* Tabs */}
            <div style={s.tabs}>
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}>
                        {t}
                    </button>
                ))}
            </div>

            {/* ── Users ── */}
            {tab === 'Users' && (
                <div style={s.section}>
                    <h3 style={s.sectionTitle}>All Users ({users.length})</h3>
                    {users.length === 0 ? <p style={s.empty}>No users found.</p> : (
                        <div style={s.list}>
                            {users.map(u => (
                                <div key={u.id} style={s.card}>
                                    {editingUser === u.id ? (
                                        <form onSubmit={e => saveUser(e, u.id)} style={s.editForm}>
                                            <div style={s.editGrid}>
                                                <input placeholder="Name" value={userEditForm.name} onChange={e => setUserEditForm(f => ({ ...f, name: e.target.value }))} style={s.input} />
                                                <input placeholder="Bio" value={userEditForm.bio} onChange={e => setUserEditForm(f => ({ ...f, bio: e.target.value }))} style={s.input} />
                                                <input placeholder="Street" value={userEditForm.street} onChange={e => setUserEditForm(f => ({ ...f, street: e.target.value }))} style={s.input} />
                                                <input placeholder="City" value={userEditForm.city} onChange={e => setUserEditForm(f => ({ ...f, city: e.target.value }))} style={s.input} />
                                                <input placeholder="Postcode" value={userEditForm.postcode} onChange={e => setUserEditForm(f => ({ ...f, postcode: e.target.value }))} style={s.input} />
                                                <input placeholder="Country" value={userEditForm.country} onChange={e => setUserEditForm(f => ({ ...f, country: e.target.value }))} style={s.input} />
                                            </div>
                                            <div style={s.rowGap}>
                                                <button type="submit" style={s.btn}>Save</button>
                                                <button type="button" onClick={() => setEditingUser(null)} style={s.outlineBtn}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div style={s.cardRow}>
                                            <div>
                                                <span style={s.name}>{u.name}</span>
                                                {u.is_admin && <span style={s.adminBadge}>ADMIN</span>}
                                                {!u.is_active && <span style={s.inactiveBadge}>INACTIVE</span>}
                                                <span style={s.meta}> · ID {u.id} · {u.city || '—'}, {u.country || '—'}</span>
                                            </div>
                                            <div style={s.rowGap}>
                                                <button onClick={() => navigate(`/profile/${u.id}`)} style={s.outlineBtn}>View</button>
                                                <button onClick={() => startEditUser(u)} style={s.outlineBtn}>Edit</button>
                                                {u.id !== user.id && (
                                                    <button onClick={() => deleteUser(u.id)} style={s.dangerBtn}>Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Orders ── */}
            {tab === 'Orders' && (
                <div style={s.section}>
                    <h3 style={s.sectionTitle}>All Orders ({orders.length})</h3>
                    {orders.length === 0 ? <p style={s.empty}>No orders found.</p> : (
                        <div style={s.list}>
                            {orders.map(o => (
                                <div key={o.id} style={{ ...s.card, ...s.cardRow }}>
                                    <div>
                                        <span style={s.name}>Order #{o.id}</span>
                                        <span style={s.meta}> · Buyer: {o.buyer_name || o.buyer_id}</span>
                                        <span style={s.meta}> · {formatPrice(o.total_price || 0)}</span>
                                    </div>
                                    <div style={s.rowGap}>
                                        <span style={{ ...s.badge, background: statusColor[o.status] || '#999' }}>{o.status}</span>
                                        <button onClick={() => navigate(`/orders/${o.id}`)} style={s.outlineBtn}>View</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Products ── */}
            {tab === 'Products' && (
                <div style={s.section}>
                    <h3 style={s.sectionTitle}>All Products ({products.length})</h3>
                    {products.length === 0 ? <p style={s.empty}>No products found.</p> : (
                        <div style={s.list}>
                            {products.map(p => (
                                <div key={p.id} style={s.card}>
                                    {editingProduct === p.id ? (
                                        <form onSubmit={e => saveProduct(e, p.id)} style={s.editForm}>
                                            <div style={s.editGrid}>
                                                <input placeholder="Name" value={productEditForm.name} onChange={e => setProductEditForm(f => ({ ...f, name: e.target.value }))} style={s.input} required />
                                                <input type="number" step="0.01" placeholder="Price" value={productEditForm.price} onChange={e => setProductEditForm(f => ({ ...f, price: e.target.value }))} style={s.input} required />
                                                <input placeholder="Tags (comma separated)" value={productEditForm.tags} onChange={e => setProductEditForm(f => ({ ...f, tags: e.target.value }))} style={s.input} />
                                            </div>
                                            <div style={s.rowGap}>
                                                <button type="submit" style={s.btn}>Save</button>
                                                <button type="button" onClick={() => setEditingProduct(null)} style={s.outlineBtn}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div style={s.cardRow}>
                                            <div>
                                                <span style={s.name}>{p.name}</span>
                                                <span style={s.meta}> · {formatPrice(p.price)} · Seller: {p.seller_name || p.seller_id}</span>
                                                {p.business_name && <span style={s.meta}> · {p.business_name}</span>}
                                            </div>
                                            <div style={s.rowGap}>
                                                <button onClick={() => navigate(`/products/${p.id}`)} style={s.outlineBtn}>View</button>
                                                <button onClick={() => startEditProduct(p)} style={s.outlineBtn}>Edit</button>
                                                <button onClick={() => deleteProduct(p.id)} style={s.dangerBtn}>Remove</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Vouchers ── */}
            {tab === 'Vouchers' && (
                <div style={s.section}>
                    <div style={s.sectionHeader}>
                        <h3 style={s.sectionTitle}>All Vouchers ({vouchers.length})</h3>
                        <button onClick={() => setShowCreateVoucher(v => !v)} style={s.btn}>
                            {showCreateVoucher ? 'Cancel' : '+ New Voucher'}
                        </button>
                    </div>

                    {showCreateVoucher && (
                        <form onSubmit={createVoucher} style={{ ...s.editForm, marginBottom: 20 }}>
                            <div style={s.editGrid}>
                                <input placeholder="Voucher code / name" value={voucherForm.name} onChange={e => setVoucherForm(f => ({ ...f, name: e.target.value }))} style={s.input} required />
                                <input type="number" step="0.01" placeholder="Discount (e.g. 0.1 = 10% off, 5 = $5 off)" value={voucherForm.discount} onChange={e => setVoucherForm(f => ({ ...f, discount: e.target.value }))} style={s.input} required />
                                <input type="datetime-local" placeholder="Expiry (optional)" value={voucherForm.expiry} onChange={e => setVoucherForm(f => ({ ...f, expiry: e.target.value }))} style={s.input} />
                                <input type="number" placeholder="Max uses (optional)" value={voucherForm.max_uses} onChange={e => setVoucherForm(f => ({ ...f, max_uses: e.target.value }))} style={s.input} />
                                <input type="number" placeholder="Business ID (optional, leave blank for global)" value={voucherForm.business_id} onChange={e => setVoucherForm(f => ({ ...f, business_id: e.target.value }))} style={s.input} />
                            </div>
                            <button type="submit" style={s.btn}>Create Voucher</button>
                        </form>
                    )}

                    {vouchers.length === 0 ? <p style={s.empty}>No vouchers yet.</p> : (
                        <div style={s.list}>
                            {vouchers.map(v => (
                                <div key={v.id} style={s.card}>
                                    {editingVoucher === v.id ? (
                                        <form onSubmit={e => saveVoucher(e, v.id)} style={s.editForm}>
                                            <div style={s.editGrid}>
                                                <input placeholder="Name" value={voucherEditForm.name} onChange={e => setVoucherEditForm(f => ({ ...f, name: e.target.value }))} style={s.input} required />
                                                <input type="number" step="0.01" placeholder="Discount" value={voucherEditForm.discount} onChange={e => setVoucherEditForm(f => ({ ...f, discount: e.target.value }))} style={s.input} required />
                                                <input type="datetime-local" placeholder="Expiry" value={voucherEditForm.expiry} onChange={e => setVoucherEditForm(f => ({ ...f, expiry: e.target.value }))} style={s.input} />
                                                <input type="number" placeholder="Max uses" value={voucherEditForm.max_uses} onChange={e => setVoucherEditForm(f => ({ ...f, max_uses: e.target.value }))} style={s.input} />
                                            </div>
                                            <div style={s.rowGap}>
                                                <button type="submit" style={s.btn}>Save</button>
                                                <button type="button" onClick={() => setEditingVoucher(null)} style={s.outlineBtn}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div style={s.cardRow}>
                                            <div>
                                                <span style={s.name}>{v.name}</span>
                                                <span style={s.meta}>
                                                    {' · '}
                                                    {v.discount < 1 ? `${Math.round(v.discount * 100)}% off` : `$${v.discount} off`}
                                                    {v.business_id ? ` · Business #${v.business_id}` : ' · Global'}
                                                    {v.expiry ? ` · Expires ${new Date(v.expiry).toLocaleDateString()}` : ''}
                                                    {v.max_uses ? ` · Max ${v.max_uses} uses` : ''}
                                                </span>
                                            </div>
                                            <div style={s.rowGap}>
                                                <button onClick={() => startEditVoucher(v)} style={s.outlineBtn}>Edit</button>
                                                <button onClick={() => deleteVoucher(v.id)} style={s.dangerBtn}>Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const s = {
    wrap: { padding: 24, maxWidth: 900, margin: '0 auto' },
    tabs: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 },
    tab: { padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', borderBottom: '2px solid transparent', marginBottom: -1 },
    tabActive: { color: 'var(--text)', borderBottom: '2px solid #111', fontWeight: 600 },
    section: { },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 600 },
    list: { display: 'flex', flexDirection: 'column', gap: 8 },
    card: { padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)' },
    cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    editForm: { display: 'flex', flexDirection: 'column', gap: 10 },
    editGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 },
    input: { padding: '7px 10px', fontSize: 13, border: '1px solid var(--border-input)', borderRadius: 4, background: 'var(--surface)', color: 'var(--text)' },
    btn: { padding: '7px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    outlineBtn: { padding: '6px 12px', background: 'none', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    dangerBtn: { padding: '6px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    rowGap: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
    name: { fontWeight: 600, fontSize: 14 },
    meta: { color: 'var(--text-muted)', fontSize: 13 },
    badge: { color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 12, whiteSpace: 'nowrap' },
    adminBadge: { marginLeft: 8, background: '#8e44ad', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 },
    inactiveBadge: { marginLeft: 6, background: '#95a5a6', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 11 },
    empty: { color: 'var(--text-muted)', fontStyle: 'italic' },
};
