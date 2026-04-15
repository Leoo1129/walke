import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const ROLES = ['admin', 'editor', 'viewer'];

export default function ManageMembers() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [inviteRole, setInviteRole] = useState('viewer');
    const [msg, setMsg] = useState('');
    const [msgIsError, setMsgIsError] = useState(false);

    // Username search state
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchDebounce = useRef(null);

    async function load() {
        const r = await api.get(`/businesses/${id}/members`);
        setMembers(r.data);
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    function handleSearchChange(e) {
        const val = e.target.value;
        setSearch(val);
        setSelectedUser(null);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        if (!val.trim()) { setSearchResults([]); setSearchOpen(false); return; }
        searchDebounce.current = setTimeout(async () => {
            try {
                const r = await api.get(`/users?name=${encodeURIComponent(val)}`);
                setSearchResults(r.data || []);
                setSearchOpen(true);
            } catch {
                setSearchResults([]);
            }
        }, 300);
    }

    function selectUser(u) {
        setSelectedUser(u);
        setSearch(u.name);
        setSearchResults([]);
        setSearchOpen(false);
    }

    async function invite(e) {
        e.preventDefault();
        if (!selectedUser) {
            setMsg('Select a user from the search results');
            setMsgIsError(true);
            return;
        }
        try {
            await api.post(`/businesses/${id}/members`, { user_id: selectedUser.id, role: inviteRole });
            setMsg(`${selectedUser.name} invited as ${inviteRole}`);
            setMsgIsError(false);
            setSelectedUser(null);
            setSearch('');
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Failed');
            setMsgIsError(true);
        }
    }

    async function updateRole(user_id, role) {
        try {
            await api.patch(`/businesses/${id}/members/${user_id}`, { role });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    async function removeMember(user_id) {
        if (!confirm('Remove this member?')) return;
        try {
            await api.delete(`/businesses/${id}/members/${user_id}`);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    // Filter out already-existing members from search results
    const memberIds = new Set(members.map(m => m.id));
    const filteredResults = searchResults.filter(u => !memberIds.has(u.id));

    return (
        <div style={styles.wrap}>
            <button onClick={() => navigate(`/businesses/${id}`)} style={styles.back}>← Back</button>
            <h2 style={{ marginBottom: 24 }}>Manage Members</h2>

            <form onSubmit={invite} style={styles.inviteForm}>
                <h3 style={{ marginBottom: 12 }}>Invite Member</h3>
                <div style={styles.searchWrap}>
                    <input
                        placeholder="Search by username..."
                        value={search}
                        onChange={handleSearchChange}
                        onFocus={() => filteredResults.length > 0 && setSearchOpen(true)}
                        onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                        style={styles.input}
                        autoComplete="off"
                    />
                    {searchOpen && filteredResults.length > 0 && (
                        <div style={styles.dropdown}>
                            {filteredResults.map(u => (
                                <div key={u.id} style={styles.dropdownItem} onMouseDown={() => selectUser(u)}>
                                    {u.logo_url && <img src={u.logo_url} alt="" style={styles.avatar} />}
                                    <span>{u.name}</span>
                                    {u.bio && <span style={styles.dropdownBio}>{u.bio}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    {searchOpen && search.trim() && filteredResults.length === 0 && (
                        <div style={styles.dropdown}>
                            <div style={{ padding: '10px 12px', color: '#888', fontSize: 13 }}>No users found</div>
                        </div>
                    )}
                </div>
                {selectedUser && (
                    <div style={styles.selectedBadge}>
                        {selectedUser.logo_url && <img src={selectedUser.logo_url} alt="" style={styles.avatar} />}
                        <span>Inviting: <strong>{selectedUser.name}</strong></span>
                        <button type="button" onClick={() => { setSelectedUser(null); setSearch(''); }} style={styles.clearBtn}>✕</button>
                    </div>
                )}
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={styles.input}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="submit" style={styles.btn}>Invite</button>
                {msg && <p style={{ color: msgIsError ? '#c0392b' : '#27ae60', fontSize: 13 }}>{msg}</p>}
            </form>

            <h3 style={{ marginBottom: 12 }}>Current Members</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Member</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Joined</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map(m => (
                        <tr key={m.id}>
                            <td style={styles.td}>
                                <div style={styles.memberCell}>
                                    {m.logo_url && <img src={m.logo_url} alt="" style={styles.avatar} />}
                                    <span>{m.name}</span>
                                </div>
                            </td>
                            <td style={styles.td}>
                                {m.role === 'owner' ? (
                                    <span style={styles.ownerBadge}>owner</span>
                                ) : (
                                    <select value={m.role} onChange={e => updateRole(m.id, e.target.value)} style={styles.roleSelect}>
                                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                )}
                            </td>
                            <td style={styles.td}>{new Date(m.joined_at).toLocaleDateString()}</td>
                            <td style={styles.td}>
                                {m.role !== 'owner' && (
                                    <button onClick={() => removeMember(m.id)} style={styles.removeBtn}>Remove</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 800, margin: '0 auto' },
    back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16, padding: 0 },
    inviteForm: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, marginBottom: 32, padding: 16, background: '#f9f9f9', borderRadius: 8 },
    searchWrap: { position: 'relative' },
    input: { padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4, width: '100%', boxSizing: 'border-box' },
    dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 20, maxHeight: 200, overflowY: 'auto' },
    dropdownItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f0f0f0' },
    dropdownBio: { color: '#999', fontSize: 12, marginLeft: 'auto', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    selectedBadge: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#e8f5e9', borderRadius: 4, fontSize: 14, border: '1px solid #a5d6a7' },
    clearBtn: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 16, padding: 0 },
    btn: { padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #ddd', fontSize: 13, color: '#666' },
    td: { padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 14 },
    memberCell: { display: 'flex', alignItems: 'center', gap: 8 },
    avatar: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    roleSelect: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 },
    ownerBadge: { background: '#111', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12 },
    removeBtn: { padding: '4px 10px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
};
