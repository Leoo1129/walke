import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
    const [form, setForm] = useState({ name: '', password: '', street: '', city: '', postcode: '', country: '', bio: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            await api.post('/users', form);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    }

    return (
        <div style={styles.wrap}>
            <h2>Register</h2>
            {error && <p style={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                <input name="name" placeholder="Username" value={form.name} onChange={handleChange} style={styles.input} required />
                <input name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} style={styles.input} required />
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
    btn: { padding: '10px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15 },
    error: { color: 'red', marginBottom: 8 },
};
