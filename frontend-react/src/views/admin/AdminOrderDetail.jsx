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
        Swal.fire('Lỗi', 'Không thể tải thông tin đơn hàng', 'error');
      }
    };
    fetchOrder();
  }, [id]);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDateTime = (iso) => new Date(iso).toLocaleString('vi-VN');

  const formatAddress = (a) => {
    if (!a) return 'N/A';
    return `${a.street || ''}, ${a.ward || ''}, ${a.district || ''}, ${a.city || ''}`;
  };

  const getImageUrl = (path) => path?.startsWith('http') ? path : `http://localhost:5000${path}`;
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
    pending: ['shipping', 'cancelled'],
    shipping: ['delivered', 'cancelled'],
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
      Swal.fire('Thông báo', `Không thể chuyển từ "${translateStatus(currentStatus)}" sang "${translateStatus(newStatus)}"`, 'warning');
      setOrder(prev => ({ ...prev, status: currentStatus }));
      return;
    }

    let cancelReason = '';

    // ✅ Nếu Admin chọn Hủy, hiển thị form yêu cầu nhập lý do
    if (newStatus === 'cancelled') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'Nhập lý do hủy đơn',
        input: 'textarea',
        inputPlaceholder: 'Ví dụ: Khách boom hàng, Đặt trùng, Hết sách...',
        showCancelButton: true,
        confirmButtonText: 'Xác nhận hủy',
        cancelButtonText: 'Quay lại',
        inputValidator: (value) => {
          if (!value) return 'Bạn cần nhập lý do để hủy đơn!';
        }
      });

      if (!isConfirmed) {
        setOrder(prev => ({ ...prev, status: currentStatus }));
        return;
      }
      cancelReason = text;
    } else {
      // Đối với các trạng thái khác, chỉ hỏi xác nhận bình thường
      const result = await Swal.fire({
        title: 'Xác nhận thay đổi?',
        text: `Đổi trạng thái sang "${translateStatus(newStatus)}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
      });

      if (!result.isConfirmed) {
        setOrder(prev => ({ ...prev, status: currentStatus }));
        return;
      }
    }

    // Gửi dữ liệu lên API
    try {
      const token = localStorage.getItem('adminToken');
      // ✅ Gửi kèm lý do hủy (nếu có)
      await axios.put(`/api/admin/orders/${order._id}/status`,
        { status: newStatus, reason: cancelReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPreviousStatus(newStatus);
      setOrder(prev => ({
        ...prev,
        status: newStatus,
        cancelReason: cancelReason || prev.cancelReason,
        statusHistory: [...(prev.statusHistory || []), { status: newStatus, date: new Date().toISOString() }]
      }));
      Swal.fire('Thành công', 'Cập nhật trạng thái thành công', 'success');
    } catch (err) {
      Swal.fire('Lỗi', 'Không thể cập nhật trạng thái', 'error');
      setOrder(prev => ({ ...prev, status: currentStatus }));
    }
  };

  const deleteOrder = async () => {
    const confirm = await Swal.fire({
      title: 'Xóa đơn hàng?',
      text: 'Hành động này sẽ xóa vĩnh viễn đơn hàng!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Hủy'
    });

    if (confirm.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`/api/admin/orders/${order._id}`, { headers: { Authorization: `Bearer ${token}` } });
        await Swal.fire('Đã xóa', '', 'success');
        navigate('/admin/orders');
      } catch (err) {
        Swal.fire('Lỗi', 'Không thể xóa đơn hàng.', 'error');
      }
    }
  };

  if (!order._id) return <div className="p-6 text-center text-gray-500 font-bold">Đang tải...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-800">Đơn hàng #{order._id.slice(-6).toUpperCase()}</h1>
        <button onClick={() => navigate('/admin/orders')} className="text-blue-600 hover:underline font-semibold">← Quay lại</button>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow flex items-center gap-4"><FaShoppingCart className="text-green-600 text-2xl" /><div><p className="text-xs text-gray-500">Ngày đặt</p><p className="font-bold">{formatDate(order.createdAt)}</p></div></div>
        <div className="bg-white p-4 rounded shadow flex items-center gap-4"><FaUser className="text-red-600 text-2xl" /><div><p className="text-xs text-gray-500">Khách hàng</p><p className="font-bold">{order.user?.name || 'Ẩn danh'}</p></div></div>
        <div className="bg-white p-4 rounded shadow flex items-center gap-4"><FaEnvelope className="text-yellow-500 text-2xl" /><div><p className="text-xs text-gray-500">Email</p><p className="font-bold truncate w-32">{order.user?.email || 'N/A'}</p></div></div>
        <div className="bg-white p-4 rounded shadow flex items-center gap-4"><FaPhone className="text-blue-600 text-2xl" /><div><p className="text-xs text-gray-500">Liên hệ</p><p className="font-bold">{order.shippingAddress?.phone}</p></div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded shadow overflow-hidden">
          <div className="p-5 border-b bg-gray-50"><h2 className="font-bold text-gray-700">Sản phẩm</h2></div>
          <div className="p-5">
            <table className="w-full text-left border-collapse">
              <thead><tr className="text-gray-400 text-sm border-b"><th className="pb-2">Sản phẩm</th><th className="pb-2">SL</th><th className="pb-2 text-right">Đơn giá</th><th className="pb-2 text-right">Thành tiền</th></tr></thead>
              <tbody className="divide-y">
                {order.items?.map(item => (
                  <tr key={item.book._id}>
                    <td className="py-3 flex items-center gap-3"><img src={getImageUrl(item.book.image)} className="w-10 h-14 object-cover rounded" alt="book" /><span className="font-semibold text-sm">{item.book.title}</span></td>
                    <td className="py-3">x{item.quantity}</td>
                    <td className="py-3 text-right">{formatPrice(item.book.price)}</td>
                    <td className="py-3 text-right font-bold">{formatPrice(item.quantity * item.book.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 border-t pt-4 text-right space-y-1">
              <p className="text-gray-500">Phí vận chuyển: {formatPrice(order.shippingFee)}</p>
              <p className="text-xl font-black text-red-600">Tổng cộng: {formatPrice(totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded shadow space-y-4">
            <h2 className="font-bold text-gray-800 border-b pb-2">Giao hàng & Trạng thái</h2>
            <div className="text-sm space-y-2">
              <p><strong>Người nhận:</strong> {order.shippingAddress?.fullName}</p>
              <p><strong>Địa chỉ:</strong> {formatAddress(order.shippingAddress)}</p>
              <p><strong>Thanh toán:</strong> <span className="uppercase text-blue-600 font-bold">{order.paymentMethod || 'cod'}</span></p>
            </div>

            <div className="pt-4 border-t">
              <label className="block text-sm font-bold mb-2">Trạng thái đơn hàng</label>
              <select
                value={order.status}
                onChange={confirmStatusChange}
                disabled={order.status === 'cancelled' || order.status === 'delivered'}
                className="w-full border-2 rounded p-2 focus:border-blue-500 outline-none disabled:bg-gray-100 font-semibold"
              >
                <option value="pending">⏳ Đang xử lý</option>
                <option value="shipping">🚚 Đang giao hàng</option>
                <option value="delivered">✅ Đã giao hàng</option>
                <option value="cancelled">❌ Đã hủy</option>
              </select>
            </div>

            {/* ✅ Hiển thị lý do hủy đơn cho Admin xem */}
            {order.status === 'cancelled' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
                <p className="font-bold text-red-600 uppercase mb-1">Lý do hủy:</p>
                <p className="text-red-700 italic">"{order.cancelReason || 'Không có lý do'}"</p>
              </div>
            )}

            {order.status === 'cancelled' && (
              <button onClick={deleteOrder} className="w-full bg-red-600 text-white font-bold py-2 rounded mt-4">Xóa đơn hàng</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;