import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ─── Constants ─────────────────────────────────────────────────── */
const BADGES = {
  pending: { label: 'Đang xử lý', cls: 'bg-yellow-50 text-yellow-800 border border-yellow-200', dot: 'bg-yellow-500' },
  delivering: { label: 'Đang giao', cls: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  delivered: { label: 'Đã giao (Chờ)', cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-500' },
  completed: { label: 'Hoàn tất', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  failed_delivery: { label: 'Giao thất bại', cls: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  return_requested: { label: 'Yêu cầu trả hàng', cls: 'bg-pink-50 text-pink-700 border border-pink-200', dot: 'bg-pink-500' },
  return_approved: { label: 'Đang trả hàng', cls: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200', dot: 'bg-fuchsia-500' },
  returning: { label: 'Khách đang gửi', cls: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' },
  returned: { label: 'Đã hoàn tiền', cls: 'bg-stone-50 text-stone-700 border border-stone-200', dot: 'bg-stone-500' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' }
};

const DATE_PRESETS = [
  { key: 'today', label: 'Hôm nay' }, { key: 'yesterday', label: 'Hôm qua' },
  { key: 'last7', label: '7 ngày' }, { key: 'last30', label: '30 ngày' },
  { key: 'thisMonth', label: 'Tháng này' }, { key: 'custom', label: 'Tuỳ chọn' },
];

const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p || 0);
const formatDate = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Hàm lấy URL ảnh Avatar an toàn
const getAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`; // Đổi URL này nếu server backend của bạn chạy ở port/domain khác
};

/* ─── Components ────────────────────────────────────────────────── */
const Ring = ({ value, color, label, sub }) => {
  const r = 26, c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-800">{pct}%</span>
      </div>
      <p className="text-[10px] font-bold text-gray-700 text-center leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-gray-400 text-center">{sub}</p>}
    </div>
  );
};

/* ─── Main View ─────────────────────────────────────────────────── */
const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('last30');
  const [statusFilter, setStatusFilter] = useState('all');

  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  const buildQS = useCallback(() => {
    const p = new URLSearchParams();
    p.set('page', currentPage);
    p.set('limit', limit);
    if (datePreset !== 'custom') p.set('preset', datePreset);
    else { if (fromDate) p.set('from', fromDate); if (toDate) p.set('to', toDate); }

    if (statusFilter !== 'all') p.set('status', statusFilter);

    return p.toString();
  }, [currentPage, datePreset, fromDate, toDate, statusFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const qs = buildQS();

      const [statsRes, listRes] = await Promise.all([
        axios.get(`/api/admin/orders/stats?${qs}`, cfg).catch(() => ({ data: null })),
        axios.get(`/api/admin/orders?${qs}`, cfg).catch(() => ({ data: { orders: [], totalPages: 1 } }))
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (listRes.data) {
        setOrders(listRes.data.orders || []);
        setTotalPages(listRes.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch orders error', error);
    } finally {
      setLoading(false);
    }
  }, [buildQS]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApplyCustom = () => {
    if (!pendingFrom || !pendingTo) return;
    setFromDate(pendingFrom); setToDate(pendingTo);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-5 md:p-7 font-sans">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Đơn hàng</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">Theo dõi, điều phối và xử lý vận đơn</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 mb-6 flex flex-wrap items-center gap-2 sticky top-0 z-10">
        <i className="fa-regular fa-calendar text-gray-400 mr-1 text-sm" />
        {DATE_PRESETS.map(p => (
          <button key={p.key} onClick={() => { setDatePreset(p.key); if (p.key !== 'custom') { setFromDate(''); setToDate(''); setCurrentPage(1); } }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${datePreset === p.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {p.label}
          </button>
        ))}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg outline-none" />
            <span className="text-gray-300 text-sm"><i className="fa-solid fa-arrow-right text-xs" /></span>
            <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg outline-none" />
            <button onClick={handleApplyCustom} disabled={!pendingFrom || !pendingTo} className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40">Áp dụng</button>
          </div>
        )}

        {/* DROPDOWN BỘ LỌC TRẠNG THÁI */}
        <div className="h-5 w-px bg-gray-200 mx-2 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-filter text-gray-400 text-sm"></i>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1.5 text-[11px] font-bold border border-gray-200 rounded-full outline-none bg-gray-50 text-gray-700 cursor-pointer hover:border-indigo-400 hover:bg-white transition-colors"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Đang xử lý (Chờ xác nhận)</option>
            <option value="delivering">Đang giao hàng</option>
            <option value="delivered">Đã giao hàng</option>
            <option value="completed">Hoàn tất</option>
            <option value="cancelled">Đã hủy</option>
            <option value="failed_delivery">Giao thất bại</option>
            <option value="return_requested">Yêu cầu trả hàng</option>
            <option value="return_approved">Đang trả hàng</option>
            <option value="returning">Khách đang gửi</option>
            <option value="returned">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* STATS RINGS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
            <h3 className="text-sm font-bold text-gray-900 mb-6 text-center">Sức khoẻ Vận hành</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Ring value={stats.rates?.deliverySuccessRate} color="#10b981" label="Giao thành công" sub={`TB ${stats.logistics?.avgDeliveryDays || 0} ngày`} />
              <Ring value={Math.max(0, 100 - Number(stats.rates?.cancelRate || 0))} color="#6366f1" label="Không hủy đơn" sub={`Hủy: ${stats.rates?.cancelRate || 0}%`} />
              <Ring value={Math.max(0, 100 - Number(stats.rates?.refundRate || 0))} color="#f59e0b" label="Không hoàn tiền" sub={`Hoàn tiền: ${stats.rates?.refundRate || 0}%`} />
            </div>

            {stats.byStatus && (
              <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap justify-center gap-3">
                {['pending', 'delivering', 'completed'].map(k => (
                  stats.byStatus[k] ? (
                    <div key={k} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <span className={`w-2 h-2 rounded-full ${BADGES[k]?.dot || 'bg-gray-400'}`} />
                      <span className="text-[10px] text-gray-500 font-medium">{BADGES[k]?.label}:</span>
                      <span className="text-xs font-black text-gray-800">{stats.byStatus[k]}</span>
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </div>

          {/* CHART */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-900">Biến động Số lượng đơn</h3>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Tổng đơn phát sinh</p>
                <p className="text-2xl font-black text-indigo-600">{stats.totalOrders}</p>
              </div>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyData || []} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                  />
                  <Area type="monotone" name="Số đơn hàng" dataKey="orders" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">Danh sách Đơn hàng</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-[10px] uppercase text-gray-500 font-bold tracking-wider">
              <tr>
                <th className="px-5 py-4 font-semibold">Mã đơn</th>
                <th className="px-5 py-4 font-semibold">Ngày đặt</th>
                <th className="px-5 py-4 font-semibold">Khách hàng</th>
                <th className="px-5 py-4 font-semibold">Thanh toán</th>
                <th className="px-5 py-4 font-semibold text-right">Tổng tiền</th>
                <th className="px-5 py-4 font-semibold text-center">Trạng thái</th>
                {/* ĐỔI LABEL THÀNH "XEM CHI TIẾT" */}
                <th className="px-5 py-4 font-semibold text-center w-24">Xem chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 block text-indigo-400" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-400 text-sm">
                    <i className="fa-solid fa-inbox text-3xl mb-2 block text-gray-300" />
                    Không có đơn hàng nào
                  </td>
                </tr>
              ) : orders.map(order => {
                const badge = BADGES[order.status] || { label: order.status, cls: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' };
                const avatarUrl = getAvatarUrl(order.user?.avatar); // Lấy URL Avatar

                return (
                  <tr key={order._id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                        #{order._id.toString().slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {/* 🔥 RENDER AVATAR USER HOẶC ICON MẶC ĐỊNH NẾU KHÔNG CÓ */}
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                            onError={(e) => {
                              // Fallback nếu ảnh bị lỗi (VD: link chết)
                              e.target.onerror = null;
                              e.target.outerHTML = '<div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0"><i class="fa-solid fa-user text-gray-400 text-xs"></i></div>';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0">
                            <i className="fa-solid fa-user text-gray-400 text-xs" />
                          </div>
                        )}
                        <div className="min-w-[120px]">
                          <p className="text-xs font-bold text-gray-900 truncate">{order.shippingAddress?.fullName}</p>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{order.shippingAddress?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border ${order.paymentStatus?.includes('Đã thanh toán') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : order.paymentStatus?.includes('Hoàn tiền') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {order.paymentMethod === 'vnpay' ? 'VNPAY' : order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'COD'}
                        <span className="mx-1.5 text-gray-300">•</span>
                        <span className="font-medium">{order.paymentStatus}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-[13px] font-black text-gray-900 font-mono">
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0`} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => navigate(`/admin/orders/${order._id}`)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                        <i className="fa-solid fa-arrow-right" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-center bg-white rounded-b-2xl min-h-[65px]">
          {totalPages > 1 && !loading && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;