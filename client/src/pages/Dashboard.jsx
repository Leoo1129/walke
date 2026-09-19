import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

export default function Dashboard() {
    const toast = useToast();
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();
    const [myBusinesses, setMyBusinesses] = useState([]);
    const [adminBusinesses, setAdminBusinesses] = useState([]);
    const [sellerOrders, setSellerOrders] = useState([]);
    const [myProducts, setMyProducts] = useState([]);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showAddVoucher, setShowAddVoucher] = useState(false);
    const [productForm, setProductForm] = useState({ name: '', price: '', tags: '', business_id: '' });
    const [voucherForm, setVoucherForm] = useState({ name: '', discount: '', expiry: '', max_uses: '', business_id: '' });
    const [imageFile, setImageFile] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', price: '', tags: '' });
    const [editImageFile, setEditImageFile] = useState(null);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', street: '', city: '', postcode: '', country: '', bio: '' });
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [emailVerificationSent, setEmailVerificationSent] = useState(false);

    function loadMyProducts() {
        if (!user?.id) return;
        api.get(`/products?seller_id=${user.id}`)
            .then(r => setMyProducts(r.data))
            .catch(() => setMyProducts([]));
    }

    useEffect(() => {
        if (!user?.id) return;
        api.get(`/businesses?member_id=${user.id}`)
            .then(r => setMyBusinesses(r.data))
            .catch(() => {});
        api.get(`/orders?seller_id=${user.id}`)
            .then(r => setSellerOrders(r.data))
            .catch(() => setSellerOrders([]));
        api.get(`/users/${user.id}`)
            .then(r => setProfileForm({
                name: r.data.name || '',
                email: r.data.email || '',
                street: r.data.street || '',
                city: r.data.city || '',
                postcode: r.data.postcode || '',
                country: r.data.country || '',
                bio: r.data.bio || '',
            }))
            .catch(() => {});
        loadMyProducts();
    }, [user?.id]);

    // Resolve which businesses the current user can manage vouchers for (admin or owner role)
    useEffect(() => {
        if (!user?.id || myBusinesses.length === 0) { setAdminBusinesses([]); return; }
        if (user.is_admin) { setAdminBusinesses(myBusinesses); return; }
        Promise.all(
            myBusinesses.map(b =>
                api.get(`/businesses/${b.id}/members`)
                    .then(r => {
                        const me = r.data.find(m => m.id === user.id);
                        return me && (me.role === 'owner' || me.role === 'admin') ? b : null;
                    })
                    .catch(() => null)
            )
        ).then(results => setAdminBusinesses(results.filter(Boolean)));
    }, [myBusinesses, user?.id]);

    async function addProduct(e) {
        e.preventDefault();
        const business_id = productForm.business_id ? Number(productForm.business_id) : null;

        // Check membership if business_id provided
        if (business_id) {
            const members = await api.get(`/businesses/${business_id}/members`).then(r => r.data).catch(() => []);
            const me = members.find(m => m.id === user.id);
            if (!me || me.role === 'viewer') {
                toast.error('You must be an editor, admin, or owner of this business to add products to it.');
                return;
            }
        }

        try {
            let image_url = null;
            if (imageFile) {
                const fd = new FormData();
                fd.append('image', imageFile);
                const { data } = await api.post('/images', fd);
                image_url = data.url;
            }
            const tags = productForm.tags ? productForm.tags.split(',').map(t => t.trim()) : [];
            await api.post('/products', {
                name: productForm.name,
                price: Number(productForm.price),
                seller_id: user.id,
                tags,
                image_url,
                business_id,
            });
            toast.success('Product added!');
            setShowAddProduct(false);
            setProductForm({ name: '', price: '', tags: '', business_id: '' });
            setImageFile(null);
            loadMyProducts();
        } catch (err) {
            toast.error(apiError(err));
        }
    }

    function startEditProduct(product) {
        setEditingProduct(product.id);
        setEditForm({
            name: product.name,
            price: product.price,
            tags: (product.tags || []).join(', '),
        });
        setEditImageFile(null);
    }

    async function saveEditProduct(e, productId) {
        e.preventDefault();
        try {
            let image_url;
            if (editImageFile) {
                const fd = new FormData();
                fd.append('image', editImageFile);
                const { data } = await api.post('/images', fd);
                image_url = data.url;
            }
            const tags = editForm.tags ? editForm.tags.split(',').map(t => t.trim()) : [];
            const payload = { name: editForm.name, price: Number(editForm.price), tags };
            if (image_url) payload.image_url = image_url;
            await api.patch(`/products/${productId}`, payload);
            setEditingProduct(null);
            setEditImageFile(null);
            loadMyProducts();
        } catch (err) {
            toast.error(apiError(err, 'Failed to update product'));
        }
    }

    async function removeProduct(productId) {
        if (!window.confirm('Remove this product?')) return;
        try {
            await api.delete(`/products/${productId}`);
            loadMyProducts();
        } catch (err) {
            toast.error(apiError(err, 'Failed to remove product'));
        }
    }

    async function saveProfile(e) {
        e.preventDefault();
        setEmailVerificationSent(false);
        try {
            let logo_url;
            if (profileImageFile) {
                const fd = new FormData();
                fd.append('image', profileImageFile);
                const { data } = await api.post('/images', fd);
                logo_url = data.url;
            }
            const payload = { ...profileForm };
            if (logo_url) payload.logo_url = logo_url;
            if (!payload.email) delete payload.email;
            const { data } = await api.patch(`/users/${user.id}`, payload);
            if (data.emailVerificationSent) {
                setEmailVerificationSent(true);
            }
            setShowEditProfile(false);
            setProfileImageFile(null);
        } catch (err) {
            toast.error(apiError(err, 'Failed to update profile'));
        }
    }

    async function addVoucher(e) {
        e.preventDefault();
        try {
            await api.post('/vouchers', {
                name: voucherForm.name,
                discount: Number(voucherForm.discount),
                expiry: voucherForm.expiry || null,
                max_uses: voucherForm.max_uses ? Number(voucherForm.max_uses) : null,
                business_id: voucherForm.business_id ? Number(voucherForm.business_id) : null,
            });
            toast.success('Voucher created!');
            setShowAddVoucher(false);
            setVoucherForm({ name: '', discount: '', expiry: '', max_uses: '', business_id: '' });
        } catch (err) {
            toast.error(apiError(err));
        }
    }

    const statusColor = { pending: '#f39c12', confirmed: '#27ae60', rejected: '#e74c3c', cancelled: '#95a5a6' };

    return (
        <div style={styles.wrap}>
            <h2 style={{ marginBottom: 24 }}>Dashboard</h2>

            {/* Edit Profile */}
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3>My Profile</h3>
                    <button onClick={() => setShowEditProfile(s => !s)} style={styles.btn}>
                        {showEditProfile ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>
                {emailVerificationSent && (
                    <p style={{ color: '#27ae60', margin: '8px 0 0' }}>
                        Verification email sent. Click the link in your inbox to confirm your new email address.
                    </p>
                )}
                {showEditProfile && (
                    <form onSubmit={saveProfile} style={styles.form}>
                        <input
                            placeholder="Display name"
                            value={profileForm.name}
                            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                            style={styles.input}
                        />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={profileForm.email}
                            onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                            style={styles.input}
                        />
                        <input
                            placeholder="Street address"
                            value={profileForm.street}
                            onChange={e => setProfileForm(f => ({ ...f, street: e.target.value }))}
                            style={styles.input}
                        />
                        <input
                            placeholder="City"
                            value={profileForm.city}
                            onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
                            style={styles.input}
                        />
                        <input
                            placeholder="Postcode"
                            value={profileForm.postcode}
                            onChange={e => setProfileForm(f => ({ ...f, postcode: e.target.value }))}
                            style={styles.input}
                        />
                        <input
                            placeholder="Country"
                            value={profileForm.country}
                            onChange={e => setProfileForm(f => ({ ...f, country: e.target.value }))}
                            style={styles.input}
                        />
                        <textarea
                            placeholder="Bio"
                            value={profileForm.bio}
                            onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                            style={{ ...styles.input, resize: 'vertical', minHeight: 80 }}
                        />
                        <label style={styles.label}>Profile photo</label>
                        <input type="file" accept="image/*" onChange={e => setProfileImageFile(e.target.files[0])} />
                        <button type="submit" style={styles.btn}>Save Changes</button>
                    </form>
                )}
            </div>

            {/* Add Product */}
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3>List a Product</h3>
                    <button onClick={() => setShowAddProduct(s => !s)} style={styles.btn}>
                        {showAddProduct ? 'Cancel' : '+ Add Product'}
                    </button>
                </div>
                {showAddProduct && (
                    <form onSubmit={addProduct} style={styles.form}>
                        <input placeholder="Product name" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} style={styles.input} required />
                        <input placeholder="Price" type="number" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} style={styles.input} required />
                        <input placeholder="Tags (comma separated)" value={productForm.tags} onChange={e => setProductForm(f => ({ ...f, tags: e.target.value }))} style={styles.input} />
                        <select value={productForm.business_id} onChange={e => setProductForm(f => ({ ...f, business_id: e.target.value }))} style={styles.input}>
                            <option value="">Personal listing (no business)</option>
                            {myBusinesses.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <label style={styles.label}>Product image</label>
                        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
                        <button type="submit" style={styles.btn}>Add Product</button>
                    </form>
                )}
            </div>

            {/* My Products */}
            <div style={styles.section}>
                <h3 style={{ marginBottom: 12 }}>My Listed Products</h3>
                {myProducts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No products listed yet.</p>
                ) : (
                    <div style={styles.orderList}>
                        {myProducts.map(p => (
                            <div key={p.id} style={styles.productRow}>
                                {editingProduct === p.id ? (
                                    <form onSubmit={e => saveEditProduct(e, p.id)} style={styles.editForm}>
                                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={styles.input} required />
                                        <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} style={styles.input} required />
                                        <input placeholder="Tags (comma separated)" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} style={styles.input} />
                                        <input type="file" accept="image/*" onChange={e => setEditImageFile(e.target.files[0])} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button type="submit" style={styles.btn}>Save</button>
                                            <button type="button" onClick={() => setEditingProduct(null)} style={styles.outlineBtn}>Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                                        <span style={{ color: '#555' }}>{formatPrice(p.price)}</span>
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                            <button onClick={() => startEditProduct(p)} style={styles.outlineBtn}>Edit</button>
                                            <button onClick={() => removeProduct(p.id)} style={styles.dangerBtn}>Remove</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Voucher — global admin OR business admin/owner */}
            {(user?.is_admin || adminBusinesses.length > 0) && (
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3>Create a Voucher</h3>
                    <button onClick={() => setShowAddVoucher(s => !s)} style={styles.btn}>
                        {showAddVoucher ? 'Cancel' : '+ Add Voucher'}
                    </button>
                </div>
                {!user?.is_admin && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '-8px 0 12px' }}>
                        You can create vouchers for businesses where you are an admin or owner.
                    </p>
                )}
                {showAddVoucher && (
                    <form onSubmit={addVoucher} style={styles.form}>
                        <input placeholder="Voucher code / name" value={voucherForm.name} onChange={e => setVoucherForm(f => ({ ...f, name: e.target.value }))} style={styles.input} required />
                        <input placeholder="Discount (e.g. 0.1 = 10% off, or 5 = $5 off)" type="number" step="0.01" value={voucherForm.discount} onChange={e => setVoucherForm(f => ({ ...f, discount: e.target.value }))} style={styles.input} required />
                        <input placeholder="Expiry date (optional)" type="datetime-local" value={voucherForm.expiry} onChange={e => setVoucherForm(f => ({ ...f, expiry: e.target.value }))} style={styles.input} />
                        <input placeholder="Max uses (optional)" type="number" value={voucherForm.max_uses} onChange={e => setVoucherForm(f => ({ ...f, max_uses: e.target.value }))} style={styles.input} />
                        <select
                            value={voucherForm.business_id}
                            onChange={e => setVoucherForm(f => ({ ...f, business_id: e.target.value }))}
                            style={styles.input}
                            required={!user?.is_admin}
                        >
                            {user?.is_admin && <option value="">Global voucher (works on all products)</option>}
                            {(user?.is_admin ? myBusinesses : adminBusinesses).map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <button type="submit" style={styles.btn}>Create Voucher</button>
                    </form>
                )}
            </div>
            )}

            {/* Incoming Orders */}
            <div style={styles.section}>
                <h3 style={{ marginBottom: 12 }}>Incoming Orders (as seller)</h3>
                {sellerOrders.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No orders yet.</p>
                ) : (
                    <div style={styles.orderList}>
                        {sellerOrders.map(o => (
                            <div key={o.id} style={styles.orderRow}>
                                <span>Order #{o.id}</span>
                                <span style={{ ...styles.badge, background: statusColor[o.status] || '#999' }}>{o.status}</span>
                                <span>{formatPrice(o.total_price || 0)}</span>
                                <button onClick={() => navigate(`/orders/${o.id}`)} style={styles.viewBtn}>View</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* My Businesses */}
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3>My Businesses</h3>
                    <button onClick={() => navigate('/businesses')} style={styles.btn}>Manage</button>
                </div>
                {myBusinesses.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Not part of any business. <span style={styles.link} onClick={() => navigate('/businesses')}>Create one</span></p>
                ) : (
                    <div style={styles.bizList}>
                        {myBusinesses.map(b => (
                            <div key={b.id} style={styles.bizRow} onClick={() => navigate(`/businesses/${b.id}`)}>
                                <span>{b.name}</span>
                                <span style={styles.meta}>{b.member_count} members</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 800, margin: '0 auto' },
    section: { marginBottom: 24, padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    form: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 },
    input: { padding: '8px 12px', fontSize: 14, border: '1px solid var(--border-input)', borderRadius: 4 },
    label: { fontSize: 13, fontWeight: 600 },
    btn: { padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    orderList: { display: 'flex', flexDirection: 'column', gap: 8 },
    orderRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 4 },
    badge: { color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12 },
    viewBtn: { marginLeft: 'auto', padding: '4px 12px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    bizList: { display: 'flex', flexDirection: 'column', gap: 8 },
    bizRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 4, cursor: 'pointer' },
    meta: { color: 'var(--text-muted)', fontSize: 13 },
    link: { color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' },
    productRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 4 },
    editForm: { display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', alignItems: 'center' },
    outlineBtn: { padding: '4px 12px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    dangerBtn: { padding: '4px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
};
