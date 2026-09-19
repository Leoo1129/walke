import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout, isLoggedIn } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { currency, currencies, selectCurrency } = useCurrency();
    const { count: cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    // Close the mobile menu after navigating
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const linkClass = ({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '');

    return (
        <nav className="navbar">
            <Link to="/" className="navbar__brand">
                <img src="/walkelogo_transparent.png" alt="Walke" />
            </Link>

            <button
                className="navbar__toggle"
                onClick={() => setMenuOpen(open => !open)}
                aria-expanded={menuOpen}
                aria-controls="navbar-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
                <span /><span /><span />
            </button>

            <div id="navbar-menu" className={'navbar__menu' + (menuOpen ? ' navbar__menu--open' : '')}>
                <NavLink to="/" end className={linkClass}>Marketplace</NavLink>
                <NavLink to="/businesses" className={linkClass}>Businesses</NavLink>
                {isLoggedIn && <NavLink to="/orders" className={linkClass}>Orders</NavLink>}
                {isLoggedIn && (
                    <NavLink to="/cart" className={linkClass}>
                        Cart
                        {cartCount > 0 && <span className="navbar__badge" aria-label={`${cartCount} items`}>{cartCount}</span>}
                    </NavLink>
                )}
                {isLoggedIn && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
                {user?.is_admin && <NavLink to="/admin" className={({ isActive }) => linkClass({ isActive }) + ' navbar__link--admin'}>Admin</NavLink>}

                <div className="navbar__actions">
                    {isLoggedIn ? (
                        <>
                            <NavLink to={`/profile/${user?.id}`} className={linkClass}>{user?.name}</NavLink>
                            <button onClick={handleLogout} className="navbar__button">Logout</button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login" className={linkClass}>Login</NavLink>
                            <NavLink to="/register" className={linkClass}>Register</NavLink>
                        </>
                    )}
                    <select
                        value={currency}
                        onChange={e => selectCurrency(e.target.value)}
                        className="navbar__control"
                        aria-label="Currency"
                    >
                        {currencies.map(c => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                    </select>
                    <button onClick={toggleTheme} className="navbar__control" aria-label="Toggle colour theme">
                        {theme === 'dark' ? 'Light' : 'Dark'}
                    </button>
                </div>
            </div>
        </nav>
    );
}
