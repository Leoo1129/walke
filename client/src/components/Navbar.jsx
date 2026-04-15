import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api';

export default function Navbar() {
    const { user, logout, isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        if (!isLoggedIn) { setCartCount(0); return; }
        api.get('/cart').then(r => setCartCount(Array.isArray(r.data) ? r.data.reduce((s, i) => s + i.quantity, 0) : 0)).catch(() => {});
    }, [isLoggedIn]);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <nav style={styles.nav}>
            <Link to="/" style={styles.brand}>WALKE</Link>
            <div style={styles.links}>
                <Link to="/" style={styles.link}>Marketplace</Link>
                <Link to="/businesses" style={styles.link}>Businesses</Link>
                {isLoggedIn && <Link to="/orders" style={styles.link}>Orders</Link>}
                {isLoggedIn && (
                    <Link to="/cart" style={styles.link}>
                        Cart {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
                    </Link>
                )}
                {isLoggedIn && <Link to="/dashboard" style={styles.link}>Dashboard</Link>}
                {isLoggedIn ? (
                    <>
                        <Link to={`/profile/${user?.id}`} style={styles.link}>{user?.name}</Link>
                        <button onClick={handleLogout} style={styles.btn}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={styles.link}>Login</Link>
                        <Link to="/register" style={styles.link}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
}

const styles = {
    nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', background: '#111', color: '#fff', height: 52, gap: 16, position: 'sticky', top: 0, zIndex: 100 },
    brand: { fontWeight: 700, fontSize: 20, color: '#fff', textDecoration: 'none', letterSpacing: 1 },
    links: { display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' },
    link: { color: '#ccc', textDecoration: 'none', padding: '6px 10px', borderRadius: 4, fontSize: 14 },
    badge: { background: '#e74c3c', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11, marginLeft: 4 },
    btn: { background: 'none', border: '1px solid #555', color: '#ccc', padding: '5px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 14 },
};
