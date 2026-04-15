import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const LAYOUTS = ['grid', 'list'];
const FONTS = ['sans-serif', 'serif', 'monospace', 'Georgia, serif', 'Arial, sans-serif'];

export default function StorefrontBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        primary_color: '#1a1a1a',
        secondary_color: '#ffffff',
        accent_color: '#0066cc',
        font: 'sans-serif',
        banner_url: '',
        layout: 'grid',
        headline: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.get(`/businesses/${id}/storefront`)
            .then(r => setForm(f => ({ ...f, ...r.data })))
            .catch(() => {});
    }, [id]);

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function uploadBanner() {
        if (!imageFile) return null;
        const fd = new FormData();
        fd.append('image', imageFile);
        const { data } = await api.post('/images', fd);
        return data.url;
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setMsg('');
        try {
            let payload = { ...form };
            if (imageFile) {
                const url = await uploadBanner();
                payload.banner_url = url;
            }
            await api.patch(`/businesses/${id}/storefront`, payload);
            setMsg('Saved!');
            setTimeout(() => navigate(`/businesses/${id}`), 800);
        } catch (err) {
            setMsg(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={styles.wrap}>
            <button onClick={() => navigate(`/businesses/${id}`)} style={styles.back}>← Back to Storefront</button>
            <h2 style={{ marginBottom: 24 }}>Storefront Builder</h2>

            <div style={styles.layout}>
                {/* Controls */}
                <form onSubmit={handleSave} style={styles.form}>
                    <label style={styles.label}>Headline</label>
                    <input name="headline" value={form.headline} onChange={handleChange} placeholder="e.g. Welcome to our store" style={styles.input} />

                    <label style={styles.label}>Primary (background) colour</label>
                    <div style={styles.colorRow}>
                        <input type="color" name="primary_color" value={form.primary_color} onChange={handleChange} style={styles.colorPicker} />
                        <input name="primary_color" value={form.primary_color} onChange={handleChange} style={{ ...styles.input, flex: 1 }} />
                    </div>

                    <label style={styles.label}>Secondary colour</label>
                    <div style={styles.colorRow}>
                        <input type="color" name="secondary_color" value={form.secondary_color} onChange={handleChange} style={styles.colorPicker} />
                        <input name="secondary_color" value={form.secondary_color} onChange={handleChange} style={{ ...styles.input, flex: 1 }} />
                    </div>

                    <label style={styles.label}>Accent colour</label>
                    <div style={styles.colorRow}>
                        <input type="color" name="accent_color" value={form.accent_color} onChange={handleChange} style={styles.colorPicker} />
                        <input name="accent_color" value={form.accent_color} onChange={handleChange} style={{ ...styles.input, flex: 1 }} />
                    </div>

                    <label style={styles.label}>Font</label>
                    <select name="font" value={form.font} onChange={handleChange} style={styles.input}>
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    <label style={styles.label}>Layout</label>
                    <div style={styles.layoutPicker}>
                        {LAYOUTS.map(l => (
                            <div
                                key={l}
                                onClick={() => setForm(f => ({ ...f, layout: l }))}
                                style={{ ...styles.layoutOption, border: form.layout === l ? '2px solid #111' : '2px solid #ddd' }}
                            >
                                {l === 'grid' ? '▦ Grid' : '☰ List'}
                            </div>
                        ))}
                    </div>

                    <label style={styles.label}>Banner image</label>
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ marginBottom: 8 }} />
                    {form.banner_url && !imageFile && <img src={form.banner_url} alt="banner" style={styles.bannerPreview} />}

                    <button type="submit" disabled={saving} style={styles.btn}>
                        {saving ? 'Saving...' : 'Save Storefront'}
                    </button>
                    {msg && <p style={{ color: msg === 'Saved!' ? 'green' : 'red' }}>{msg}</p>}
                </form>

                {/* Live preview */}
                <div style={styles.preview}>
                    <p style={styles.previewLabel}>Preview</p>
                    <div style={{ ...styles.previewHero, background: form.primary_color, fontFamily: form.font }}>
                        <p style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{form.headline || 'Your Store Name'}</p>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>Your tagline here</p>
                    </div>
                    <div style={{ padding: 12, background: form.secondary_color }}>
                        <div style={form.layout === 'grid' ? styles.previewGrid : styles.previewList}>
                            {[1, 2, 3].map(n => (
                                <div key={n} style={styles.previewCard}>
                                    <div style={{ height: 60, background: '#eee' }} />
                                    <div style={{ padding: 8 }}>
                                        <p style={{ fontSize: 12, fontWeight: 600 }}>Product {n}</p>
                                        <p style={{ fontSize: 12, color: form.accent_color }}>$00.00</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 1000, margin: '0 auto' },
    back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16, padding: 0 },
    layout: { display: 'flex', gap: 32, flexWrap: 'wrap' },
    form: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 280 },
    label: { fontWeight: 600, fontSize: 13, marginTop: 4 },
    input: { padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 },
    colorRow: { display: 'flex', gap: 8, alignItems: 'center' },
    colorPicker: { width: 40, height: 36, padding: 2, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' },
    layoutPicker: { display: 'flex', gap: 10 },
    layoutOption: { padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 14 },
    bannerPreview: { width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 8 },
    btn: { marginTop: 8, padding: '10px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15 },
    preview: { flex: 1, minWidth: 260 },
    previewLabel: { fontWeight: 600, marginBottom: 8, fontSize: 13, color: '#555' },
    previewHero: { padding: '24px 16px', textAlign: 'center', borderRadius: '8px 8px 0 0' },
    previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
    previewList: { display: 'flex', flexDirection: 'column', gap: 6 },
    previewCard: { border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', background: '#fff' },
};
