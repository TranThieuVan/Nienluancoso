import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Pagination from '../../components/Pagination';

// ── Helpers ──
const DEFAULT_AVATAR = 'http://localhost:5000/uploads/avatars/default-user.png';
const getAvatarUrl = (avatar) =>
  !avatar || avatar.includes('default-user.png') ? DEFAULT_AVATAR : `http://localhost:5000/${avatar}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

// ── Constants ──
const RANKS = ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương'];

const RANK_STYLE = {
  'Khách hàng': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
  'Bạc': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  'Vàng': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' },
  'Bạch kim': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-400' },
  'Kim cương': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-400' },
};

const DATE_PRESETS = [
  { value: '', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chỉnh' },
];

const STATUS_ORDER_LABEL = {
  pending: { label: 'Chờ xác nhận', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  confirmed: { label: 'Đã xác nhận', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  delivering: { label: 'Đang giao', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  delivered: { label: 'Đã giao', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  completed: { label: 'Hoàn tất', color: 'text-green-700 bg-green-50 border-green-200' },
  cancelled: { label: 'Đã hủy', color: 'text-red-600 bg-red-50 border-red-200' },
  failed_delivery: { label: 'Giao thất bại', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  returned: { label: 'Đã hoàn trả', color: 'text-rose-600 bg-rose-50 border-rose-200' },
};

// ── Sub-components ──
const RankBadge = ({ rank }) => {
  const s = RANK_STYLE[rank] || RANK_STYLE['Khách hàng'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {rank || 'Khách hàng'}
    </span>
  );
};

// ── User Detail Modal ──
const UserDetailModal = ({ userId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get(`/api/admin/users/${userId}/detail`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [userId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 flex items-center gap-3 shadow-2xl">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Đang tải...</span>
      </div>
    </div>
  );

  if (!data) return null;

  const { user, orderStats, recentOrders } = data;
  const s = orderStats;

  // Vòng tròn tỉ lệ thành công
  const rate = s.deliverySuccessRate;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Chi tiết người dùng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Card */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <img
              src={getAvatarUrl(user.avatar)}
              onError={e => { e.target.src = DEFAULT_AVATAR; }}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-bold text-gray-900">{user.name}</p>
                <RankBadge rank={user.rank} />
                {user.isLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    🔒 Bị khóa
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              <p className="text-[10px] text-gray-400 font-mono mt-1">
                #{user._id.slice(-8)} · Tham gia {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          {/* Order Stats Grid */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Thống kê đơn hàng</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Tổng đơn */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Tổng đơn hàng</p>
                <p className="text-3xl font-bold text-indigo-700 mt-1 font-mono">{s.totalOrders}</p>
              </div>

              {/* Tỉ lệ thành công - vòng tròn */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0">
                  <circle cx="44" cy="44" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <circle
                    cx="44" cy="44" r={radius} fill="none"
                    stroke={rate >= 80 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 44 44)"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                  <text x="44" y="44" dominantBaseline="middle" textAnchor="middle"
                    className="font-bold" fill={rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'}
                    fontSize="13" fontWeight="700">
                    {rate}%
                  </text>
                </svg>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tỉ lệ giao hàng thành công</p>
                  <p className="text-xs text-gray-500 mt-1">{s.completed + s.delivered} / {s.completed + s.delivered + s.failed_delivery + s.cancelled + s.returned} đơn có kết quả</p>
                </div>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'Hoàn tất', value: s.completed, color: 'text-green-700 bg-green-50 border-green-100' },
                { label: 'Đã giao', value: s.delivered, color: 'text-teal-700 bg-teal-50 border-teal-100' },
                { label: 'Đang giao', value: s.delivering, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
                { label: 'Chờ xử lý', value: s.pending, color: 'text-yellow-700 bg-yellow-50 border-yellow-100' },
                { label: 'Đã hủy', value: s.cancelled, color: 'text-red-700 bg-red-50 border-red-100' },
                { label: 'Giao thất bại', value: s.failed_delivery, color: 'text-orange-700 bg-orange-50 border-orange-100' },
              ].map(item => (
                <div key={item.label} className={`rounded-lg p-3 border text-center ${item.color}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{item.label}</p>
                  <p className="text-xl font-bold font-mono mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Tổng chi tiêu */}
            <div className="mt-3 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl p-4 text-white">
              <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">Tổng chi tiêu (đơn hoàn tất)</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(s.totalSpent)}</p>
            </div>
          </div>

          {/* Recent Orders */}
          {recentOrders && recentOrders.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">5 đơn hàng gần nhất</p>
              <div className="space-y-2">
                {recentOrders.map(order => {
                  const st = STATUS_ORDER_LABEL[order.status] || { label: order.status, color: 'text-gray-600 bg-gray-50 border-gray-200' };
                  return (
                    <div key={order._id} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-[10px] font-mono text-gray-400">#{order._id.slice(-8)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{formatCurrency(order.totalPrice)}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Bộ lọc
  const [rankFilter, setRankFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', currentPage);
    params.set('limit', 10);
    if (rankFilter !== 'all') params.set('rank', rankFilter);
    if (datePreset && datePreset !== 'custom') params.set('preset', datePreset);
    if (datePreset === 'custom' && fromDate) params.set('from', fromDate);
    if (datePreset === 'custom' && toDate) params.set('to', toDate);
    return params.toString();
  }, [currentPage, rankFilter, datePreset, fromDate, toDate]);

  const fetchUsers = useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/api/admin/users?${buildParams()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalUsers(res.data.totalUsers || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Reset về page 1 khi đổi filter
  useEffect(() => { setCurrentPage(1); }, [rankFilter, datePreset, fromDate, toDate]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleLock = async (user) => {
    if (user.isLocked) {
      const result = await Swal.fire({
        title: 'Mở khóa tài khoản?',
        text: `Bạn muốn mở khóa cho tài khoản ${user.email}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Mở khóa',
        cancelButtonText: 'Hủy',
        customClass: {
          confirmButton: 'bg-indigo-600 text-white font-semibold py-2 px-4 rounded',
          cancelButton: 'bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded ml-2',
        }, buttonsStyling: false,
      });
      if (result.isConfirmed) executeLockRequest(user._id, 'unlock', null);
    } else {
      const { value: duration } = await Swal.fire({
        title: 'Khóa tài khoản',
        input: 'select',
        inputOptions: {
          '1': '1 ngày', '3': '3 ngày', '7': '7 ngày',
          '30': '30 ngày', '365': '365 ngày', 'permanent': 'Vĩnh viễn'
        },
        inputPlaceholder: 'Chọn thời gian khóa',
        showCancelButton: true,
        confirmButtonText: 'Khóa tài khoản',
        cancelButtonText: 'Hủy',
        customClass: {
          confirmButton: 'bg-red-600 text-white font-semibold py-2 px-4 rounded',
          cancelButton: 'bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded ml-2',
        }, buttonsStyling: false,
        inputValidator: (value) => { if (!value) return 'Vui lòng chọn thời gian khóa!'; }
      });
      if (duration) executeLockRequest(user._id, 'lock', duration);
    }
  };

  const executeLockRequest = async (userId, action, duration) => {
    setError(null); setLocking(userId);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/users/${userId}/toggle-lock`,
        { action, duration },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchUsers();
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: action === 'lock' ? 'Đã khóa tài khoản!' : 'Đã mở khóa!',
        showConfirmButton: false, timer: 2000
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLocking(null);
    }
  };

  const stats = useMemo(() => [
    { label: 'Tổng người dùng', dot: 'bg-indigo-500', value: totalUsers },
    { label: 'Đang hoạt động', dot: 'bg-green-500', value: users.filter(u => !u.isLocked).length },
    { label: 'Đã khóa', dot: 'bg-red-500', value: users.filter(u => u.isLocked).length },
  ], [users, totalUsers]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      {/* Modal chi tiết */}
      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Người dùng</h1>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Bộ lọc ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-end gap-4">
        {/* Lọc theo rank */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Hạng thành viên</label>
          <div className="flex gap-1.5 flex-wrap">
            {['all', ...RANKS].map(r => (
              <button
                key={r}
                onClick={() => setRankFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${rankFilter === r
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
              >
                {r === 'all' ? 'Tất cả' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Lọc theo ngày tham gia */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Ngày tham gia</label>
          <div className="flex gap-1.5 flex-wrap">
            {DATE_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => { setDatePreset(p.value); setFromDate(''); setToDate(''); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${datePreset === p.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Từ ngày</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Đến ngày</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        )}

        {/* Reset */}
        {(rankFilter !== 'all' || datePreset) && (
          <button
            onClick={() => { setRankFilter('all'); setDatePreset(''); setFromDate(''); setToDate(''); }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400 border border-gray-200 hover:text-red-500 hover:border-red-200 transition-colors self-end mb-0.5"
          >
            ✕ Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-400">
            Hiển thị <strong className="text-gray-700">{users.length}</strong> / {totalUsers} người dùng
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-[28%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-left">Người dùng</th>
                <th className="w-[22%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-left">Email</th>
                <th className="w-[12%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Hạng</th>
                <th className="w-[13%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Ngày tham gia</th>
                <th className="w-[12%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Trạng thái</th>
                <th className="w-[13%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-sm text-gray-400">
                    👤 Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedUserId(user._id)}
                  >
                    <td className="px-4 py-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={getAvatarUrl(user.avatar)}
                          onError={e => { e.target.src = DEFAULT_AVATAR; }}
                          alt="avatar"
                          className="w-9 h-9 rounded-full border border-gray-200 object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{user._id.slice(-8)}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis">
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </td>

                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                      <RankBadge rank={user.rank} />
                    </td>

                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                      <span className="text-xs text-gray-400 font-mono">{formatDate(user.createdAt)}</span>
                    </td>

                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                      {user.isLocked ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            Đã khóa
                          </span>
                          <span className="text-[9px] text-red-500 font-medium tracking-wide">
                            {user.lockedUntil ? `Đến: ${formatDateTime(user.lockedUntil)}` : 'Vĩnh viễn'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Hoạt động
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Nút xem chi tiết */}
                        <button
                          onClick={() => setSelectedUserId(user._id)}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 text-[11px] font-semibold hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                          title="Xem chi tiết"
                        >
                          Chi tiết
                        </button>

                        {/* Nút khóa / mở khóa */}
                        {user.isLocked ? (
                          <button
                            onClick={() => handleToggleLock(user)}
                            disabled={locking === user._id}
                            className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-transparent bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                          >
                            {locking === user._id ? '...' : 'Mở khóa'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleLock(user)}
                            disabled={locking === user._id}
                            className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-[11px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {locking === user._id ? '...' : 'Khóa'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;