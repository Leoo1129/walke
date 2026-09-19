import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', street: '', city: '', postcode: '', country: '', bio: '' });
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            await api.post('/users', form);
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    }

    if (done) {
        return (
            <div style={{ ...styles.wrap, textAlign: 'center' }}>
                <div style={styles.icon}>✉</div>
                <h2>Check your email</h2>
                <p style={styles.muted}>
                    We sent a verification link to <strong>{form.email}</strong>.
                    Click it to activate your account before logging in.
                </p>
                <p style={styles.muted}>The link expires in 24 hours.</p>
                <Link to="/login" style={styles.btn}>Go to Login</Link>
            </div>
        );
    }

    return (
        <div style={styles.wrap}>
            <h2>Register</h2>
            {error && <p style={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                <input name="name" placeholder="Username" value={form.name} onChange={handleChange} style={styles.input} required />
                <input name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} style={styles.input} required />
                <input name="password" placeholder="Password (min. 8 characters)" type="password" value={form.password} onChange={handleChange} style={styles.input} minLength={8} required />
                <input name="street" placeholder="Street (optional)" value={form.street} onChange={handleChange} style={styles.input} />
                <input name="city" placeholder="City (optional)" value={form.city} onChange={handleChange} style={styles.input} />
                <input name="postcode" placeholder="Postcode (optional)" value={form.postcode} onChange={handleChange} style={styles.input} />
                <input name="country" placeholder="Country (optional)" value={form.country} onChange={handleChange} style={styles.input} />
                <textarea name="bio" placeholder="Bio (optional)" value={form.bio} onChange={handleChange} style={{ ...styles.input, resize: 'vertical' }} rows={3} />
                <button type="submit" style={styles.btn}>Create Account</button>
            </form>
            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
}

const styles = {
    wrap: { maxWidth: 400, margin: '60px auto', padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 },
    input: { padding: '10px 12px', fontSize: 15, border: '1px solid var(--border-input)', borderRadius: 4 },
    btn: { display: 'inline-block', padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15, textDecoration: 'none' },
    error: { color: 'red', marginBottom: 8 },
    muted: { color: 'var(--text-muted)', marginBottom: 12 },
    icon: { fontSize: 40, marginBottom: 12 },
};
