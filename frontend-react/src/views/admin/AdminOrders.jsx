import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  // ✅ Trạng thái để lưu giá trị bộ lọc
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchOrders = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getImageUrl = (p) => `http://localhost:5000${p}`;
  const formatPrice = (n) => n.toLocaleString('vi-VN') + ' ₫';

  const translateStatus = (order) => {
    if (order.status === 'cancelled') {
      if (order.paymentStatus === 'Đã hoàn tiền') return 'Đã hủy (Đã hoàn tiền)';
      if (order.paymentStatus === 'Hoàn tiền') return 'Đã hủy (Chưa hoàn tiền)';
      return 'Đã hủy (COD)';
    }
    switch (order.status) {
      case 'pending': return 'Đang xử lý';
      case 'shipping': return 'Đang giao';
      case 'delivered': return 'Đã giao';
      default: return order.status;
    }
  };

  const statusClass = (order) => {
    if (order.status === 'cancelled') {
      if (order.paymentStatus === 'Đã hoàn tiền') return 'text-pink-500 font-medium';
      if (order.paymentStatus === 'Hoàn tiền') return 'text-red-800 font-bold bg-red-100 px-2 py-1 rounded animate-pulse';
      return 'text-red-400 font-medium';
    }
    switch (order.status) {
      case 'pending': return 'text-yellow-600 font-medium';
      case 'shipping':
      case 'delivered': return 'text-green-600 font-medium';
      default: return 'text-gray-600';
    }
  };

  // ✅ LOGIC LỌC ĐƠN HÀNG
  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders;

    return orders.filter(order => {
      if (filterStatus === 'pending_refund') {
        return order.status === 'cancelled' && order.paymentStatus === 'Hoàn tiền';
      }
      if (filterStatus === 'done_refund') {
        return order.status === 'cancelled' && order.paymentStatus === 'Đã hoàn tiền';
      }
      if (filterStatus === 'cod_cancelled') {
        return order.status === 'cancelled' && !['Hoàn tiền', 'Đã hoàn tiền'].includes(order.paymentStatus);
      }
      return order.status === filterStatus;
    });
  }, [orders, filterStatus]);

  const viewDetail = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-extrabold text-gray-800">Quản lý Đơn hàng</h1>

        {/* ✅ THANH BỘ LỌC TRẠNG THÁI */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm border">
          <span className="text-xs font-bold text-gray-500 ml-2 uppercase">Lọc theo:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border-none focus:ring-0 font-semibold text-blue-600 bg-transparent cursor-pointer"
          >
            <option value="all">Tất cả đơn hàng</option>
            <option value="pending">Đang xử lý</option>
            <option value="shipping">Đang giao</option>
            <option value="delivered">Đã giao</option>
            <option value="pending_refund">Đã hủy (chưa hoàn tiền)</option>
            <option value="done_refund">Đã hủy(đã hoàn tiền )</option>
            <option value="cod_cancelled">Đã hủy (COD)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 border-b text-left">
            <tr>
              <th className="p-4 font-bold text-gray-700">Mã đơn</th>
              <th className="p-4 font-bold text-gray-700">Sản phẩm</th>
              <th className="p-4 font-bold text-gray-700">Người mua</th>
              <th className="p-4 font-bold text-gray-700 text-right">Tổng tiền</th>
              <th className="p-4 font-bold text-gray-700">Trạng thái</th>
              <th className="p-4 font-bold text-gray-700 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-500 italic text-base">
                  Không tìm thấy đơn hàng nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 border-b transition-colors">
                  <td className="p-4 font-semibold text-xs text-gray-500">
                    {order._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={getImageUrl(order.items[0]?.book?.image)} alt="ảnh sách" className="w-12 h-16 object-cover rounded shadow-sm border" />
                      <div>
                        <p className="font-medium text-gray-800 line-clamp-2 max-w-[200px]">
                          {order.items[0]?.book?.title || 'Sản phẩm không xác định'}
                        </p>
                        {order.items.length > 1 && (
                          <p className="text-[11px] text-gray-400 italic mt-1">
                            + {order.items.length - 1} sản phẩm khác
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700">
                    {order.user?.name || order.shippingAddress?.fullName || 'N/A'}
                  </td>
                  <td className="p-4 font-bold text-gray-900 text-right">
                    {formatPrice(order.totalPrice)}
                  </td>
                  <td className="p-4">
                    <span className={statusClass(order)}>
                      {translateStatus(order)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => viewDetail(order._id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded shadow-sm transition-all text-xs"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded font-medium">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;