import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const ROLES = ['admin', 'editor', 'viewer'];

export default function ManageMembers() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [inviteUserId, setInviteUserId] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [msg, setMsg] = useState('');

    async function load() {
        const r = await api.get(`/businesses/${id}/members`);
        setMembers(r.data);
    }

    useEffect(() => {
        load();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    async function invite(e) {
        e.preventDefault();
        try {
            await api.post(`/businesses/${id}/members`, { user_id: Number(inviteUserId), role: inviteRole });
            setMsg('Member invited');
            setInviteUserId('');
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Failed');
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

    return (
        <div style={styles.wrap}>
            <button onClick={() => navigate(`/businesses/${id}`)} style={styles.back}>← Back</button>
            <h2 style={{ marginBottom: 24 }}>Manage Members</h2>

            <form onSubmit={invite} style={styles.inviteForm}>
                <h3 style={{ marginBottom: 12 }}>Invite Member</h3>
                <input
                    placeholder="User ID"
                    value={inviteUserId}
                    onChange={e => setInviteUserId(e.target.value)}
                    style={styles.input}
                    required
                />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={styles.input}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="submit" style={styles.btn}>Invite</button>
                {msg && <p style={{ color: 'green' }}>{msg}</p>}
            </form>

            <h3 style={{ marginBottom: 12 }}>Current Members</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Joined</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map(m => (
                        <tr key={m.id}>
                            <td style={styles.td}>{m.name}</td>
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
    inviteForm: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, marginBottom: 32, padding: 16, background: '#f9f9f9', borderRadius: 8 },
    input: { padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 },
    btn: { padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #ddd', fontSize: 13, color: '#666' },
    td: { padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 14 },
    roleSelect: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 },
    ownerBadge: { background: '#111', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12 },
    removeBtn: { padding: '4px 10px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
};
