import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myBusinesses, setMyBusinesses] = useState([]);
    const [sellerOrders, setSellerOrders] = useState([]);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [productForm, setProductForm] = useState({ name: '', price: '', tags: '', business_id: '' });
    const [imageFile, setImageFile] = useState(null);

    useEffect(() => {
        api.get('/businesses')
            .then(r => setMyBusinesses(r.data))
            .catch(() => {});

        api.get(`/orders?seller_id=${user?.id}`)
            .then(r => setSellerOrders(r.data))
            .catch(() => setSellerOrders([]));
    }, [user?.id]);

    async function addProduct(e) {
        e.preventDefault();
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
                business_id: productForm.business_id ? Number(productForm.business_id) : null,
            });
            alert('Product added!');
            setShowAddProduct(false);
            setProductForm({ name: '', price: '', tags: '', business_id: '' });
            setImageFile(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    const statusColor = { pending: '#f39c12', confirmed: '#27ae60', rejected: '#e74c3c', cancelled: '#95a5a6' };

    return (
        <div style={styles.wrap}>
            <h2 style={{ marginBottom: 24 }}>Dashboard</h2>

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
                        <input placeholder="Business ID (optional)" value={productForm.business_id} onChange={e => setProductForm(f => ({ ...f, business_id: e.target.value }))} style={styles.input} />
                        <label style={styles.label}>Product image</label>
                        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
                        <button type="submit" style={styles.btn}>Add Product</button>
                    </form>
                )}
            </div>

            {/* Incoming Orders */}
            <div style={styles.section}>
                <h3 style={{ marginBottom: 12 }}>Incoming Orders</h3>
                {sellerOrders.length === 0 ? (
                    <p style={{ color: '#888' }}>No orders yet.</p>
                ) : (
                    <div style={styles.orderList}>
                        {sellerOrders.map(o => (
                            <div key={o.id} style={styles.orderRow}>
                                <span>Order #{o.id}</span>
                                <span style={{ ...styles.badge, background: statusColor[o.status] || '#999' }}>{o.status}</span>
                                <span>${Number(o.total_price || 0).toFixed(2)}</span>
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
                    <p style={{ color: '#888' }}>Not part of any business. <span style={styles.link} onClick={() => navigate('/businesses')}>Create one</span></p>
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
    section: { marginBottom: 32, padding: 20, border: '1px solid #eee', borderRadius: 8 },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    form: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 },
    input: { padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 },
    label: { fontSize: 13, fontWeight: 600 },
    btn: { padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    orderList: { display: 'flex', flexDirection: 'column', gap: 8 },
    orderRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px', background: '#f9f9f9', borderRadius: 4 },
    badge: { color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12 },
    viewBtn: { marginLeft: 'auto', padding: '4px 12px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
    bizList: { display: 'flex', flexDirection: 'column', gap: 8 },
    bizRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f9f9f9', borderRadius: 4, cursor: 'pointer' },
    meta: { color: '#888', fontSize: 13 },
    link: { color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' },
};
