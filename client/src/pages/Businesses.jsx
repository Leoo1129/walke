import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Businesses() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', bio: '' });
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/businesses')
            .then(r => setBusinesses(r.data))
            .catch(() => setBusinesses([]))
            .finally(() => setLoading(false));
    }, []);

    async function createBusiness(e) {
        e.preventDefault();
        try {
            await api.post('/businesses', form);
            setShowCreate(false);
            setForm({ name: '', bio: '' });
            const r = await api.get('/businesses');
            setBusinesses(r.data);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create business');
        }
    }

    if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

    return (
        <div style={styles.wrap}>
            <div style={styles.header}>
                <h2>Businesses</h2>
                {isLoggedIn && (
                    <button onClick={() => setShowCreate(s => !s)} style={styles.btn}>
                        {showCreate ? 'Cancel' : '+ Create Business'}
                    </button>
                )}
            </div>

            {showCreate && (
                <form onSubmit={createBusiness} style={styles.form}>
                    <input placeholder="Business name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={styles.input} required />
                    <textarea placeholder="Bio (optional)" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={styles.input} rows={3} />
                    <button type="submit" style={styles.btn}>Create</button>
                </form>
            )}

            {businesses.length === 0 ? (
                <p>No businesses yet.</p>
            ) : (
                <div style={styles.grid}>
                    {businesses.map(b => (
                        <div key={b.id} style={styles.card} onClick={() => navigate(`/businesses/${b.id}`)}>
                            {b.logo_url && <img src={b.logo_url} alt={b.name} style={styles.logo} />}
                            <div style={styles.cardBody}>
                                <h3 style={styles.name}>{b.name}</h3>
                                {b.bio && <p style={styles.bio}>{b.bio}</p>}
                                <p style={styles.meta}>{b.member_count} member{b.member_count !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    wrap: { padding: 24 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, marginBottom: 24, padding: 16, background: 'var(--surface-alt)', borderRadius: 8 },
    input: { padding: '8px 12px', fontSize: 15, border: '1px solid var(--border-input)', borderRadius: 4 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 },
    card: { border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .2s', background: 'var(--surface)' },
    logo: { width: '100%', height: 120, objectFit: 'cover' },
    cardBody: { padding: 16 },
    name: { fontSize: 17, fontWeight: 600, marginBottom: 4 },
    bio: { color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 },
    meta: { color: 'var(--text-muted)', fontSize: 13 },
    btn: { padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
