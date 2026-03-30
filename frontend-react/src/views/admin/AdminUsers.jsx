import React, { useState, useEffect, useMemo } from 'react';
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

// ── Component ──
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = async () => {
    setError(null); setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/api/admin/users?page=${currentPage}&limit=10`, {
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
  };

  useEffect(() => { fetchUsers(); }, [currentPage]);

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
      if (result.isConfirmed) {
        executeLockRequest(user._id, 'unlock', null);
      }
    } else {
      const { value: duration } = await Swal.fire({
        title: 'Khóa tài khoản',
        input: 'select',
        inputOptions: {
          '1': '1 ngày',
          '3': '3 ngày',
          '7': '7 ngày',
          '30': '30 ngày',
          '365': '365 ngày',
          'permanent': 'Vĩnh viễn'
        },
        inputPlaceholder: 'Chọn thời gian khóa',
        showCancelButton: true,
        confirmButtonText: 'Khóa tài khoản',
        cancelButtonText: 'Hủy',
        customClass: {
          confirmButton: 'bg-red-600 text-white font-semibold py-2 px-4 rounded',
          cancelButton: 'bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded ml-2',
        }, buttonsStyling: false,
        inputValidator: (value) => {
          if (!value) return 'Vui lòng chọn thời gian khóa!';
        }
      });

      if (duration) {
        executeLockRequest(user._id, 'lock', duration);
      }
    }
  };

  const executeLockRequest = async (userId, action, duration) => {
    setError(null);
    setLocking(userId);
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
      {/* ── Header ── */}
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

      {/* ── Stats ── */}
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

      {/* ── Table Card ── */}
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
                <th className="w-[32%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-left">Người dùng</th>
                <th className="w-[28%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-left">Email</th>
                <th className="w-[15%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Ngày tham gia</th>
                <th className="w-[12%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Trạng thái</th>
                <th className="w-[13%] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-sm text-gray-400">
                    👤 Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
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

                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                      {user.isLocked ? (
                        <button
                          onClick={() => handleToggleLock(user)}
                          disabled={locking === user._id}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors min-w-[95px] disabled:opacity-50"
                        >
                          {locking === user._id ? 'Xử lý...' : 'Mở khóa'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleLock(user)}
                          disabled={locking === user._id}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-[11px] font-semibold hover:bg-red-50 transition-colors min-w-[95px] disabled:opacity-50"
                        >
                          {locking === user._id ? 'Xử lý...' : 'Khóa'}
                        </button>
                      )}
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