import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';

const BADGES = {
  pending: { label: 'Đang xử lý', cls: 'bg-yellow-50 text-yellow-800 border border-yellow-200', dot: 'bg-yellow-500' },
  shipping: { label: 'Đang giao', cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-600' },
  delivered: { label: 'Đã giao', cls: 'bg-green-50  text-green-700  border border-green-200', dot: 'bg-green-500' },
  pending_refund: { label: 'Cần hoàn tiền', cls: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
  done_refund: { label: 'Đã hoàn tiền', cls: 'bg-pink-50 text-pink-700 border border-pink-200', dot: 'bg-pink-500' },
  cancelled_cod: { label: 'Đã hủy · COD', cls: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
};

const getBadgeKey = (order) => {
  if (order.status === 'cancelled') {
    if (order.paymentStatus === 'Đã hoàn tiền') return 'done_refund';
    if (order.paymentStatus === 'Hoàn tiền') return 'pending_refund';
    return 'cancelled_cod';
  }
  return order.status;
};

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Đang xử lý' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'pending_refund', label: 'Cần hoàn tiền' },
  { key: 'done_refund', label: 'Đã hoàn tiền' },
  { key: 'cod_cancelled', label: 'Hủy · COD' },
];

const getImageUrl = (p) => `http://localhost:5000${p}`;
const formatPrice = (n) => n?.toLocaleString('vi-VN') + ' ₫';

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [filterStatus, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const fetchOrders = async () => {
    setError(null); setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/api/admin/orders?page=${currentPage}&limit=10&status=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Hứng dữ liệu theo chuẩn mới
      setOrders(res.data.orders || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalOrders(res.data.totalOrders || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [currentPage, filterStatus]);

  // Reset về trang 1 khi đổi bộ lọc
  useEffect(() => { setCurrentPage(1); }, [filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
        <button onClick={fetchOrders} disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border bg-white text-gray-500 text-xs shadow-sm hover:border-gray-300">
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(f => {
          const active = filterStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <span className="text-[11px] text-gray-400">Tổng số: <strong className="text-gray-700">{totalOrders}</strong> đơn hàng</span>
        </div>

        <table className="w-full text-[13px] border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3.5 py-2.5 text-left text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mã đơn</th>
              <th className="px-3.5 py-2.5 text-left text-[10px] uppercase tracking-widest text-gray-400 font-bold">Sản phẩm</th>
              <th className="px-3.5 py-2.5 text-left text-[10px] uppercase tracking-widest text-gray-400 font-bold">Người mua</th>
              <th className="px-3.5 py-2.5 text-right text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tổng tiền</th>
              <th className="px-3.5 py-2.5 text-left text-[10px] uppercase tracking-widest text-gray-400 font-bold">Trạng thái</th>
              <th className="px-3.5 py-2.5 text-center text-[10px] uppercase tracking-widest text-gray-400 font-bold">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="6" className="py-16 text-center text-gray-400 text-sm">📭 Không tìm thấy đơn hàng nào.</td></tr>
            ) : (
              orders.map(order => {
                const badge = BADGES[getBadgeKey(order)] || { label: order.status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                return (
                  <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-3.5 py-3 align-middle"><span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">#{order._id.slice(-6).toUpperCase()}</span></td>
                    <td className="px-3.5 py-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <img src={getImageUrl(order.items[0]?.book?.image)} alt="book" className="w-10 h-12 object-cover rounded border border-gray-200 shadow-sm flex-shrink-0" />
                        <div>
                          <p className="text-[12px] font-medium text-gray-700 line-clamp-2 max-w-[190px] leading-snug">{order.items[0]?.book?.title || 'N/A'}</p>
                          {order.items.length > 1 && <p className="text-[10px] text-gray-400 italic mt-0.5">+ {order.items.length - 1} sản phẩm khác</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 align-middle text-[12px] text-gray-700 font-medium">{order.user?.name || order.shippingAddress?.fullName || 'N/A'}</td>
                    <td className="px-3.5 py-3 align-middle text-right font-mono text-[13px] font-bold text-gray-900">{formatPrice(order.totalPrice)}</td>
                    <td className="px-3.5 py-3 align-middle"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />{badge.label}</span></td>
                    <td className="px-3.5 py-3 align-middle text-center"><button onClick={() => navigate(`/admin/orders/${order._id}`)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition">Xem</button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminOrders;