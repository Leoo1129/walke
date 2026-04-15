import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function BusinessStorefront() {
    const { id } = useParams();
    const [business, setBusiness] = useState(null);
    const [storefront, setStorefront] = useState(null);
    const [products, setProducts] = useState([]);
    const [members, setMembers] = useState([]);
    const { user, isLoggedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/businesses/${id}`).then(r => setBusiness(r.data)).catch(() => navigate('/businesses'));
        api.get(`/businesses/${id}/storefront`).then(r => setStorefront(r.data)).catch(() => setStorefront(null));
        api.get(`/products?business_id=${id}`).then(r => setProducts(r.data)).catch(() => setProducts([]));
        if (isLoggedIn) {
            api.get(`/businesses/${id}/members`).then(r => setMembers(r.data)).catch(() => setMembers([]));
        }
    }, [id]);

    const isMember = members.some(m => m.id === user?.id);
    const myRole = members.find(m => m.id === user?.id)?.role;

    async function addToCart(product_id) {
        if (!isLoggedIn) return navigate('/login');
        try {
            await api.post('/cart', { product_id, quantity: 1 });
            alert('Added to cart');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    if (!business) return <p style={{ padding: 24 }}>Loading...</p>;

    const bgColor = storefront?.primary_color || '#111';
    const accentColor = storefront?.accent_color || '#0066cc';
    const fontFamily = storefront?.font || 'sans-serif';

    return (
        <div style={{ fontFamily }}>
            {/* Hero banner */}
            <div style={{ ...styles.hero, background: bgColor, backgroundImage: storefront?.banner_url ? `url(${storefront.banner_url})` : undefined }}>
                {business.logo_url && <img src={business.logo_url} alt={business.name} style={styles.heroLogo} />}
                <h1 style={styles.heroTitle}>{storefront?.headline || business.name}</h1>
                {business.bio && <p style={styles.heroBio}>{business.bio}</p>}
                {(isMember && ['owner', 'admin', 'editor'].includes(myRole)) && (
                    <button onClick={() => navigate(`/businesses/${id}/builder`)} style={{ ...styles.editBtn, background: accentColor }}>
                        Edit Storefront
                    </button>
                )}
            </div>

            {/* Products */}
            <div style={styles.wrap}>
                <h2 style={{ marginBottom: 20 }}>Products</h2>
                {products.length === 0 ? (
                    <p style={{ color: '#888' }}>No products listed yet.</p>
                ) : (
                    <div style={storefront?.layout === 'list' ? styles.list : styles.grid}>
                        {products.map(p => (
                            <div key={p.id} style={styles.card}>
                                {p.image_url && <img src={p.image_url} alt={p.name} style={styles.cardImg} />}
                                <div style={styles.cardBody}>
                                    <p style={styles.productName} onClick={() => navigate(`/products/${p.id}`)}>{p.name}</p>
                                    <p style={{ ...styles.price, color: accentColor }}>${Number(p.price).toFixed(2)}</p>
                                    <button onClick={() => addToCart(p.id)} style={{ ...styles.btn, background: bgColor }}>Add to Cart</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Members section (visible to members) */}
            {isMember && (
                <div style={styles.wrap}>
                    <h3 style={{ marginBottom: 12 }}>Team</h3>
                    <div style={styles.memberList}>
                        {members.map(m => (
                            <div key={m.id} style={styles.member}>
                                <span>{m.name}</span>
                                <span style={styles.role}>{m.role}</span>
                            </div>
                        ))}
                    </div>
                    {['owner', 'admin'].includes(myRole) && (
                        <button onClick={() => navigate(`/businesses/${id}/manage`)} style={styles.manageBtn}>
                            Manage Members
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    hero: { padding: '60px 24px', textAlign: 'center', color: '#fff', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 200 },
    heroLogo: { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 12, border: '3px solid rgba(255,255,255,0.3)' },
    heroTitle: { fontSize: 36, fontWeight: 700, marginBottom: 8 },
    heroBio: { opacity: 0.8, maxWidth: 500, margin: '0 auto 16px' },
    editBtn: { padding: '8px 20px', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 12 },
    wrap: { padding: '32px 24px', maxWidth: 1000, margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
    list: { display: 'flex', flexDirection: 'column', gap: 12 },
    card: { border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' },
    cardImg: { width: '100%', height: 140, objectFit: 'cover' },
    cardBody: { padding: 12 },
    productName: { fontWeight: 600, cursor: 'pointer', marginBottom: 4, fontSize: 14 },
    price: { fontWeight: 700, marginBottom: 8 },
    btn: { width: '100%', padding: '6px', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    memberList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
    member: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 },
    role: { color: '#666', fontSize: 13, textTransform: 'capitalize' },
    manageBtn: { padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
