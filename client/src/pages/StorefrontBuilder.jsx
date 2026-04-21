import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const FONTS = [
    { label: 'System Default', value: 'system-ui, sans-serif' },
    { label: 'Inter', value: 'Inter, sans-serif', google: 'Inter:wght@400;600;700' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif', google: 'Montserrat:wght@400;600;700' },
    { label: 'Playfair Display', value: '"Playfair Display", serif', google: 'Playfair+Display:wght@400;700' },
    { label: 'Raleway', value: 'Raleway, sans-serif', google: 'Raleway:wght@400;600;700' },
    { label: 'Oswald', value: 'Oswald, sans-serif', google: 'Oswald:wght@400;600;700' },
    { label: 'Lato', value: 'Lato, sans-serif', google: 'Lato:wght@400;700' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
];

const TABS = ['Content', 'Colors', 'Style', 'Layout'];

const DEFAULTS = {
    primary_color: '#1a1a1a',
    secondary_color: '#f8f8f8',
    accent_color: '#0066cc',
    text_color: '#ffffff',
    font: 'system-ui, sans-serif',
    banner_url: '',
    layout: 'grid',
    headline: '',
    subheadline: '',
    hero_align: 'center',
    hero_height: 'md',
    overlay_opacity: 0,
    button_style: 'rounded',
    card_style: 'outlined',
    product_columns: 3,
    announcement: '',
    announcement_bg: '#f59e0b',
    show_bio: true,
    social_instagram: '',
    social_twitter: '',
    social_website: '',
};

const PREVIEW_HERO_H = { sm: 80, md: 140, lg: 200, full: 260 };

function loadGoogleFont(fontValue) {
    const font = FONTS.find(f => f.value === fontValue);
    if (!font || !font.google) return;
    const id = `gfont-${font.google}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
    document.head.appendChild(link);
}

export default function StorefrontBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(DEFAULTS);
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [tab, setTab] = useState('Content');

    useEffect(() => {
        api.get(`/businesses/${id}/storefront`)
            .then(r => {
                const merged = { ...DEFAULTS, ...r.data };
                setForm(merged);
                loadGoogleFont(merged.font);
            })
            .catch(() => {});
    }, [id]);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setForm(f => ({ ...f, [name]: val }));
        if (name === 'font') loadGoogleFont(value);
    }

    function setField(name, value) {
        setForm(f => ({ ...f, [name]: value }));
    }

    async function handleSave() {
        setSaving(true);
        setMsg('');
        try {
            const payload = { ...form };
            if (imageFile) {
                const fd = new FormData();
                fd.append('image', imageFile);
                const { data } = await api.post('/images', fd);
                payload.banner_url = data.url;
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

    const previewHeroH = PREVIEW_HERO_H[form.hero_height] || 140;
    const btnRadius = form.button_style === 'pill' ? 999 : form.button_style === 'square' ? 0 : 4;
    const cardBorder = form.card_style === 'outlined' ? '1px solid #ddd' : 'none';
    const cardShadow = form.card_style === 'elevated' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none';
    const previewCols = form.layout === 'list' ? 1 : Math.min(Number(form.product_columns) || 3, 3);

    return (
        <div style={s.page}>
            <div style={s.header}>
                <button onClick={() => navigate(`/businesses/${id}`)} style={s.backBtn}>← Back</button>
                <h2 style={s.headerTitle}>Storefront Builder</h2>
                <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
                    {saving ? 'Saving...' : 'Save & Publish'}
                </button>
            </div>

            {msg && (
                <div style={{ ...s.msgBar, background: msg === 'Saved!' ? '#16a34a' : '#dc2626' }}>
                    {msg}
                </div>
            )}

            <div style={s.body}>
                <div style={s.panel}>
                    <div style={s.tabs}>
                        {TABS.map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }}>
                                {t}
                            </button>
                        ))}
                    </div>

                    <div style={s.tabContent}>
                        {tab === 'Content' && (
                            <div style={s.fields}>
                                <Field label="Headline">
                                    <input name="headline" value={form.headline} onChange={handleChange}
                                        placeholder="Welcome to our store" style={s.input} />
                                </Field>
                                <Field label="Subheadline">
                                    <input name="subheadline" value={form.subheadline} onChange={handleChange}
                                        placeholder="A short tagline" style={s.input} />
                                </Field>
                                <Field label="Announcement Banner">
                                    <input name="announcement" value={form.announcement} onChange={handleChange}
                                        placeholder="e.g. Free shipping this week!" style={s.input} />
                                </Field>
                                {form.announcement && (
                                    <ColorField label="Announcement Colour" name="announcement_bg"
                                        value={form.announcement_bg} onChange={handleChange} />
                                )}
                                <div style={s.divider} />
                                <Field label="Banner Image">
                                    <input type="file" accept="image/*"
                                        onChange={e => setImageFile(e.target.files[0])} style={s.fileInput} />
                                    {form.banner_url && !imageFile && (
                                        <img src={form.banner_url} alt="banner" style={s.bannerThumb} />
                                    )}
                                    {imageFile && <p style={s.hint}>{imageFile.name} selected</p>}
                                </Field>
                                <div style={s.divider} />
                                <Field label="Instagram">
                                    <input name="social_instagram" value={form.social_instagram}
                                        onChange={handleChange} placeholder="@yourhandle" style={s.input} />
                                </Field>
                                <Field label="Twitter / X">
                                    <input name="social_twitter" value={form.social_twitter}
                                        onChange={handleChange} placeholder="@yourhandle" style={s.input} />
                                </Field>
                                <Field label="Website">
                                    <input name="social_website" value={form.social_website}
                                        onChange={handleChange} placeholder="https://yoursite.com" style={s.input} />
                                </Field>
                                <div style={s.toggleRow}>
                                    <span style={s.toggleLabel}>Show bio in hero</span>
                                    <input type="checkbox" name="show_bio" checked={!!form.show_bio}
                                        onChange={handleChange} style={s.checkbox} />
                                </div>
                            </div>
                        )}

                        {tab === 'Colors' && (
                            <div style={s.fields}>
                                <ColorField label="Hero background" name="primary_color"
                                    value={form.primary_color} onChange={handleChange} />
                                <ColorField label="Hero text" name="text_color"
                                    value={form.text_color} onChange={handleChange} />
                                <ColorField label="Page background" name="secondary_color"
                                    value={form.secondary_color} onChange={handleChange} />
                                <ColorField label="Accent (prices, buttons)" name="accent_color"
                                    value={form.accent_color} onChange={handleChange} />
                                <p style={s.hint}>Tip: hero text should contrast strongly against the hero background.</p>
                            </div>
                        )}

                        {tab === 'Style' && (
                            <div style={s.fields}>
                                <Field label="Font">
                                    <select name="font" value={form.font} onChange={handleChange}
                                        style={{ ...s.input, fontFamily: form.font }}>
                                        {FONTS.map(f => (
                                            <option key={f.value} value={f.value}
                                                style={{ fontFamily: f.value }}>{f.label}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Button style">
                                    <div style={s.optRow}>
                                        {['square', 'rounded', 'pill'].map(opt => (
                                            <button key={opt} type="button"
                                                onClick={() => setField('button_style', opt)}
                                                style={{
                                                    ...s.optBtn,
                                                    borderRadius: opt === 'pill' ? 999 : opt === 'square' ? 0 : 4,
                                                    ...(form.button_style === opt ? s.optActive : {}),
                                                }}>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                <Field label="Card style">
                                    <div style={s.optRow}>
                                        {['flat', 'outlined', 'elevated'].map(opt => (
                                            <button key={opt} type="button"
                                                onClick={() => setField('card_style', opt)}
                                                style={{ ...s.optBtn, ...(form.card_style === opt ? s.optActive : {}) }}>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                        )}

                        {tab === 'Layout' && (
                            <div style={s.fields}>
                                <Field label="Hero height">
                                    <div style={s.optRow}>
                                        {['sm', 'md', 'lg', 'full'].map(opt => (
                                            <button key={opt} type="button"
                                                onClick={() => setField('hero_height', opt)}
                                                style={{ ...s.optBtn, ...(form.hero_height === opt ? s.optActive : {}) }}>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                <Field label="Hero text alignment">
                                    <div style={s.optRow}>
                                        {[['left', '⬅ Left'], ['center', '↕ Center'], ['right', 'Right ➡']].map(([opt, label]) => (
                                            <button key={opt} type="button"
                                                onClick={() => setField('hero_align', opt)}
                                                style={{ ...s.optBtn, ...(form.hero_align === opt ? s.optActive : {}) }}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                <Field label={`Banner overlay darkness: ${form.overlay_opacity}%`}>
                                    <input type="range" name="overlay_opacity" min={0} max={80}
                                        value={form.overlay_opacity} onChange={handleChange} style={s.slider} />
                                </Field>
                                <Field label="Product layout">
                                    <div style={s.optRow}>
                                        {[['grid', '▦ Grid'], ['list', '☰ List']].map(([opt, label]) => (
                                            <button key={opt} type="button"
                                                onClick={() => setField('layout', opt)}
                                                style={{ ...s.optBtn, ...(form.layout === opt ? s.optActive : {}) }}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                {form.layout === 'grid' && (
                                    <Field label="Product columns">
                                        <div style={s.optRow}>
                                            {[2, 3, 4].map(n => (
                                                <button key={n} type="button"
                                                    onClick={() => setField('product_columns', n)}
                                                    style={{ ...s.optBtn, ...(Number(form.product_columns) === n ? s.optActive : {}) }}>
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Live preview */}
                <div style={s.previewWrap}>
                    <p style={s.previewLabel}>Live Preview</p>
                    <div style={{ ...s.previewBox, fontFamily: form.font, background: form.secondary_color }}>
                        {form.announcement && (
                            <div style={{
                                background: form.announcement_bg, padding: '6px 12px',
                                fontSize: 11, textAlign: 'center', fontWeight: 600,
                            }}>
                                {form.announcement}
                            </div>
                        )}
                        <div style={{
                            position: 'relative', minHeight: previewHeroH,
                            background: form.primary_color,
                            backgroundImage: form.banner_url ? `url(${form.banner_url})` : undefined,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            padding: '16px 20px', textAlign: form.hero_align,
                        }}>
                            {form.overlay_opacity > 0 && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: `rgba(0,0,0,${form.overlay_opacity / 100})`,
                                }} />
                            )}
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ fontSize: 17, fontWeight: 700, color: form.text_color }}>
                                    {form.headline || 'Your Store Name'}
                                </div>
                                {form.subheadline && (
                                    <div style={{ fontSize: 11, color: form.text_color, opacity: 0.8, marginTop: 3 }}>
                                        {form.subheadline}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: 10 }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${previewCols}, 1fr)`,
                                gap: 8,
                            }}>
                                {[1, 2, 3].slice(0, form.layout === 'list' ? 2 : 3).map(n => (
                                    <div key={n} style={{
                                        border: cardBorder, boxShadow: cardShadow,
                                        borderRadius: 6, overflow: 'hidden', background: '#fff',
                                        display: form.layout === 'list' ? 'flex' : 'block',
                                    }}>
                                        <div style={{
                                            height: form.layout === 'list' ? 52 : 64,
                                            width: form.layout === 'list' ? 60 : '100%',
                                            background: '#e5e7eb', flexShrink: 0,
                                        }} />
                                        <div style={{ padding: 7, flex: 1 }}>
                                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Product {n}</div>
                                            <div style={{ fontSize: 11, color: form.accent_color, fontWeight: 700, marginBottom: 5 }}>$29.99</div>
                                            <div style={{
                                                fontSize: 10, padding: '3px 8px', display: 'inline-block',
                                                background: form.primary_color, color: form.text_color,
                                                borderRadius: btnRadius, cursor: 'pointer',
                                            }}>
                                                Add to Cart
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {(form.social_instagram || form.social_twitter || form.social_website) && (
                            <div style={{
                                padding: '8px 12px', borderTop: '1px solid #e5e7eb',
                                display: 'flex', gap: 12, justifyContent: 'center',
                                fontSize: 10, color: form.accent_color, flexWrap: 'wrap',
                            }}>
                                {form.social_instagram && <span>📷 {form.social_instagram}</span>}
                                {form.social_twitter && <span>𝕏 {form.social_twitter}</span>}
                                {form.social_website && <span>🌐 Website</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontWeight: 600, fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function ColorField({ label, name, value, onChange }) {
    return (
        <Field label={label}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" name={name} value={value} onChange={onChange}
                    style={{ width: 44, height: 36, padding: 2, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }} />
                <input name={name} value={value} onChange={onChange}
                    style={{ flex: 1, padding: '7px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, fontFamily: 'monospace' }} />
                <div style={{ width: 36, height: 36, borderRadius: 6, background: value, border: '1px solid #e5e7eb', flexShrink: 0 }} />
            </div>
        </Field>
    );
}

const s = {
    page: { minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' },
    header: {
        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px',
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 0, zIndex: 10,
    },
    headerTitle: { flex: 1, margin: 0, fontSize: 18, fontWeight: 700 },
    backBtn: { background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
    saveBtn: { padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
    msgBar: { padding: '8px 24px', color: '#fff', fontSize: 14, fontWeight: 600 },
    body: { display: 'flex', flex: 1 },
    panel: { width: 340, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 },
    tabs: { display: 'flex', borderBottom: '1px solid #e5e7eb' },
    tabBtn: { flex: 1, padding: '11px 4px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#666' },
    tabActive: { color: '#111', fontWeight: 700, borderBottomColor: '#111' },
    tabContent: { flex: 1, overflowY: 'auto' },
    fields: { display: 'flex', flexDirection: 'column', gap: 18, padding: 20 },
    input: { padding: '8px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, width: '100%', boxSizing: 'border-box' },
    fileInput: { fontSize: 13 },
    bannerThumb: { width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginTop: 4 },
    hint: { fontSize: 12, color: '#888', margin: 0 },
    divider: { height: 1, background: '#f0f0f0', margin: '2px 0' },
    toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    toggleLabel: { fontWeight: 600, fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px' },
    checkbox: { width: 18, height: 18, cursor: 'pointer' },
    optRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
    optBtn: { padding: '6px 14px', border: '1px solid #e5e7eb', background: '#f9f9f9', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#333' },
    optActive: { background: '#111', color: '#fff', borderColor: '#111' },
    slider: { width: '100%', cursor: 'pointer', accentColor: '#111' },
    previewWrap: { flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' },
    previewLabel: { fontWeight: 700, marginBottom: 12, fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px' },
    previewBox: { width: '100%', maxWidth: 480, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb' },
};
