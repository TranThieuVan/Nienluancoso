import { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [cancelOrderId, setCancelOrderId] = useState(null);

  const token = localStorage.getItem('token');
  const reasons = ['Thay đổi ý định', 'Đặt nhầm sản phẩm', 'Tìm thấy giá tốt hơn', 'Thời gian giao quá lâu', 'Lý do khác'];

  const formatPrice = (n) => n.toLocaleString('vi-VN') + ' ₫';
  const formatAddress = (a) => `${a.street}, ${a.district}, ${a.city}`;
  const formatDate = (isoString) => new Date(isoString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDateTime = (isoString) => new Date(isoString).toLocaleString('vi-VN');

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
      case 'shipping': return 'text-green-600 font-semibold';
      case 'delivered': return 'text-green-600 font-semibold';
      case 'cancelled': return 'text-red-600 font-semibold';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <i className="fas fa-clock mr-1"></i>;
      case 'shipping': return <i className="fas fa-check-circle mr-1 text-green-500"></i>;
      case 'delivered': return <i className="fas fa-box mr-1 text-green-500"></i>;
      case 'cancelled': return <i className="fas fa-times-circle mr-1"></i>;
      default: return null;
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      setOrders(data);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const openCancelModal = (orderId) => {
    setCancelOrderId(orderId);
    setSelectedReason('');
    setShowCancelModal(true);
  };

  const closeModal = () => {
    setShowCancelModal(false);
    setSelectedReason('');
    setCancelOrderId(null);
  };

  const confirmCancel = async () => {
    if (!selectedReason) return;
    try {
      await axios.put(`/api/orders/cancel/${cancelOrderId}`, { reason: selectedReason }, { headers: { Authorization: `Bearer ${token}` } });
      await loadOrders();
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Hủy đơn hàng thất bại');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Lịch sử đơn hàng</h1>

      {orders.length === 0 && <div className="text-center text-gray-500 italic">Bạn chưa có đơn hàng nào.</div>}

      {orders.map(order => (
        <div key={order._id} className="border rounded-xl p-4 mb-6 bg-white shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-gray-800">Mã đơn: {order._id.slice(-6).toUpperCase()}</p>
            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.book._id} className="flex items-center gap-3">
                  <img src={item.book.image} className="w-12 h-16 object-cover rounded" alt="book" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 line-clamp-2">{item.book.title}</p>
                    <p className="text-sm text-gray-600">x{item.quantity}</p>
                  </div>
                  <div className="font-semibold text-gray-700">{formatPrice(item.book.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded border space-y-2 text-sm text-gray-700">
              <p><strong>Người nhận:</strong> {order.shippingAddress.fullName}</p>
              <p><strong>SĐT:</strong> {order.shippingAddress.phone}</p>
              <p><strong>Địa chỉ:</strong> {formatAddress(order.shippingAddress)}</p>
              <p><strong>Tổng tiền: </strong><span className="text-red-600 font-bold">{formatPrice(order.totalPrice)}</span></p>

              <div>
                <strong>Trạng thái:</strong>
                <ul className="mt-1 space-y-1">
                  {order.statusHistory.map((entry, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className={statusClass(entry.status)}>
                        {getStatusIcon(entry.status)} {translateStatus(entry.status)} - {formatDateTime(entry.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {order.status === 'cancelled' && order.cancelReason && (
                <p className="text-red-600 text-sm italic">Lý do hủy: {order.cancelReason}</p>
              )}

              {order.status === 'pending' && (
                <button onClick={() => openCancelModal(order._id)} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Hủy đơn</button>
              )}
            </div>
          </div>
        </div>
      ))}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Lý do hủy đơn hàng</h3>
            <div className="space-y-3">
              {reasons.map(reason => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="cancelReason" value={reason} checked={selectedReason === reason} onChange={(e) => setSelectedReason(e.target.value)} className="form-radio text-red-600" />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={closeModal} className="px-4 py-2 border rounded hover:bg-gray-100 transition">Hủy</button>
              <button onClick={confirmCancel} disabled={!selectedReason} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700 transition">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;