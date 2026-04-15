import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout, isLoggedIn } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <nav style={styles.nav}>
            <Link to="/" style={styles.brand}>WALKE</Link>
            <div style={styles.links}>
                <Link to="/">Marketplace</Link>
                <Link to="/businesses">Businesses</Link>
                {isLoggedIn && <Link to="/orders">Orders</Link>}
                {isLoggedIn && <Link to="/dashboard">Dashboard</Link>}
                {isLoggedIn ? (
                    <>
                        <Link to={`/profile/${user?.id}`}>{user?.name}</Link>
                        <button onClick={handleLogout} style={styles.btn}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
}

const styles = {
    nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#111', color: '#fff', gap: 16 },
    brand: { fontWeight: 700, fontSize: 20, color: '#fff', textDecoration: 'none' },
    links: { display: 'flex', gap: 16, alignItems: 'center' },
    btn: { background: 'none', border: '1px solid #555', color: '#fff', padding: '4px 12px', cursor: 'pointer', borderRadius: 4 },
};
