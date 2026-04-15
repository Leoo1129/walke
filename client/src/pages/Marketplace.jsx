import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Marketplace() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/products')
            .then(r => setProducts(r.data))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.seller_name || '').toLowerCase().includes(search.toLowerCase())
    );

    async function addToCart(product_id) {
        if (!isLoggedIn) return navigate('/login');
        try {
            await api.post('/cart', { product_id, quantity: 1 });
            alert('Added to cart');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to add to cart');
        }
    }

    if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

    return (
        <div style={styles.wrap}>
            <div style={styles.header}>
                <h2>Marketplace</h2>
                <input
                    placeholder="Search products or sellers..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={styles.search}
                />
            </div>
            {filtered.length === 0 ? (
                <p>No products found.</p>
            ) : (
                <div style={styles.grid}>
                    {filtered.map(p => (
                        <div key={p.id} style={styles.card}>
                            {p.image_url && <img src={p.image_url} alt={p.name} style={styles.img} />}
                            <div style={styles.cardBody}>
                                <h3 style={styles.productName} onClick={() => navigate(`/products/${p.id}`)}>{p.name}</h3>
                                <p style={styles.price}>${Number(p.price).toFixed(2)}</p>
                                <p style={styles.seller}>
                                    by{' '}
                                    {p.business_id ? (
                                        <span style={styles.sellerLink} onClick={() => navigate(`/businesses/${p.business_id}`)}>
                                            {p.business_name}
                                        </span>
                                    ) : (
                                        <span style={styles.sellerLink} onClick={() => navigate(`/profile/${p.seller_id}`)}>
                                            {p.seller_name}
                                        </span>
                                    )}
                                </p>
                                {p.tags?.length > 0 && (
                                    <div style={styles.tags}>
                                        {p.tags.map(t => <span key={t} style={styles.tag}>{t}</span>)}
                                    </div>
                                )}
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
    wrap: { padding: 24 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' },
    search: { padding: '8px 12px', fontSize: 15, border: '1px solid #ccc', borderRadius: 4, width: 280 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 },
    card: { border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', background: '#fff' },
    img: { width: '100%', height: 160, objectFit: 'cover' },
    cardBody: { padding: 12 },
    productName: { fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 4 },
    price: { fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4 },
    seller: { fontSize: 13, color: '#666', marginBottom: 8 },
    sellerLink: { cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' },
    tags: { display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 },
    tag: { fontSize: 11, background: '#f0f0f0', padding: '2px 8px', borderRadius: 12 },
    btn: { width: '100%', padding: '8px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
