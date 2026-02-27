import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEllipsisV } from 'react-icons/fa';

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  const fetchOrders = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      // Chuyển fetch thành axios để nhất quán
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

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return 'Đang xử lý';
      case 'shipping': return 'Đang giao';
      case 'delivered': return 'Đã giao';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 font-medium';
      case 'shipping':
      case 'delivered': return 'text-green-600 font-medium';
      case 'cancelled': return 'text-red-600 font-medium';
      default: return 'text-gray-600';
    }
  };

  const toggleMenu = (id) => {
    setActiveMenu(activeMenu === id ? null : id);
  };

  const viewDetail = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
    setActiveMenu(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Quản lý Đơn hàng</h1>

      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-100 border-b bg-white text-left">
          <tr>
            <th className="p-3">Mã đơn</th>
            <th className="p-3">Sản phẩm</th>
            <th className="p-3">Người mua</th>
            <th className="p-3">Tổng tiền</th>
            <th className="p-3">Trạng thái</th>
            <th className="p-3 text-center">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="hover:bg-gray-50 border-b">
              <td className="p-3 font-semibold text-xs text-gray-700 align-middle">
                {order._id.slice(-6).toUpperCase()}
              </td>
              <td className="p-3 align-middle">
                <div className="flex items-center gap-2">
                  <img src={getImageUrl(order.items[0]?.book?.image)} alt="ảnh sách" className="w-12 h-16 object-cover rounded" />
                  <div>
                    <p className="font-medium text-gray-800 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {order.items[0]?.book?.title || 'Sản phẩm không xác định'}
                    </p>
                    {order.items.length > 1 && (
                      <p className="text-xs text-gray-500 italic">
                        ... và {order.items.length - 1} sản phẩm khác
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-3 align-middle">
                {order.user?.name || 'Khách không xác định'}
              </td>
              <td className="p-3 align-middle">
                {formatPrice(order.totalPrice)}
              </td>
              <td className="p-3 align-middle">
                <span className={statusClass(order.status)}>
                  {translateStatus(order.status)}
                </span>
              </td>
              <td className="p-3 text-center align-middle relative">
                <button onClick={() => toggleMenu(order._id)}>
                  <FaEllipsisV className="text-gray-600 hover:text-black text-xl px-2 py-2" />
                </button>
                {activeMenu === order._id && (
                  <div className="absolute right-8 top-10 z-10 w-40 bg-white rounded shadow-lg border">
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => viewDetail(order._id)}
                    >
                      Thông tin chi tiết
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <div className="mt-4 text-red-600 font-semibold">{error}</div>}
    </div>
  );
};

export default AdminOrders;