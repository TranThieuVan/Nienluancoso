import { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Swal from 'sweetalert2';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [cancelOrderId, setCancelOrderId] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 3;

  const token = localStorage.getItem('token');
  const reasons = ['Thay đổi ý định', 'Đặt nhầm sản phẩm', 'Tìm thấy giá tốt hơn', 'Thời gian giao quá lâu', 'Lý do khác'];

  const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + ' ₫';
  const formatAddress = (a) => `${a.street}, ${a.ward || ''}, ${a.district}, ${a.city}`;
  const formatDate = (isoString) => new Date(isoString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDateTime = (isoString) => new Date(isoString).toLocaleString('vi-VN');

  const getLocalYYYYMMDD = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

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
      case 'shipping': return 'text-blue-600 font-semibold';
      case 'delivered': return 'text-green-600 font-semibold';
      case 'cancelled': return 'text-red-600 font-semibold';
      default: return 'text-gray-600';
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      setOrders(data);

      if (data.length > 0 && !startDate && !endDate) {
        const timestamps = data.map(o => new Date(o.createdAt).getTime());
        const minDate = new Date(Math.min(...timestamps));
        const maxDate = new Date(Math.max(...timestamps));

        setStartDate(getLocalYYYYMMDD(minDate));
        setEndDate(getLocalYYYYMMDD(maxDate));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

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
      await axios.put(`/api/orders/cancel/${cancelOrderId}`,
        { reason: selectedReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire('Thành công', 'Đơn hàng của bạn đã được hủy.', 'success');
      await loadOrders();
      closeModal();
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Hủy đơn hàng thất bại', 'error');
    }
  };

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    orderDate.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    if (start) start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && orderDate < start) return false;
    if (end && orderDate > end) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 min-h-screen animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-3 mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800">Lịch sử đơn hàng</h1>

        {orders.length > 0 && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400 px-1">Từ ngày</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm font-semibold outline-none px-2 text-gray-700 bg-transparent cursor-pointer"
              />
            </div>
            <span className="text-gray-300">-</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400 px-1">Đến ngày</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm font-semibold outline-none px-2 text-gray-700 bg-transparent cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <FontAwesomeIcon icon={['fas', 'box-open']} className="text-gray-300 text-5xl mb-4" />
          <p className="text-gray-500 italic">Bạn chưa có đơn hàng nào.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 font-medium">Không tìm thấy đơn hàng nào trong khoảng thời gian này.</p>
        </div>
      ) : (
        <>
          {currentOrders.map(order => (
            <div key={order._id} className="border rounded-2xl p-4 md:p-5 mb-5 bg-white shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Mã đơn hàng</p>
                  <p className="font-black text-base md:text-lg text-blue-600">#{order._id.slice(-6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Ngày đặt</p>
                  <p className="font-semibold text-sm md:text-base text-gray-700">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5 pt-1">
                <div className="space-y-3">
                  {order.items.map(item => (
                    <div key={item.book._id} className="flex items-center gap-3 group">
                      <div className="relative overflow-hidden rounded shadow-sm w-12 h-16">
                        <img
                          src={item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          alt="book"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 line-clamp-2 text-sm">{item.book.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 italic">Số lượng: {item.quantity}</p>
                      </div>
                      <div className="font-bold text-sm text-gray-700">{formatPrice(item.book.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2 text-sm text-gray-700">
                  <p className="flex justify-between"><strong>Tên Người nhận:</strong> <span>{order.shippingAddress.fullName}</span></p>
                  <p className="flex justify-between"><strong>Số Điện thoại:</strong> <span>{order.shippingAddress.phone}</span></p>

                  {/* ✅ THÔNG TIN THANH TOÁN */}
                  <p className="flex justify-between">
                    <strong>Hình thức thanh toán:</strong>
                    <span className="font-semibold text-blue-700 uppercase">{order.paymentMethod === 'vnpay' ? 'VNPAY' : 'Chuyển khoản'}</span>
                  </p>

                  <div className="border-t pt-2 mt-1">
                    <strong>Địa chỉ giao hàng:</strong>
                    <p className="text-gray-500 mt-0.5 leading-snug">{formatAddress(order.shippingAddress)}</p>
                  </div>

                  <p className="flex justify-between text-base border-t pt-2 mt-2 font-bold">
                    <span>Tổng tiền:</span>
                    <span className="text-red-600">{formatPrice(order.totalPrice)}</span>
                  </p>

                  <div className="pt-2">
                    <strong className="block mb-1.5">Trạng thái đơn hàng:</strong>
                    <div className="space-y-1.5">
                      {order.statusHistory.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${index === order.statusHistory.length - 1 ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          <span className={`${statusClass(entry.status)} text-[11px] md:text-xs`}>
                            {translateStatus(entry.status)} - {formatDateTime(entry.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ✅ TRẠNG THÁI HOÀN TIỀN DÀNH CHO ĐƠN HÀNG ĐÃ HỦY */}
                  {order.status === 'cancelled' && (
                    <div className="pt-2 border-t mt-2 flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                      <strong className="text-xs">Hoàn tiền:</strong>
                      {order.paymentStatus === 'Hoàn tiền' ? (
                        <span className="text-orange-600 font-bold text-xs animate-pulse">⏳ Đang chờ hoàn tiền</span>
                      ) : order.paymentStatus === 'Đã hoàn tiền' ? (
                        <span className="text-green-600 font-bold text-xs">✅ Hoàn tiền thành công</span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Không áp dụng (COD)</span>
                      )}
                    </div>
                  )}

                  {order.status === 'cancelled' && order.cancelReason && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-red-600 text-[11px] font-bold uppercase mb-0.5 underline">Lý do hủy đơn:</p>
                      <p className="text-red-700 text-xs italic">"{order.cancelReason}"</p>
                    </div>
                  )}

                  {order.status === 'pending' && (
                    <button
                      onClick={() => openCancelModal(order._id)}
                      className="mt-3 w-full py-1.5 bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                    >
                      YÊU CẦU HỦY ĐƠN
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* ... phần phân trang giữ nguyên ... */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                &laquo;
              </button>

              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 text-sm font-bold transition ${currentPage === index + 1
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                    : 'border-gray-200 text-gray-600 hover:border-blue-400'
                    }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* ... phần modal giữ nguyên ... */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative animate-in zoom-in duration-300">
            <button onClick={closeModal} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
            <h3 className="text-xl font-black mb-5 text-gray-800">Tại sao bạn muốn hủy?</h3>
            <div className="space-y-3">
              {reasons.map(reason => (
                <label key={reason} className={`flex items-center gap-3 p-2.5 border-2 rounded-xl cursor-pointer transition-all ${selectedReason === reason ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="font-medium text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={closeModal} className="flex-1 py-2 border-2 border-gray-100 rounded-lg font-bold text-sm text-gray-500 hover:bg-gray-50 transition">QUAY LẠI</button>
              <button
                onClick={confirmCancel}
                disabled={!selectedReason}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-md shadow-red-100 disabled:opacity-50 hover:bg-red-700 transition active:scale-95"
              >
                XÁC NHẬN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;