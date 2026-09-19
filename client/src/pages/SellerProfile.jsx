import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../api';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

export default function SellerProfile() {
    const toast = useToast();
    const { refreshCart } = useCart();
    const { id } = useParams();
    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const { isLoggedIn } = useAuth();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/users/${id}`).then(r => setSeller(r.data)).catch(() => navigate('/'));
        api.get(`/products?seller_id=${id}`).then(r => setProducts(r.data)).catch(() => setProducts([]));
    }, [id, navigate]);

    async function addToCart(product_id) {
        if (!isLoggedIn) return navigate('/login');
        try {
            await api.post('/cart', { product_id, quantity: 1 });
            toast.success('Added to cart');
            refreshCart();
        } catch (err) {
            toast.error(apiError(err));
        }
    }

    if (!seller) return <p style={{ padding: 24 }}>Loading...</p>;

    return (
        <div style={styles.wrap}>
            <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>
            <div style={styles.header}>
                {seller.logo_url && <img src={seller.logo_url} alt={seller.name} style={styles.avatar} />}
                <div>
                    <h2>{seller.name}</h2>
                    {seller.bio && <p style={styles.bio}>{seller.bio}</p>}
                    {seller.city && <p style={styles.location}>{seller.city}, {seller.country}</p>}
                </div>
            </div>

            <h3 style={styles.sectionTitle}>Listings ({products.length})</h3>
            {products.length === 0 ? (
                <p style={{ color: '#888' }}>No listings yet.</p>
            ) : (
                <div style={styles.grid}>
                    {products.map(p => (
                        <div key={p.id} style={styles.card}>
                            {p.image_url && <img src={p.image_url} alt={p.name} style={styles.cardImg} />}
                            <div style={styles.cardBody}>
                                <p style={styles.productName} onClick={() => navigate(`/products/${p.id}`)}>{p.name}</p>
                                <p style={styles.price}>{formatPrice(p.price)}</p>
                                <button onClick={() => addToCart(p.id)} style={styles.btn}>Add to Cart</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 960, margin: '0 auto' },
    back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16, padding: 0 },
    header: { display: 'flex', gap: 20, alignItems: 'center', marginBottom: 32, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 },
    avatar: { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' },
    bio: { color: 'var(--text-muted)', marginTop: 4 },
    location: { color: 'var(--text-muted)', fontSize: 13, marginTop: 4 },
    sectionTitle: { marginBottom: 16, fontSize: 18 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
    card: { border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' },
    cardImg: { width: '100%', height: 140, objectFit: 'cover' },
    cardBody: { padding: 12 },
    productName: { fontWeight: 600, cursor: 'pointer', marginBottom: 4, fontSize: 14 },
    price: { fontWeight: 700, marginBottom: 8 },
    btn: { width: '100%', padding: '6px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
