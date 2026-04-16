import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

/* ─── Icons (Scaled up) ────────────────────────────────────────── */
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconHide = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const IconShow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconWarn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('vi-VN'),
    time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  };
};

/* ─── Component ─────────────────────────────────────────────────── */
const AdminCommentList = () => {
  const [comments, setComments] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // State cho ô input gõ tức thì
  const [debouncedSearch, setDebouncedSearch] = useState(''); // State để gọi API
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalVisible, setTotalVisible] = useState(0);
  const [totalHidden, setTotalHidden] = useState(0);
  const limit = 10;

  // Xử lý Debounce cho ô tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset về trang 1 khi tìm kiếm
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get('http://localhost:5000/api/admin/comments', {
        params: { search: debouncedSearch, page, limit },
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(data.comments);
      setTotal(data.total);
      setTotalVisible(data.totalVisible);
      setTotalHidden(data.totalHidden);
    } catch (err) {
      console.error(err);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const toggleHide = async (comment) => {
    const token = localStorage.getItem('adminToken');
    if (comment.isHidden) {
      try {
        await axios.put(`http://localhost:5000/api/admin/comments/${comment._id}/unhide`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchComments();
      } catch (err) {
        Swal.fire('Lỗi', 'Không thể hiện bình luận', 'error');
      }
      return;
    }

    const { value: reason } = await Swal.fire({
      title: 'Ẩn bình luận?',
      input: 'select',
      inputOptions: {
        'Nội dung phản cảm': 'Nội dung phản cảm',
        'Ngôn từ thô tục': 'Ngôn từ thô tục',
        'Không liên quan đến sản phẩm': 'Không liên quan đến sản phẩm',
        'Spam hoặc quảng cáo': 'Spam hoặc quảng cáo',
      },
      inputPlaceholder: 'Chọn lý do ẩn',
      showCancelButton: true,
      confirmButtonText: 'Xác nhận ẩn',
      cancelButtonText: 'Huỷ',
      confirmButtonColor: '#ef4444',
    });

    if (reason) {
      try {
        await axios.put(`http://localhost:5000/api/admin/comments/${comment._id}/hide`, { reason }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchComments();
      } catch (err) {
        Swal.fire('Lỗi', 'Không thể ẩn bình luận', 'error');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Quản lý Bình luận</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Kiểm duyệt và điều phối nội dung cộng đồng</p>
      </div>

      {/* ── Stats (Full Background) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Tổng bình luận', bg: 'bg-indigo-600', icon: 'fa-comments', value: total },
          { label: 'Đang hiển thị', bg: 'bg-emerald-600', icon: 'fa-eye', value: totalVisible },
          { label: 'Đã ẩn kiểm duyệt', bg: 'bg-rose-600', icon: 'fa-eye-slash', value: totalHidden },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5 shadow-lg shadow-indigo-100 text-white transition-transform hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest opacity-80">{s.label}</span>
              <i className={`fa-solid ${s.icon} opacity-40 text-lg`}></i>
            </div>
            <div className="text-3xl font-black font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-400 font-bold uppercase tracking-tight">
            Danh sách bình luận ({comments.length})
          </span>
          <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus-within:border-indigo-500 transition-all">
            <IconSearch />
            <input
              className="border-none outline-none bg-transparent text-sm text-gray-700 w-64 placeholder:text-gray-400 font-medium"
              placeholder="Tìm kiếm sách hoặc người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-left w-16">No.</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-left">Người dùng</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-left">Sách</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-left w-[400px]">Nội dung bình luận</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-center">Thời gian</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-center">Kiểm duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {comments.length === 0 ? (
                <tr><td colSpan="6" className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-base">Không tìm thấy dữ liệu</td></tr>
              ) : (
                comments.map((c, index) => {
                  const { date, time } = formatDate(c.createdAt);
                  return (
                    <tr key={c._id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <span className="font-mono text-sm text-gray-400 font-bold">
                          {String((page - 1) * limit + index + 1).padStart(3, '0')}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="font-black text-gray-900 text-sm tracking-tight">{c.userId?.name}</div>
                        <div className="text-xs text-gray-400 font-medium">{c.userId?.email}</div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="text-sm font-black text-indigo-600 max-w-[180px] truncate block uppercase tracking-tighter">
                          {c.bookId?.title || '—'}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {c.isHidden ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-black uppercase tracking-tighter">
                            <IconWarn /> Lý do: {c.hiddenReason}
                          </span>
                        ) : (
                          <p className="text-sm text-gray-600 leading-relaxed font-medium line-clamp-2 italic" title={c.content}>
                            "{c.content}"
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5 text-center">
                        <div className="font-mono text-xs text-gray-500 font-bold leading-tight">
                          {date}<br />
                          <span className="text-[10px] opacity-60">{time}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        {c.isHidden ? (
                          <button
                            onClick={() => toggleHide(c)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            <IconShow /> HIỆN
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleHide(c)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                          >
                            <IconHide /> ẨN
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="mt-8">
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white disabled:opacity-30 transition-all font-bold"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div className="px-5 py-2 bg-white border border-gray-200 rounded-xl font-black text-sm text-gray-700">
            Trang {page} / {totalPages || 1}
          </div>
          <button
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(page + 1)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white disabled:opacity-30 transition-all font-bold"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCommentList;