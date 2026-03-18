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

  const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
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

  const statusConfig = (status) => {
    switch (status) {
      case 'pending': return { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Đang xử lý' };
      case 'shipping': return { dot: 'bg-blue-400', text: 'text-blue-700', bg: 'bg-blue-50', label: 'Đang giao' };
      case 'delivered': return { dot: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50', label: 'Đã giao' };
      case 'cancelled': return { dot: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50', label: 'Đã hủy' };
      default: return { dot: 'bg-stone-400', text: 'text-stone-600', bg: 'bg-stone-50', label: status };
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

  useEffect(() => { loadOrders(); }, []);
  useEffect(() => { setCurrentPage(1); }, [startDate, endDate]);

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
  const currentOrders = filteredOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── PAGE HEADER ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-700 mb-1">Của tôi</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h1 className="text-3xl font-bold text-black">Lịch sử đơn hàng</h1>

            {/* Date Filter */}
            {orders.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-stone-700 mb-1">Từ ngày</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm font-medium outline-none border border-gray-200 focus:border-black px-3 py-2 bg-white transition-colors cursor-pointer"
                  />
                </div>
                <span className="text-stone-300 mt-5">—</span>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-stone-700 mb-1">Đến ngày</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm font-medium outline-none border border-gray-200 focus:border-black px-3 py-2 bg-white transition-colors cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-16 h-16 bg-stone-50 border border-gray-100 flex items-center justify-center">
              <FontAwesomeIcon icon={['fas', 'box-open']} className="text-2xl text-stone-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-black mb-1">Chưa có đơn hàng nào</p>
              <p className="text-stone-700 text-sm">Hãy mua sắm và đặt hàng để xem lịch sử ở đây.</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <FontAwesomeIcon icon={['fas', 'calendar-xmark']} className="text-3xl text-stone-200" />
            <p className="text-stone-700 text-sm">Không tìm thấy đơn hàng nào trong khoảng thời gian này.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              {currentOrders.map(order => {
                const sc = statusConfig(order.status);
                return (
                  <div key={order._id} className="border border-gray-100 bg-white hover:border-stone-300 transition-colors duration-200">
                    {/* Order Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-stone-50/50">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-700">Đơn hàng</p>
                          <p className="font-bold text-sm text-black tracking-wider">
                            #{order._id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div>
                          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-700">Ngày đặt</p>
                          <p className="font-medium text-sm text-black">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${order.status === 'pending' || order.status === 'shipping' ? 'animate-pulse' : ''}`} />
                        {sc.label}
                      </span>
                    </div>

                    {/* Order Body */}
                    <div className="p-5 grid md:grid-cols-2 gap-6">
                      {/* Items */}
                      <div className="flex flex-col gap-4">
                        {order.items.map(item => (
                          <div key={item.book._id} className="flex items-start gap-3">
                            <img
                              src={item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`}
                              className="w-12 h-16 object-cover flex-shrink-0"
                              alt={item.book.title}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-black line-clamp-2 leading-snug">
                                {item.book.title}
                              </p>
                              <p className="text-xs text-stone-700 mt-1">x{item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold text-black flex-shrink-0 ml-2">
                              {formatPrice(item.book.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Order Info */}
                      <div className="flex flex-col gap-3 text-sm">
                        {/* Recipient */}
                        <div className="space-y-2 pb-3 border-b border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-stone-700">Người nhận</span>
                            <span className="font-medium text-black">{order.shippingAddress.fullName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-700">Điện thoại</span>
                            <span className="font-medium text-black">{order.shippingAddress.phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-700">Thanh toán</span>
                            <span className="font-semibold text-black uppercase text-xs tracking-wide">
                              {order.paymentMethod === 'vnpay' ? 'VNPAY' : order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'COD'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-stone-700">Địa chỉ</span>
                            <span className="text-stone-500 text-xs leading-relaxed">{formatAddress(order.shippingAddress)}</span>
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="space-y-1.5 pb-3 border-b border-gray-100">
                          {(() => {
                            const subTotal = order.items.reduce((sum, item) => sum + item.book.price * item.quantity, 0);
                            const discount = subTotal + (order.shippingFee || 0) - order.totalPrice;
                            return (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-stone-700">Tổng giá sản phẩm</span>
                                  <span className="text-stone-600">{formatPrice(subTotal)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-stone-700">Phí vận chuyển</span>
                                  <span className="text-stone-600">{formatPrice(order.shippingFee || 0)}</span>
                                </div>
                                {discount > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-stone-700">Voucher giảm giá</span>
                                    <span className="text-green-600 font-medium">-{formatPrice(discount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                                  <span className="font-semibold text-black text-sm">Tổng tiền</span>
                                  <span className="text-base font-bold text-black">{formatPrice(order.totalPrice)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Status History */}
                        <div>
                          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-700 mb-2">Lịch sử trạng thái</p>
                          <div className="space-y-2">
                            {order.statusHistory.map((entry, index) => {
                              const ec = statusConfig(entry.status);
                              const isLatest = index === order.statusHistory.length - 1;
                              return (
                                <div key={index} className="flex items-center gap-2.5">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLatest ? `${ec.dot} animate-pulse` : 'bg-stone-200'}`} />
                                  <span className={`text-xs ${isLatest ? ec.text + ' font-medium' : 'text-stone-700'}`}>
                                    {translateStatus(entry.status)}
                                  </span>
                                  <span className="text-[11px] text-stone-300 ml-auto">{formatDateTime(entry.date)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Refund Status */}
                        {order.status === 'cancelled' && (
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="text-[10px] tracking-widest uppercase text-stone-700">Hoàn tiền</span>
                            {order.paymentStatus === 'Hoàn tiền' ? (
                              <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Đang chờ hoàn tiền
                              </span>
                            ) : order.paymentStatus === 'Đã hoàn tiền' ? (
                              <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                                <FontAwesomeIcon icon={['fas', 'check']} className="text-[10px]" />
                                Hoàn tiền thành công
                              </span>
                            ) : (
                              <span className="text-xs text-stone-700">Không áp dụng (COD)</span>
                            )}
                          </div>
                        )}

                        {/* Cancel Reason */}
                        {order.status === 'cancelled' && order.cancelReason && (
                          <div className="px-3 py-2.5 bg-stone-50 border-l-2 border-stone-300">
                            <p className="text-[10px] tracking-widest uppercase text-stone-700 mb-1">Lý do hủy</p>
                            <p className="text-xs text-stone-600 italic">"{order.cancelReason}"</p>
                          </div>
                        )}

                        {/* Cancel Button */}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => openCancelModal(order._id)}
                            className="mt-1 w-full py-2.5 border border-red-200 text-red-500 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 hover:border-red-400 transition-all duration-200"
                          >
                            Yêu cầu hủy đơn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-10">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center border border-gray-200 text-stone-500 hover:border-black hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <FontAwesomeIcon icon={['fas', 'angle-left']} className="text-xs" />
                </button>

                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className={`w-9 h-9 flex items-center justify-center text-sm border transition-all ${currentPage === index + 1
                      ? 'bg-black text-white border-black font-semibold'
                      : 'border-gray-200 text-stone-600 hover:border-black hover:text-black'
                      }`}
                  >
                    {index + 1}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center border border-gray-200 text-stone-500 hover:border-black hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <FontAwesomeIcon icon={['fas', 'angle-right']} className="text-xs" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CANCEL MODAL ── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-stone-700 mb-0.5">Hủy đơn hàng</p>
                <h3 className="text-base font-bold text-black">Lý do hủy đơn?</h3>
              </div>
              <button onClick={closeModal} className="text-stone-700 hover:text-black transition-colors">
                <FontAwesomeIcon icon={['fas', 'xmark']} />
              </button>
            </div>

            {/* Reasons */}
            <div className="px-6 py-5 space-y-2">
              {reasons.map(reason => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 px-4 py-3 border cursor-pointer transition-all duration-150 ${selectedReason === reason
                    ? 'border-black bg-stone-800'
                    : 'border-gray-900 hover:border-stone-800'
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedReason === reason ? 'border-black' : 'border-stone-300'
                    }`}>
                    {selectedReason === reason && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm text-stone-700">{reason}</span>
                </label>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-3 border border-gray-200 text-sm font-medium text-stone-600 hover:border-stone-400 hover:text-black transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={confirmCancel}
                disabled={!selectedReason}
                className="flex-1 py-3 bg-black text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;