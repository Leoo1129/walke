import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import api from '../api';

export default function Navbar() {
    const { user, logout, isLoggedIn } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);

    const dark = theme === 'dark';

    useEffect(() => {
        if (!isLoggedIn) { setCartCount(0); return; }
        api.get('/cart').then(r => setCartCount(Array.isArray(r.data) ? r.data.reduce((s, i) => s + i.quantity, 0) : 0)).catch(() => {});
    }, [isLoggedIn]);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const navStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        background: dark ? '#0d0d0d' : '#fff',
        borderBottom: dark ? 'none' : '1px solid #e5e5e5',
        color: dark ? '#fff' : '#111',
        height: 52,
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 100,
    };

    const linkStyle = {
        color: dark ? '#ccc' : '#444',
        textDecoration: 'none',
        padding: '6px 10px',
        borderRadius: 4,
        fontSize: 14,
    };

    const btnStyle = {
        background: 'none',
        border: `1px solid ${dark ? '#555' : '#bbb'}`,
        color: dark ? '#ccc' : '#444',
        padding: '5px 12px',
        cursor: 'pointer',
        borderRadius: 4,
        fontSize: 14,
    };

    const toggleStyle = {
        background: 'none',
        border: `1px solid ${dark ? '#444' : '#ccc'}`,
        color: dark ? '#aaa' : '#666',
        padding: '4px 10px',
        cursor: 'pointer',
        borderRadius: 4,
        fontSize: 12,
        letterSpacing: 0.5,
    };

    const logoSrc = dark ? '/walkelogo_white.png' : '/walkelogo_transparent.png';

    return (
        <nav style={navStyle}>
            <Link to="/">
                <img src={logoSrc} alt="Walke" style={{ height: 30, width: 'auto', display: 'block' }} />
            </Link>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/" style={linkStyle}>Marketplace</Link>
                <Link to="/businesses" style={linkStyle}>Businesses</Link>
                {isLoggedIn && <Link to="/orders" style={linkStyle}>Orders</Link>}
                {isLoggedIn && (
                    <Link to="/cart" style={linkStyle}>
                        Cart {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
                    </Link>
                )}
                {isLoggedIn && <Link to="/dashboard" style={linkStyle}>Dashboard</Link>}
                {isLoggedIn ? (
                    <>
                        <Link to={`/profile/${user?.id}`} style={linkStyle}>{user?.name}</Link>
                        <button onClick={handleLogout} style={btnStyle}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={linkStyle}>Login</Link>
                        <Link to="/register" style={linkStyle}>Register</Link>
                    </>
                )}
                <button onClick={toggleTheme} style={toggleStyle}>
                    {dark ? 'Light' : 'Dark'}
                </button>
            </div>
        </nav>
    );
}

const styles = {
    badge: { background: '#e74c3c', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11, marginLeft: 4 },
};
