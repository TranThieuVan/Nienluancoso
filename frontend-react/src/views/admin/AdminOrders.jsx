import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/* ─── Badge map ─────────────────────────────────────────────────── */
const BADGES = {
  pending: { label: 'Đang xử lý', cls: 'bg-yellow-50 text-yellow-800 border border-yellow-200', dot: 'bg-yellow-500' },
  shipping: { label: 'Đang giao', cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-600' },
  delivered: { label: 'Đã giao', cls: 'bg-green-50  text-green-700  border border-green-200', dot: 'bg-green-500' },
  pending_refund: { label: 'Cần hoàn tiền', cls: 'bg-red-50    text-red-700    border border-red-200', dot: 'bg-red-500' },
  done_refund: { label: 'Đã hoàn tiền', cls: 'bg-pink-50   text-pink-700   border border-pink-200', dot: 'bg-pink-500' },
  cancelled_cod: { label: 'Đã hủy · COD', cls: 'bg-gray-100  text-gray-600   border border-gray-200', dot: 'bg-gray-400' },
};

const getBadgeKey = (order) => {
  if (order.status === 'cancelled') {
    if (order.paymentStatus === 'Đã hoàn tiền') return 'done_refund';
    if (order.paymentStatus === 'Hoàn tiền') return 'pending_refund';
    return 'cancelled_cod';
  }
  return order.status;
};

/* ─── Filter config ─────────────────────────────────────────────── */
const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Đang xử lý' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'pending_refund', label: 'Cần hoàn tiền' },
  { key: 'done_refund', label: 'Đã hoàn tiền' },
  { key: 'cod_cancelled', label: 'Hủy · COD' },
];

const matchFilter = (order, key) => {
  if (key === 'all') return true;
  if (key === 'pending_refund') return order.status === 'cancelled' && order.paymentStatus === 'Hoàn tiền';
  if (key === 'done_refund') return order.status === 'cancelled' && order.paymentStatus === 'Đã hoàn tiền';
  if (key === 'cod_cancelled') return order.status === 'cancelled' && !['Hoàn tiền', 'Đã hoàn tiền'].includes(order.paymentStatus);
  return order.status === key;
};

/* ─── Helpers ───────────────────────────────────────────────────── */
const getImageUrl = (p) => `http://localhost:5000${p}`;
const formatPrice = (n) => n?.toLocaleString('vi-VN') + ' ₫';

/* ─── Component ─────────────────────────────────────────────────── */
const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [filterStatus, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setError(null); setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = useMemo(
    () => orders.filter(o => matchFilter(o, filterStatus)),
    [orders, filterStatus]
  );

  const counts = useMemo(() => {
    const c = {};
    FILTERS.forEach(f => {
      c[f.key] = f.key === 'all' ? orders.length : orders.filter(o => matchFilter(o, f.key)).length;
    });
    return c;
  }, [orders]);

  const stats = [
    { label: 'Tổng đơn', dot: 'bg-indigo-400', value: orders.length },
    { label: 'Đang xử lý', dot: 'bg-yellow-500', value: orders.filter(o => o.status === 'pending').length },
    { label: 'Đang giao', dot: 'bg-violet-500', value: orders.filter(o => o.status === 'shipping').length },
    { label: 'Cần hoàn tiền', dot: 'bg-red-500', value: orders.filter(o => o.status === 'cancelled' && o.paymentStatus === 'Hoàn tiền').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>

          <h1 className="text-3xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 text-xs shadow-sm hover:border-gray-300 transition"
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={loading ? 'animate-spin' : ''}
          >
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1 font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(f => {
          const active = filterStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition
                ${active
                  ? 'bg-indigo-600 border-indigo-600 text-white ring-2 ring-indigo-200'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[10px] font-mono ${active ? 'bg-white/25' : 'bg-black/5'}`}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <span className="text-[11px] text-gray-400">
            Hiển thị <strong className="text-gray-700">{filteredOrders.length}</strong> / {orders.length} đơn hàng
          </span>
        </div>

        <table className="w-full text-[13px] border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3.5 py-2.5 text-left   text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mã đơn</th>
              <th className="px-3.5 py-2.5 text-left   text-[10px] uppercase tracking-widest text-gray-400 font-bold">Sản phẩm</th>
              <th className="px-3.5 py-2.5 text-left   text-[10px] uppercase tracking-widest text-gray-400 font-bold">Người mua</th>
              <th className="px-3.5 py-2.5 text-right  text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tổng tiền</th>
              <th className="px-3.5 py-2.5 text-left   text-[10px] uppercase tracking-widest text-gray-400 font-bold">Trạng thái</th>
              <th className="px-3.5 py-2.5 text-center text-[10px] uppercase tracking-widest text-gray-400 font-bold">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-16 text-center text-gray-400 text-sm">
                  📭 Không tìm thấy đơn hàng nào.
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const badge = BADGES[getBadgeKey(order)] || { label: order.status, cls: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' };
                return (
                  <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">

                    {/* Mã đơn */}
                    <td className="px-3.5 py-3 align-middle">
                      <span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        #{order._id.slice(-6).toUpperCase()}
                      </span>
                    </td>

                    {/* Sản phẩm */}
                    <td className="px-3.5 py-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getImageUrl(order.items[0]?.book?.image)}
                          alt="book"
                          className="w-10 h-12 object-cover rounded border border-gray-200 shadow-sm flex-shrink-0"
                        />
                        <div>
                          <p className="text-[12px] font-medium text-gray-700 line-clamp-2 max-w-[190px] leading-snug">
                            {order.items[0]?.book?.title || 'Sản phẩm không xác định'}
                          </p>
                          {order.items.length > 1 && (
                            <p className="text-[10px] text-gray-400 italic mt-0.5">
                              + {order.items.length - 1} sản phẩm khác
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Người mua */}
                    <td className="px-3.5 py-3 align-middle">
                      <span className="text-[12px] text-gray-700 font-medium">
                        {order.user?.name || order.shippingAddress?.fullName || 'N/A'}
                      </span>
                    </td>

                    {/* Tổng tiền */}
                    <td className="px-3.5 py-3 align-middle text-right">
                      <span className="font-mono text-[13px] font-bold text-gray-900 whitespace-nowrap">
                        {formatPrice(order.totalPrice)}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3.5 py-3 align-middle">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Chi tiết */}
                    <td className="px-3.5 py-3 align-middle text-center">
                      <button
                        onClick={() => navigate(`/admin/orders/${order._id}`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition shadow-sm"
                      >
                        Xem chi tiết
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[13px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;