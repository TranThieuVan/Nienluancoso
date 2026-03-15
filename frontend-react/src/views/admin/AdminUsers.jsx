import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

/* ─── Styles — nhất quán với AdminOrders ───────────────────────── */
const S = {
  page: {
    fontFamily: "'Sora', 'Inter', sans-serif",
    background: '#f9fafb',
    minHeight: '100vh',
    padding: '2rem 2.5rem',
  },
  header: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
  },
  eyebrow: {
    fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase',
    color: '#4f46e5', fontWeight: 600, marginBottom: '3px',
  },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 16px', borderRadius: '8px',
    border: '1px solid #e5e7eb', background: '#fff',
    color: '#6b7280', fontSize: '12px', fontFamily: 'inherit',
    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.05)',
  },

  /* Stats */
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    gap: '10px', marginBottom: '1.25rem',
  },
  statCard: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '12px', padding: '12px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  },
  statLabel: {
    fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '.12em', color: '#9ca3af', fontWeight: 700,
  },
  statDot: {
    width: '7px', height: '7px', borderRadius: '50%',
    display: 'inline-block', marginRight: '5px',
  },
  statValue: {
    fontSize: '1.5rem', fontWeight: 700, color: '#111827',
    marginTop: '4px', fontFamily: "'JetBrains Mono', monospace",
  },

  /* Table card */
  tableCard: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '14px', overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  },
  tableBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', borderBottom: '1px solid #f3f4f6',
    gap: '10px', flexWrap: 'wrap',
  },
  tableCount: { fontSize: '11px', color: '#9ca3af' },

  /* Search */
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: '7px',
    padding: '6px 12px', borderRadius: '8px',
    border: '1px solid #e5e7eb', background: '#f9fafb',
    fontSize: '12px', color: '#9ca3af',
  },
  searchInput: {
    border: 'none', outline: 'none', background: 'transparent',
    fontSize: '12px', color: '#374151', fontFamily: 'inherit',
    width: '180px',
  },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { background: '#f9fafb', borderBottom: '1px solid #f3f4f6' },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '.12em', color: '#9ca3af', fontWeight: 700,
  },
  td: { padding: '11px 14px', verticalAlign: 'middle' },

  /* User cell */
  userCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '2px solid #e5e7eb', objectFit: 'cover',
    flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.08)',
  },
  userName: { fontSize: '13px', fontWeight: 600, color: '#111827' },
  userId: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px', color: '#9ca3af', marginTop: '1px',
  },

  email: { fontSize: '12px', color: '#6b7280' },
  joined: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px', color: '#9ca3af',
  },

  /* Buttons */
  btnLock: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '5px 13px', borderRadius: '7px',
    border: '1px solid #fca5a5', background: '#fff',
    color: '#dc2626', fontSize: '11px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all .15s',
  },
  btnUnlock: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '5px 13px', borderRadius: '7px',
    border: 'none', background: '#4f46e5',
    color: '#fff', fontSize: '11px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 1px 3px rgba(79,70,229,.3)',
  },

  empty: { padding: '4rem 2rem', textAlign: 'center', color: '#9ca3af', fontSize: '14px' },
  error: {
    marginTop: '1rem', padding: '12px 16px',
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '10px', color: '#991b1b', fontSize: '13px',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
};

/* ─── Badge ─────────────────────────────────────────────────────── */
const StatusBadge = ({ isLocked }) =>
  isLocked ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 600,
      background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
      Đã khóa
    </span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 600,
      background: '#dcfce7', color: '#166534', border: '1px solid #86efac',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
      Hoạt động
    </span>
  );

/* ─── Icons ─────────────────────────────────────────────────────── */
const IconLock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconUnlock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);
const IconRefresh = ({ spin }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spin ? 'spin 1s linear infinite' : 'none' }}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ─── Helpers ───────────────────────────────────────────────────── */
const DEFAULT_AVATAR = 'http://localhost:5000/uploads/avatars/default-user.png';
const getAvatarUrl = (avatar) =>
  !avatar || avatar.includes('default-user.png') ? DEFAULT_AVATAR : `http://localhost:5000/${avatar}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ─── Component ─────────────────────────────────────────────────── */
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [locking, setLocking] = useState(null); // user._id đang xử lý

  const fetchUsers = async () => {
    setError(null); setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleLock = async (user) => {
    setError(null);
    setLocking(user._id);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/users/${user._id}/toggle-lock`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLocking(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => [
    { label: 'Tổng người dùng', dot: '#6366f1', value: users.length },
    { label: 'Đang hoạt động', dot: '#16a34a', value: users.filter(u => !u.isLocked).length },
    { label: 'Đã khóa', dot: '#dc2626', value: users.filter(u => u.isLocked).length },
  ], [users]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={S.page}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div>
            <p style={S.eyebrow}>Admin · Bookstore</p>
            <h1 style={S.title}>Quản lý Người dùng</h1>
          </div>
          <button style={S.refreshBtn} onClick={fetchUsers} disabled={loading}>
            <IconRefresh spin={loading} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* ── Stats ── */}
        <div style={S.stats}>
          {stats.map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={S.statLabel}>
                <span style={{ ...S.statDot, background: s.dot }} />
                {s.label}
              </div>
              <div style={S.statValue}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div style={S.tableCard}>
          <div style={S.tableBar}>
            <span style={S.tableCount}>
              Hiển thị <strong style={{ color: '#374151' }}>{filteredUsers.length}</strong> / {users.length} người dùng
            </span>
            <div style={S.searchWrap}>
              <IconSearch />
              <input
                style={S.searchInput}
                placeholder="Tìm tên hoặc email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <table style={S.table}>
            <thead style={S.thead}>
              <tr>
                <th style={S.th}>Người dùng</th>
                <th style={S.th}>Email</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Ngày tham gia</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Trạng thái</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={S.empty}>
                    👤 Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user._id}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    {/* Người dùng */}
                    <td style={S.td}>
                      <div style={S.userCell}>
                        <img
                          src={getAvatarUrl(user.avatar)}
                          onError={e => { e.target.src = DEFAULT_AVATAR; }}
                          alt="avatar"
                          style={S.avatar}
                        />
                        <div>
                          <div style={S.userName}>{user.name}</div>
                          <div style={S.userId}>#{user._id.slice(-8)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={S.td}>
                      <span style={S.email}>{user.email}</span>
                    </td>

                    {/* Ngày tham gia */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={S.joined}>{formatDate(user.createdAt)}</span>
                    </td>

                    {/* Trạng thái */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <StatusBadge isLocked={user.isLocked} />
                    </td>

                    {/* Hành động */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {user.isLocked ? (
                        <button
                          style={S.btnUnlock}
                          onClick={() => toggleLock(user)}
                          disabled={locking === user._id}
                          onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                          onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
                        >
                          <IconUnlock />
                          {locking === user._id ? 'Đang xử lý...' : 'Mở khóa'}
                        </button>
                      ) : (
                        <button
                          style={S.btnLock}
                          onClick={() => toggleLock(user)}
                          disabled={locking === user._id}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                        >
                          <IconLock />
                          {locking === user._id ? 'Đang xử lý...' : 'Khóa'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={S.error}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminUsers;