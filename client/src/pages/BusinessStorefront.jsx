import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const HERO_HEIGHTS = { sm: 200, md: 350, lg: 500, full: '100vh' };

const GOOGLE_FONTS = {
    'Inter, sans-serif': 'Inter:wght@400;600;700',
    'Montserrat, sans-serif': 'Montserrat:wght@400;600;700',
    '"Playfair Display", serif': 'Playfair+Display:wght@400;700',
    'Raleway, sans-serif': 'Raleway:wght@400;600;700',
    'Oswald, sans-serif': 'Oswald:wght@400;600;700',
    'Lato, sans-serif': 'Lato:wght@400;700',
};

function loadFont(fontFamily) {
    const googleFont = GOOGLE_FONTS[fontFamily];
    if (!googleFont) return;
    const id = `gfont-${googleFont}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${googleFont}&display=swap`;
    document.head.appendChild(link);
}

export default function BusinessStorefront() {
    const toast = useToast();
    const { id } = useParams();
    const [business, setBusiness] = useState(null);
    const [storefront, setStorefront] = useState(null);
    const [products, setProducts] = useState([]);
    const [members, setMembers] = useState([]);
    const { user, isLoggedIn } = useAuth();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/businesses/${id}`).then(r => setBusiness(r.data)).catch(() => navigate('/businesses'));
        api.get(`/businesses/${id}/storefront`).then(r => {
            setStorefront(r.data);
            if (r.data?.font) loadFont(r.data.font);
        }).catch(() => setStorefront(null));
        api.get(`/products?business_id=${id}`).then(r => setProducts(r.data)).catch(() => setProducts([]));
        if (isLoggedIn) {
            api.get(`/businesses/${id}/members`).then(r => setMembers(r.data)).catch(() => setMembers([]));
        }
    }, [id, isLoggedIn, navigate]);

    async function addToCart(product_id) {
        if (!isLoggedIn) return navigate('/login');
        try {
            await api.post('/cart', { product_id, quantity: 1 });
            toast.success('Added to cart');
        } catch (err) {
            toast.error(apiError(err));
        }
    }

    if (!business) return <p style={{ padding: 24 }}>Loading...</p>;

    const sf = storefront || {};
    const primaryColor = sf.primary_color || '#1a1a1a';
    const secondaryColor = sf.secondary_color || '#f8f8f8';
    const accentColor = sf.accent_color || '#0066cc';
    const textColor = sf.text_color || '#ffffff';
    const fontFamily = sf.font || 'system-ui, sans-serif';
    const heroHeight = HERO_HEIGHTS[sf.hero_height] || 350;
    const heroAlign = sf.hero_align || 'center';
    const overlayOpacity = Number(sf.overlay_opacity) || 0;
    const btnRadius = sf.button_style === 'pill' ? 999 : sf.button_style === 'square' ? 0 : 4;
    const cardBorder = sf.card_style === 'outlined' ? '1px solid #e5e7eb' : 'none';
    const cardShadow = sf.card_style === 'elevated' ? '0 2px 12px rgba(0,0,0,0.1)' : 'none';
    const cols = Number(sf.product_columns) || 3;
    const showBio = sf.show_bio !== false;

    const isMember = members.some(m => m.id === user?.id);
    const myRole = members.find(m => m.id === user?.id)?.role;
    const canEdit = isMember && ['owner', 'admin', 'editor'].includes(myRole);

    const centerStyle = heroAlign === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } : {};

    return (
        <div style={{ fontFamily, background: secondaryColor, minHeight: '100vh' }}>
            {sf.announcement && (
                <div style={{
                    background: sf.announcement_bg || '#f59e0b',
                    padding: '10px 20px', textAlign: 'center',
                    fontSize: 14, fontWeight: 600, fontFamily,
                }}>
                    {sf.announcement}
                </div>
            )}

            {/* Hero */}
            <div style={{
                position: 'relative', minHeight: heroHeight,
                background: primaryColor,
                backgroundImage: sf.banner_url ? `url(${sf.banner_url})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '60px 48px', textAlign: heroAlign,
            }}>
                {overlayOpacity > 0 && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: `rgba(0,0,0,${overlayOpacity / 100})`,
                    }} />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    {business.logo_url && (
                        <img src={business.logo_url} alt={business.name} style={{
                            width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                            marginBottom: 16, border: `3px solid ${textColor}`,
                            display: 'block', ...centerStyle,
                        }} />
                    )}
                    <h1 style={{
                        color: textColor, fontSize: 'clamp(28px, 5vw, 52px)',
                        fontWeight: 700, margin: '0 0 10px', lineHeight: 1.2,
                    }}>
                        {sf.headline || business.name}
                    </h1>
                    {sf.subheadline && (
                        <p style={{
                            color: textColor, opacity: 0.85, margin: '0 0 14px',
                            fontSize: 'clamp(14px, 2vw, 20px)', maxWidth: 600, ...centerStyle,
                        }}>
                            {sf.subheadline}
                        </p>
                    )}
                    {showBio && business.bio && (
                        <p style={{
                            color: textColor, opacity: 0.7, maxWidth: 560,
                            margin: '0 0 20px', fontSize: 15, ...centerStyle,
                        }}>
                            {business.bio}
                        </p>
                    )}
                    {canEdit && (
                        <button onClick={() => navigate(`/businesses/${id}/builder`)} style={{
                            padding: '10px 24px', background: accentColor, color: '#fff',
                            border: 'none', borderRadius: btnRadius, cursor: 'pointer',
                            fontSize: 14, fontWeight: 600,
                        }}>
                            ✏️ Edit Storefront
                        </button>
                    )}
                </div>
            </div>

            {/* Products */}
            <div style={{ padding: '48px 32px', maxWidth: 1200, margin: '0 auto' }}>
                <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Products</h2>
                {products.length === 0 ? (
                    <p style={{ color: '#888' }}>No products listed yet.</p>
                ) : sf.layout === 'list' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {products.map(p => (
                            <div key={p.id} style={{
                                display: 'flex', border: cardBorder, boxShadow: cardShadow,
                                borderRadius: 10, overflow: 'hidden', background: '#fff',
                            }}>
                                {p.image_url
                                    ? <img src={p.image_url} alt={p.name} style={{ width: 130, height: 110, objectFit: 'cover', flexShrink: 0 }} />
                                    : <div style={{ width: 130, height: 110, background: '#f0f0f0', flexShrink: 0 }} />
                                }
                                <div style={{ padding: '14px 18px', flex: 1 }}>
                                    <p style={{ fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 4 }}
                                        onClick={() => navigate(`/products/${p.id}`)}>{p.name}</p>
                                    <p style={{ color: accentColor, fontWeight: 700, fontSize: 17, marginBottom: 10 }}>
                                        {formatPrice(p.price)}
                                    </p>
                                    <button onClick={() => addToCart(p.id)} style={{
                                        padding: '7px 18px', background: primaryColor, color: textColor,
                                        border: 'none', borderRadius: btnRadius, cursor: 'pointer',
                                        fontSize: 13, fontWeight: 600,
                                    }}>
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20 }}>
                        {products.map(p => (
                            <div key={p.id} style={{
                                border: cardBorder, boxShadow: cardShadow,
                                borderRadius: 10, overflow: 'hidden', background: '#fff',
                            }}>
                                {p.image_url
                                    ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                                    : <div style={{ height: 180, background: '#f0f0f0' }} />
                                }
                                <div style={{ padding: 14 }}>
                                    <p style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 4 }}
                                        onClick={() => navigate(`/products/${p.id}`)}>{p.name}</p>
                                    <p style={{ color: accentColor, fontWeight: 700, fontSize: 17, marginBottom: 10 }}>
                                        {formatPrice(p.price)}
                                    </p>
                                    <button onClick={() => addToCart(p.id)} style={{
                                        width: '100%', padding: '8px', background: primaryColor,
                                        color: textColor, border: 'none', borderRadius: btnRadius,
                                        cursor: 'pointer', fontSize: 14, fontWeight: 600,
                                    }}>
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Social links */}
            {(sf.social_instagram || sf.social_twitter || sf.social_website) && (
                <div style={{
                    borderTop: `2px solid ${primaryColor}`, padding: '36px 24px',
                    textAlign: 'center', background: secondaryColor,
                }}>
                    <h3 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>Find us online</h3>
                    <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {sf.social_instagram && (
                            <a href={`https://instagram.com/${sf.social_instagram.replace('@', '')}`}
                                target="_blank" rel="noreferrer"
                                style={{ color: accentColor, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
                                📷 {sf.social_instagram}
                            </a>
                        )}
                        {sf.social_twitter && (
                            <a href={`https://twitter.com/${sf.social_twitter.replace('@', '')}`}
                                target="_blank" rel="noreferrer"
                                style={{ color: accentColor, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
                                𝕏 {sf.social_twitter}
                            </a>
                        )}
                        {sf.social_website && (
                            <a href={sf.social_website} target="_blank" rel="noreferrer"
                                style={{ color: accentColor, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
                                🌐 {sf.social_website}
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Team (members only) */}
            {isMember && (
                <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
                    <h3 style={{ marginBottom: 12, fontSize: 20, fontWeight: 700 }}>Team</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {members.map(m => (
                            <div key={m.id} style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '10px 14px', background: '#f5f5f5', borderRadius: 6,
                            }}>
                                <span>{m.name}</span>
                                <span style={{ color: '#666', fontSize: 13, textTransform: 'capitalize' }}>{m.role}</span>
                            </div>
                        ))}
                    </div>
                    {['owner', 'admin'].includes(myRole) && (
                        <button onClick={() => navigate(`/businesses/${id}/manage`)} style={{
                            padding: '8px 16px', background: '#111', color: '#fff',
                            border: 'none', borderRadius: 4, cursor: 'pointer',
                        }}>
                            Manage Members
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
