import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaShoppingCart, FaUser, FaEnvelope, FaPhone, FaCheckCircle, FaMoneyBillWave, FaExclamationTriangle, FaClock, FaQrcode } from 'react-icons/fa';

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

  // ✅ Dùng order.totalPrice làm tổng thật — đã bao gồm ship và trừ discount
  // Tính ngược discountAmount = subTotal + shippingFee - totalPrice
  const discountAmount = useMemo(() => {
    const raw = subTotal + (order.shippingFee || 0) - (order.totalPrice || 0);
    return raw > 0 ? raw : 0;
  }, [subTotal, order.shippingFee, order.totalPrice]);

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

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/orders/${order._id}/status`,
        { status: newStatus, reason: cancelReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedPaymentStatus = (newStatus === 'cancelled' && order.paymentStatus === 'Đã thanh toán')
        ? 'Hoàn tiền'
        : order.paymentStatus;

      setPreviousStatus(newStatus);
      setOrder(prev => ({
        ...prev,
        status: newStatus,
        paymentStatus: updatedPaymentStatus,
        cancelReason: cancelReason || prev.cancelReason,
        statusHistory: [...(prev.statusHistory || []), { status: newStatus, date: new Date().toISOString() }]
      }));
      Swal.fire('Thành công', 'Cập nhật trạng thái thành công', 'success');
    } catch (err) {
      Swal.fire('Lỗi', 'Không thể cập nhật trạng thái', 'error');
      setOrder(prev => ({ ...prev, status: currentStatus }));
    }
  };

  const handleConfirmRefund = async () => {
    const isVnpay = order.paymentMethod === 'vnpay';
    const confirm = await Swal.fire({
      title: isVnpay ? 'Xác nhận đã chuyển khoản ngoài?' : 'Xác nhận đã hoàn tiền?',
      text: isVnpay
        ? 'Bạn đang bỏ qua hệ thống tự động và xác nhận ĐÃ TỰ CHUYỂN KHOẢN trả khách?'
        : 'Bạn đã thực sự chuyển khoản trả lại tiền cho khách hàng?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '✅ Đã chuyển khoản',
      cancelButtonText: 'Chưa'
    });

    if (confirm.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.put(`/api/admin/orders/${order._id}/refund`, { forceManual: true }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrder(prev => ({ ...prev, paymentStatus: 'Đã hoàn tiền' }));
        Swal.fire('Thành công', 'Đã lưu trạng thái Đã hoàn tiền', 'success');
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Không thể xác nhận hoàn tiền';
        Swal.fire('Lỗi từ Server', errorMessage, 'error');
      }
    }
  };

  // ✅ HÀM MỚI: Admin xác nhận đã nhận được tiền chuyển khoản QR
  const handleConfirmTransferReceived = async () => {
    const confirm = await Swal.fire({
      title: 'Xác nhận đã nhận tiền?',
      text: `Bạn đã kiểm tra và nhận được ${formatPrice(order.totalPrice || 0)} qua chuyển khoản?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Đã nhận tiền',
      cancelButtonText: 'Chưa'
    });

    if (confirm.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.put(`/api/orders/${order._id}/pay`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrder(prev => ({ ...prev, paymentStatus: 'Đã thanh toán' }));
        Swal.fire('Thành công', 'Đã xác nhận thanh toán', 'success');
      } catch (err) {
        Swal.fire('Lỗi', 'Không thể cập nhật trạng thái thanh toán', 'error');
      }
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
        await axios.delete(`/api/admin/orders/${order._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire('Đã xóa', '', 'success');
        navigate('/admin/orders');
      } catch (err) {
        Swal.fire('Lỗi', 'Không thể xóa đơn hàng', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/admin/orders')} className="mb-4 text-sm text-gray-500 hover:text-black">
          ← Quay lại
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Chi tiết đơn hàng #{order._id?.slice(-6).toUpperCase()}</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Products */}
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <FaShoppingCart className="text-indigo-500" /> Sản phẩm
            </h2>

            <div className="grid grid-cols-5 font-bold text-gray-700 text-sm p-3 bg-gray-50 border-b">
              <div>Hình ảnh</div>
              <div className="col-span-2">Tên sách</div>
              <div>Số lượng</div>
              <div>Đơn giá</div>
            </div>
            {order.items?.map(item => (
              <div key={item.book._id} className="grid grid-cols-5 items-center p-3 border-b last:border-0">
                <img
                  src={getImageUrl(item.book.image)}
                  alt="book"
                  className="w-12 h-16 object-cover rounded shadow-sm"
                />
                <div className="col-span-2 text-gray-800 font-medium pr-2">{item.book.title}</div>
                <div className="text-gray-700 ml-6">{item.quantity}</div>
                <div className="text-gray-700 font-semibold">{formatPrice(item.book.price)}</div>
              </div>
            ))}

            <div className="text-right font-semibold text-gray-800 mt-4 space-y-1 p-3 rounded">
              <p className="text-sm">Tổng giá sản phẩm: <span className="font-normal">{formatPrice(subTotal)}</span></p>
              <p className="text-sm">Phí vận chuyển: <span className="font-normal">{formatPrice(order.shippingFee || 0)}</span></p>
              {discountAmount > 0 && (
                <p className="text-sm">Voucher giảm giá: <span className="font-normal text-green-600">-{formatPrice(discountAmount)}</span></p>
              )}
              <p className="text-lg mt-1 border-t pt-2 inline-block w-64">
                Tổng cộng: <span className="text-red-600 font-bold ml-2">{formatPrice(order.totalPrice || 0)}</span>
              </p>
            </div>
          </div>

          {/* Right: Info & Status */}
          <div className="md:col-span-1">
            <div className="bg-gray-50 p-5 rounded border shadow-sm flex flex-col h-full text-sm text-gray-700">
              <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3 text-base">Thông tin nhận hàng</h3>

              <div className="space-y-2 mb-4">
                <p><strong>Người nhận:</strong> {order.shippingAddress?.fullName || 'Ẩn danh'}</p>
                <p><strong>SĐT:</strong> {order.shippingAddress?.phone || 'Không có SĐT'}</p>
                <p><strong>Địa chỉ:</strong> {formatAddress(order.shippingAddress)}</p>
              </div>

              <div className="mt-2 pt-4 border-t border-gray-200 space-y-3">
                <label className="block font-semibold text-gray-800">Trạng thái đơn hàng</label>

                <div className="flex flex-col gap-3">
                  <select
                    value={order.status}
                    onChange={confirmStatusChange}
                    disabled={order.status === 'cancelled' || order.status === 'delivered'}
                    className="w-full border-2 border-blue-200 rounded px-3 py-2 bg-white disabled:bg-gray-100 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="pending">⏳ Đang xử lý</option>
                    <option value="shipping">🚚 Đang giao hàng</option>
                    <option value="delivered">✅ Đã giao hàng</option>
                    <option value="cancelled">❌ Đã hủy</option>
                  </select>

                  {/* ✅ BOX: Đã thanh toán Online (VNPAY hoặc transfer đã xác nhận) */}
                  {order.status !== 'cancelled' && order.paymentStatus === 'Đã thanh toán' && (
                    <div className="bg-green-100 border-l-4 border-green-500 p-3 rounded shadow-sm">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <FaCheckCircle className="text-base" />
                        <h3 className="font-bold text-sm">Đã thanh toán Online</h3>
                      </div>
                      <p className="text-xs text-green-800 font-medium">
                        Qua <span className="uppercase">{order.paymentMethod}</span>.{' '}
                        <span className="text-red-600 font-bold uppercase">Tuyệt đối không thu COD.</span>
                      </p>
                    </div>
                  )}

                  {/* ✅ FIX BUG 1: BOX COD — chỉ hiện khi paymentMethod thực sự là 'cod' */}
                  {order.status !== 'cancelled' && order.paymentMethod === 'cod' && order.paymentStatus !== 'Đã thanh toán' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded shadow-sm">
                      <div className="flex items-center gap-2 text-yellow-700 mb-1">
                        <FaMoneyBillWave className="text-base" />
                        <h3 className="font-bold text-sm">Thanh toán (COD)</h3>
                      </div>
                      <p className="text-xs text-yellow-800">Thu tiền khách hàng lúc giao.</p>
                    </div>
                  )}

                  {/* ✅ FIX BUG 1: BOX TRANSFER — chỉ hiện khi paymentMethod là 'transfer' và chưa xác nhận */}
                  {order.status !== 'cancelled' && order.paymentMethod === 'transfer' && order.paymentStatus !== 'Đã thanh toán' && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded shadow-sm">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <FaQrcode className="text-base" />
                        <h3 className="font-bold text-sm">Chờ xác nhận chuyển khoản</h3>
                      </div>
                      <p className="text-xs text-blue-800 mb-3">
                        Khách thanh toán qua <strong>VietQR</strong>. Kiểm tra tài khoản ngân hàng rồi xác nhận bên dưới.
                      </p>
                      <button
                        onClick={handleConfirmTransferReceived}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded shadow transition text-xs"
                      >
                        ✅ Đã nhận tiền chuyển khoản
                      </button>
                    </div>
                  )}

                  {/* BOX HOÀN TIỀN */}
                  {order.status === 'cancelled' && order.paymentStatus === 'Hoàn tiền' && (
                    <>
                      {order.paymentMethod === 'vnpay' ? (
                        <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded shadow-md mt-2">
                          <div className="flex items-center gap-2 text-indigo-700 mb-2">
                            <FaClock className="text-xl animate-pulse" />
                            <h3 className="font-bold text-base uppercase">Chờ hoàn tiền tự động</h3>
                          </div>
                          <p className="text-xs text-indigo-800 font-medium mb-3">
                            Hệ thống Bot đang theo dõi đơn hàng này. Lệnh hoàn tiền <strong>{formatPrice(order.totalPrice || 0)}</strong> sẽ được tự động gửi sang VNPAY sau <strong>24 giờ</strong>.
                          </p>
                          <div className="text-center mt-3 border-t border-indigo-200 pt-3">
                            <button
                              onClick={handleConfirmRefund}
                              className="text-indigo-500 hover:text-indigo-800 underline text-[11px] font-semibold transition-colors"
                            >
                              ⚠ Đã chuyển khoản tay cho khách? Bấm vào đây để xác nhận
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded shadow-md mt-2 ">
                          <div className="flex items-center gap-2 text-red-700 mb-2">
                            <FaExclamationTriangle className="text-xl" />
                            <h3 className="font-bold text-base uppercase">Hoàn tiền thủ công</h3>
                          </div>
                          <p className="text-xs text-red-800 font-medium mb-3">
                            Khách hàng đã thanh toán <strong>{formatPrice(order.totalPrice || 0)}</strong> qua VietQR.
                            Vui lòng chuyển trả lại tiền, sau đó nhấn xác nhận.
                          </p>
                          <button
                            onClick={handleConfirmRefund}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded shadow transition"
                          >
                            Đã chuyển khoản hoàn tiền
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* BOX ĐÃ HOÀN TIỀN XONG */}
                  {order.paymentStatus === 'Đã hoàn tiền' && (
                    <div className="bg-blue-100 border-l-4 border-blue-600 p-4 rounded shadow-sm mt-2">
                      <div className="flex items-center gap-2 text-blue-700">
                        <FaCheckCircle className="text-lg" />
                        <h3 className="font-bold text-sm uppercase">Đã hoàn tiền xong</h3>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lý do hủy */}
              {order.status === 'cancelled' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm shadow-sm">
                  <p className="font-bold text-red-600 uppercase mb-1">Lý do hủy:</p>
                  <p className="text-red-700 italic">"{order.cancelReason || 'Không có lý do'}"</p>
                </div>
              )}

              {order.status === 'cancelled' && (
                <button
                  onClick={deleteOrder}
                  className="mt-4 w-full bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 transition shadow"
                >
                  Xóa đơn hàng
                </button>
              )}

              {/* Lịch sử trạng thái */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-800 mb-3 text-center">Lịch sử trạng thái</h3>
                <ul className="space-y-3 text-sm text-gray-600 relative border-l-2 border-gray-200 ml-2 pl-4">
                  {order.statusHistory?.map((entry, index) => (
                    <li key={index} className="relative">
                      <span className="absolute -left-6 top-1.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>
                      <span className="font-bold text-gray-700">{translateStatus(entry.status)}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.date)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;