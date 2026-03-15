import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

/* ─── Icons ─────────────────────────────────────────────────────── */
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconHide = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const IconShow = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconWarn = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ─── Helpers ───────────────────────────────────────────────────── */
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('vi-VN'),
    time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  };
};

/* ─── Pagination ─────────────────────────────────────────────────── */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    return start + i;
  }).filter(p => p >= 1 && p <= totalPages);

  return (
    <div className="flex items-center justify-center gap-1.5 mt-5">
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 text-sm font-semibold hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >‹</button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${p === currentPage
            ? 'bg-indigo-600 border-indigo-600 text-white border'
            : 'border border-gray-200 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
            }`}
        >{p}</button>
      ))}
      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 text-sm font-semibold hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >›</button>
    </div>
  );
};

/* ─── Component ─────────────────────────────────────────────────── */
const AdminCommentList = () => {
  const [comments, setComments] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalVisible, setTotalVisible] = useState(0);
  const [totalHidden, setTotalHidden] = useState(0);
  const limit = 10;
  const searchTimeout = useRef(null);

  const fetchComments = useCallback(async (q = search) => {
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get('http://localhost:5000/api/admin/comments', {
        params: { search: q, page, limit },
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(data.comments);
      setTotal(data.total);
      setTotalVisible(data.totalVisible ?? data.comments.filter(c => !c.isHidden).length);
      setTotalHidden(data.totalHidden ?? data.comments.filter(c => c.isHidden).length);
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể tải bình luận', 'error');
    }
  }, [search, page]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchComments(val), 400);
  };

  const toggleHide = async (comment) => {
    if (comment.isHidden) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.put(
          `http://localhost:5000/api/admin/comments/${comment._id}/unhide`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await fetchComments();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể hiện bình luận', 'error');
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
        'Vi phạm chính sách': 'Vi phạm chính sách',
      },
      inputPlaceholder: 'Chọn lý do ẩn',
      showCancelButton: true,
      confirmButtonText: 'Ẩn',
      cancelButtonText: 'Huỷ',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#9ca3af',
      inputValidator: (v) => !v && 'Bạn phải chọn lý do ẩn!',
    });

    if (reason) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.put(
          `http://localhost:5000/api/admin/comments/${comment._id}/hide`,
          { reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await fetchComments();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể ẩn bình luận', 'error');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">

      {/* ── Header ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-indigo-600 mb-1">Admin · Bookstore</p>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Bình luận</h1>
        <p className="text-sm text-gray-400 mt-1">Xem và kiểm duyệt bình luận của người dùng.</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Tổng bình luận', dot: 'bg-indigo-500', value: total },
          { label: 'Đang hiển thị', dot: 'bg-green-500', value: totalVisible },
          { label: 'Đã ẩn', dot: 'bg-red-500', value: totalHidden },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1 font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-400">
            Hiển thị <strong className="text-gray-700">{comments.length}</strong> / {total} bình luận
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400">
            <IconSearch />
            <input
              className="border-none outline-none bg-transparent text-xs text-gray-700 w-48 placeholder:text-gray-400"
              placeholder="Tìm sách hoặc người dùng..."
              value={search}
              onChange={handleSearch}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['No.', 'Người dùng', 'Sách', 'Nội dung bình luận', 'Ngày', 'Ẩn / Hiện'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i >= 4 ? 'text-center' : 'text-left'}`}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400 text-sm">
                    Không có bình luận nào.
                  </td>
                </tr>
              ) : (
                comments.map((c, index) => {
                  const { date, time } = formatDate(c.createdAt);
                  return (
                    <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">

                      {/* No. */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-gray-400">
                          {String((page - 1) * limit + index + 1).padStart(3, '0')}
                        </span>
                      </td>

                      {/* Người dùng */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 text-xs">{c.userId?.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{c.userId?.email}</div>
                      </td>

                      {/* Sách */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-gray-600 max-w-[140px] truncate block">
                          {c.bookId?.title || '—'}
                        </span>
                      </td>

                      {/* Nội dung */}
                      <td className="px-4 py-3 max-w-xs">
                        {c.isHidden ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-[11px] font-semibold">
                            <IconWarn /> {c.hiddenReason}
                          </span>
                        ) : (
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{c.content}</p>
                        )}
                      </td>

                      {/* Ngày */}
                      <td className="px-4 py-3 text-center">
                        <div className="font-mono text-[10px] text-gray-400 leading-relaxed">
                          {date}<br />{time}
                        </div>
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3 text-center">
                        {c.isHidden ? (
                          <button
                            onClick={() => toggleHide(c)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-indigo-200 bg-white text-indigo-600 text-[11px] font-semibold hover:bg-indigo-50 transition-colors"
                          >
                            <IconShow /> Hiện
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleHide(c)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-red-200 bg-white text-red-600 text-[11px] font-semibold hover:bg-red-50 transition-colors"
                          >
                            <IconHide /> Ẩn
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
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default AdminCommentList;