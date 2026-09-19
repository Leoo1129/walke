import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../api';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

export default function ProductDetail() {
    const toast = useToast();
    const { refreshCart } = useCart();
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [qty, setQty] = useState(1);
    const { isLoggedIn } = useAuth();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/products/${id}`).then(r => setProduct(r.data)).catch(() => navigate('/'));
    }, [id, navigate]);

    async function addToCart() {
        if (!isLoggedIn) return navigate('/login');
        try {
            await api.post('/cart', { product_id: product.id, quantity: qty });
            toast.success('Added to cart');
            refreshCart();
        } catch (err) {
            toast.error(apiError(err));
        }
    }

    if (!product) return <p style={{ padding: 24 }}>Loading...</p>;

    return (
        <div style={styles.wrap}>
            <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>
            <div style={styles.content}>
                {product.image_url && <img src={product.image_url} alt={product.name} style={styles.img} />}
                <div style={styles.info}>
                    <h2>{product.name}</h2>
                    <p style={styles.price}>{formatPrice(product.price)}</p>
                    <p style={{ marginBottom: 4 }}>Sold by{' '}
                        <span style={styles.link} onClick={() => product.business_id
                            ? navigate(`/businesses/${product.business_id}`)
                            : navigate(`/profile/${product.seller_id}`)
                        }>
                            {product.business_name || product.seller_name || 'View Seller'}
                        </span>
                    </p>
                    {product.tags?.length > 0 && (
                        <div style={styles.tags}>
                            {product.tags.map(t => <span key={t} style={styles.tag}>{t}</span>)}
                        </div>
                    )}
                    <div style={styles.row}>
                        <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} style={styles.qty} />
                        <button onClick={addToCart} style={styles.btn}>Add to Cart</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 800, margin: '0 auto' },
    back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16, padding: 0 },
    content: { display: 'flex', gap: 32, flexWrap: 'wrap' },
    img: { width: 320, height: 320, objectFit: 'cover', borderRadius: 8 },
    info: { flex: 1, minWidth: 200 },
    price: { fontSize: 24, fontWeight: 700, margin: '8px 0' },
    link: { color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' },
    tags: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' },
    tag: { fontSize: 12, background: 'var(--tag-bg)', padding: '3px 10px', borderRadius: 12 },
    row: { display: 'flex', gap: 12, marginTop: 16 },
    qty: { width: 70, padding: '8px', border: '1px solid var(--border-input)', borderRadius: 4, fontSize: 15 },
    btn: { padding: '8px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15 },
};
