import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const { data } = await api.post('/login', { name, password });
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            login(data.token, {
                id: payload.id,
                name: payload.name,
                is_admin: payload.is_admin,
                email_verified: payload.email_verified,
            });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    }

    return (
        <div style={styles.wrap}>
            <h2>Login</h2>
            {error && <p style={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                <input placeholder="Username" value={name} onChange={e => setName(e.target.value)} style={styles.input} required />
                <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
                <button type="submit" style={styles.btn}>Login</button>
            </form>
            <p style={{ marginBottom: 6 }}>No account? <Link to="/register">Register</Link></p>
            <p><Link to="/forgot-password" style={styles.forgotLink}>Forgot your password?</Link></p>
        </div>
    );
}

const styles = {
    wrap: { maxWidth: 400, margin: '80px auto', padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 },
    input: { padding: '10px 12px', fontSize: 15, border: '1px solid var(--border-input)', borderRadius: 4 },
    btn: { padding: '10px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15 },
    error: { color: 'red', marginBottom: 8 },
    forgotLink: { color: 'var(--text-muted)', fontSize: 14 },
};
