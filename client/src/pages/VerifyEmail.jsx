import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying');
    const [error, setError] = useState('');
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setError('No verification token found in this link.');
            return;
        }

        api.post('/auth/verify-email', { token })
            .then(({ data }) => {
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                login(data.token, {
                    id: payload.id,
                    name: payload.name,
                    is_admin: payload.is_admin,
                    email_verified: true,
                });
                setStatus('success');
            })
            .catch(err => {
                setStatus('error');
                setError(err.response?.data?.error || 'Verification failed. The link may have expired.');
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={styles.wrap}>
            {status === 'verifying' && (
                <>
                    <h2>Verifying your email…</h2>
                    <p style={styles.muted}>Please wait.</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <div style={styles.icon}>✓</div>
                    <h2>Email verified</h2>
                    <p style={styles.muted}>Your account is now active. You can browse, buy, and sell on Walke.</p>
                    <Link to="/" style={styles.btn}>Go to Marketplace</Link>
                </>
            )}
            {status === 'error' && (
                <>
                    <div style={{ ...styles.icon, background: '#e74c3c' }}>✕</div>
                    <h2>Verification failed</h2>
                    <p style={styles.error}>{error}</p>
                    <Link to="/login" style={styles.btn}>Back to Login</Link>
                </>
            )}
        </div>
    );
}

const styles = {
    wrap: { maxWidth: 420, margin: '80px auto', padding: 24, textAlign: 'center' },
    icon: { width: 56, height: 56, borderRadius: '50%', background: '#27ae60', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
    muted: { color: 'var(--text-muted)', marginBottom: 24 },
    error: { color: '#e74c3c', marginBottom: 24 },
    btn: { display: 'inline-block', padding: '10px 24px', background: '#111', color: '#fff', textDecoration: 'none', borderRadius: 4, fontSize: 15 },
};
