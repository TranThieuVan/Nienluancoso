import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaShoppingCart, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState({});
  const [previousStatus, setPreviousStatus] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const { data } = await axios.get(`/api/admin/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(data);
        setPreviousStatus(data.status);
      } catch (err) {
        console.error('Lỗi khi lấy đơn hàng:', err);
      }
    };
    fetchOrder();
  }, [id]);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDateTime = (iso) => new Date(iso).toLocaleString('vi-VN');
  const formatAddress = (a) => `${a?.street || ''}, ${a?.district || ''}, ${a?.city || ''}`;
  const getImageUrl = (path) => `http://localhost:5000${path}`;
  const formatPrice = (num) => (num || 0).toLocaleString('vi-VN') + 'đ';

  const translateStatus = (s) => {
    switch (s) {
      case 'pending': return 'Đang xử lý';
      case 'shipping': return 'Đang giao';
      case 'delivered': return 'Đã giao';
      case 'cancelled': return 'Đã hủy';
      default: return s;
    }
  };

  const allowedStatusTransitions = {
    pending: ['shipping'],
    shipping: ['delivered'],
    delivered: [],
    cancelled: []
  };

  const subTotal = useMemo(() => {
    return order.items?.reduce((sum, item) => sum + item.quantity * item.book.price, 0) || 0;
  }, [order.items]);

  const totalAmount = subTotal + (order.shippingFee || 0);

  const confirmStatusChange = async (event) => {
    const newStatus = event.target.value;
    const currentStatus = previousStatus;

    const allowedNext = allowedStatusTransitions[currentStatus];
    if (!allowedNext.includes(newStatus)) {
      alert(`❌ Không thể đổi từ "${translateStatus(currentStatus)}" sang "${translateStatus(newStatus)}"`);
      setOrder(prev => ({ ...prev, status: currentStatus })); // Reset select
      return;
    }

    const confirmChange = window.confirm(`Bạn có chắc muốn đổi trạng thái từ "${translateStatus(currentStatus)}" sang "${translateStatus(newStatus)}"?`);
    if (!confirmChange) {
      setOrder(prev => ({ ...prev, status: currentStatus }));
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/orders/${order._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPreviousStatus(newStatus);
      setOrder(prev => ({
        ...prev,
        status: newStatus,
        statusHistory: [...(prev.statusHistory || []), { status: newStatus, date: new Date().toISOString() }]
      }));
      alert('✅ Cập nhật trạng thái thành công!');
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái:', err);
      alert('❌ Cập nhật trạng thái thất bại');
      setOrder(prev => ({ ...prev, status: currentStatus }));
    }
  };

  const deleteOrder = async () => {
    const confirm = await Swal.fire({
      title: 'Bạn có chắc muốn xóa?',
      text: 'Hành động này sẽ xóa vĩnh viễn đơn hàng khỏi hệ thống!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e3342f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Xóa đơn hàng',
      cancelButtonText: 'Hủy'
    });

    if (confirm.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`/api/admin/orders/${order._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await Swal.fire('Đã xóa!', 'Đơn hàng đã bị xóa khỏi hệ thống.', 'success');
        navigate('/admin/orders');
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể xóa đơn hàng.', 'error');
      }
    }
  };

  if (!order._id) return <div className="p-6 text-center text-gray-500">Đang tải...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Chi tiết đơn hàng</h1>

      {/* Info top section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-200 p-4 rounded flex items-start gap-3">
          <FaShoppingCart className="text-xl text-green-700 mt-1" />
          <div>
            <p className="font-semibold text-gray-700">Tạo ngày</p>
            <p className="text-sm text-gray-800">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="bg-red-200 p-4 rounded flex items-start gap-3">
          <FaUser className="text-xl text-red-700 mt-1" />
          <div>
            <p className="font-semibold text-gray-700">Người dùng</p>
            <p className="text-sm text-gray-800">{order.user?.name || 'Ẩn danh'}</p>
          </div>
        </div>
        <div className="bg-yellow-200 p-4 rounded flex items-start gap-3">
          <FaEnvelope className="text-xl text-yellow-700 mt-1" />
          <div>
            <p className="font-semibold text-gray-700">Email</p>
            <p className="text-sm text-gray-800 truncate" title={order.user?.email}>{order.user?.email || 'Không có email'}</p>
          </div>
        </div>
        <div className="bg-blue-200 p-4 rounded flex items-start gap-3">
          <FaPhone className="text-xl text-blue-700 mt-1" />
          <div>
            <p className="font-semibold text-gray-700">Số điện thoại</p>
            <p className="text-sm text-gray-800">{order.shippingAddress?.phone || 'Không có SĐT'}</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Order Summary */}
        <div className="md:col-span-2 bg-white rounded px-2">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 text-center mt-2">Tổng hợp đơn hàng</h2>
          <div className="overflow-hidden">
            <div className="grid grid-cols-5 font-medium text-gray-700 text-sm p-2 border-b">
              <div>Hình ảnh</div>
              <div className="col-span-2">Tên sách</div>
              <div>Số lượng</div>
              <div>Đơn giá</div>
            </div>
            {order.items?.map(item => (
              <div key={item.book._id} className="grid grid-cols-5 items-center p-2 border-b">
                <img src={getImageUrl(item.book.image)} alt="book" className="w-12 h-16 object-cover rounded" />
                <div className="col-span-2 text-gray-800">{item.book.title}</div>
                <div className="text-gray-700">{item.quantity}</div>
                <div className="text-gray-700">{formatPrice(item.book.price)}</div>
              </div>
            ))}
          </div>

          <div className="text-right font-semibold text-gray-800 mt-4 space-y-1 p-3 rounded">
            <p>Tổng giá sách: <span className="text-gray-800">{formatPrice(subTotal)}</span></p>
            <p>Phí vận chuyển: <span className="text-gray-800">{formatPrice(order.shippingFee || 0)}</span></p>
            <p className="text-lg mt-1">Tổng cộng: <span className="text-red-600 font-bold">{formatPrice(totalAmount)}</span></p>
          </div>
        </div>

        {/* Right: Recipient Info */}
        <div>
          <div className="bg-gray-50 p-4 rounded border space-y-2 text-sm text-gray-700">
            <p><strong>Người nhận:</strong> {order.shippingAddress?.fullName || 'Ẩn danh'}</p>
            <p><strong>SĐT:</strong> {order.shippingAddress?.phone || 'Không có SĐT'}</p>
            <p><strong>Địa chỉ:</strong> {formatAddress(order.shippingAddress)}</p>

            <div className="mt-4">
              <label className="block font-semibold mb-1">Trạng thái đơn hàng</label>
              <select
                value={order.status}
                onChange={confirmStatusChange}
                disabled={order.status === 'cancelled'}
                className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Đang xử lý</option>
                <option value="shipping">Đang giao</option>
                <option value="delivered">Đã giao</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            {order.status === 'cancelled' && (
              <button onClick={deleteOrder} className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition">
                Xóa đơn hàng
              </button>
            )}

            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2 text-center mt-5">Lịch sử trạng thái</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {order.statusHistory?.map((entry, index) => (
                  <li key={index}>
                    <span className="font-medium">{translateStatus(entry.status)}</span> - {formatDateTime(entry.date)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;