import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [tokenValid, setTokenValid] = useState(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setTokenValid(false);
            return;
        }
        api.get(`/auth/reset-password/${token}`)
            .then(() => setTokenValid(true))
            .catch(() => setTokenValid(false));
    }, [token]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    }

    if (tokenValid === null) {
        return <p style={{ padding: 24 }}>Validating link…</p>;
    }

    if (!tokenValid) {
        return (
            <div style={styles.wrap}>
                <div style={{ ...styles.icon, background: '#e74c3c' }}>✕</div>
                <h2>Link invalid or expired</h2>
                <p style={styles.muted}>This password reset link is no longer valid. Links expire after 5 minutes.</p>
                <Link to="/forgot-password" style={styles.btn}>Request a new link</Link>
            </div>
        );
    }

    if (success) {
        return (
            <div style={styles.wrap}>
                <div style={styles.icon}>✓</div>
                <h2>Password reset</h2>
                <p style={styles.muted}>Your password has been updated. Redirecting to login…</p>
                <Link to="/login" style={styles.btn}>Go to Login</Link>
            </div>
        );
    }

    return (
        <div style={styles.wrap}>
            <h2>Set New Password</h2>
            <p style={styles.muted}>Choose a new password for your account.</p>
            {error && <p style={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={styles.input}
                    required
                    minLength={8}
                />
                <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    style={styles.input}
                    required
                />
                <button type="submit" style={styles.btn} disabled={loading}>
                    {loading ? 'Saving…' : 'Reset Password'}
                </button>
            </form>
        </div>
    );
}

const styles = {
    wrap: { maxWidth: 400, margin: '80px auto', padding: 24, textAlign: 'center' },
    form: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, textAlign: 'left' },
    input: { padding: '10px 12px', fontSize: 15, border: '1px solid var(--border-input)', borderRadius: 4 },
    btn: { display: 'inline-block', padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15, textDecoration: 'none' },
    error: { color: '#e74c3c', marginBottom: 8, textAlign: 'left' },
    muted: { color: 'var(--text-muted)', marginBottom: 16 },
    icon: { width: 56, height: 56, borderRadius: '50%', background: '#27ae60', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
};
