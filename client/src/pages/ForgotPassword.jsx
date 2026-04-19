import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={styles.wrap}>
            <h2>Forgot Password</h2>
            {submitted ? (
                <>
                    <p style={styles.success}>If that email address is registered with us, a password reset link has been sent. Please check your inbox.</p>
                    <p style={styles.muted}>The link expires in 5 minutes.</p>
                    <Link to="/login" style={styles.link}>Back to Login</Link>
                </>
            ) : (
                <>
                    <p style={styles.muted}>Enter your email address and we'll send you a link to reset your password.</p>
                    {error && <p style={styles.error}>{error}</p>}
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={styles.input}
                            required
                        />
                        <button type="submit" style={styles.btn} disabled={loading}>
                            {loading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>
                    <p><Link to="/login" style={styles.link}>Back to Login</Link></p>
                </>
            )}
        </div>
    );
}

const styles = {
    wrap: { maxWidth: 400, margin: '80px auto', padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 },
    input: { padding: '10px 12px', fontSize: 15, border: '1px solid var(--border-input)', borderRadius: 4 },
    btn: { padding: '10px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15 },
    error: { color: '#e74c3c', marginBottom: 8 },
    success: { color: '#27ae60', marginBottom: 8 },
    muted: { color: 'var(--text-muted)', marginBottom: 16 },
    link: { color: '#0066cc' },
};
