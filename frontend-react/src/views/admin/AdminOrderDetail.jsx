import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaShoppingCart, FaUser, FaEnvelope, FaPhone, FaCheckCircle, FaMoneyBillWave, FaExclamationTriangle, FaClock, FaQrcode, FaSave, FaTruck, FaBan, FaCheck } from 'react-icons/fa';

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState({});
  const [previousStatus, setPreviousStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [callAttempts, setCallAttempts] = useState(0);
  const [largeMediaUrl, setLargeMediaUrl] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const { data } = await axios.get(`/api/admin/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(data);
        setPreviousStatus(data.status);
        setAdminNote(data.adminNote || '');
        setCallAttempts(data.callAttempts || 0);
      } catch (err) {
        Swal.fire('Lỗi', 'Không thể tải thông tin đơn hàng', 'error');
      }
    };
    fetchOrder();
  }, [id]);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDateTime = (iso) => new Date(iso).toLocaleString('vi-VN');
  const formatAddress = (a) => a ? `${a.street || ''}, ${a.ward || ''}, ${a.district || ''}, ${a.city || ''}` : 'N/A';

  const getImageUrl = (path) => (path?.startsWith('http') || path?.startsWith('data:image') || path?.startsWith('data:video')) ? path : `http://localhost:5000${path}`;
  const formatPrice = (num) => (num || 0).toLocaleString('vi-VN') + 'đ';

  const translateStatus = (s) => {
    switch (s) {
      case 'pending': return 'Đang xử lý';
      case 'confirmed': return 'Đã xác nhận';
      case 'delivering': return 'Đang giao';
      case 'delivered': return 'Đã giao (Chờ KH)';
      case 'completed': return 'Hoàn tất';
      case 'failed_delivery': return 'Giao thất bại';
      case 'return_requested': return 'Yêu cầu trả hàng';
      case 'return_approved': return 'Đã duyệt trả hàng';
      case 'returning': return 'Đang hoàn về';
      case 'returned': return 'Đã nhận hàng trả';
      case 'cancelled': return 'Đã hủy';
      default: return s;
    }
  };

  const getStatusLabelWithActor = (status, orderObj) => {
    const base = translateStatus(status);
    switch (status) {
      case 'pending': return `${base} (Khách hàng)`;
      case 'confirmed':
      case 'delivering':
      case 'return_approved':
      case 'returned': return `${base} (Admin)`;
      case 'delivered':
      case 'failed_delivery': return `${base} (Admin/Shipper)`;
      case 'return_requested':
      case 'returning': return `${base} (Khách hàng)`;
      case 'cancelled':
        if (orderObj.cancelReason?.includes('Hệ thống tự động')) return `${base} (Hệ thống)`;
        if (['Thay đổi ý định', 'Đặt nhầm sản phẩm', 'Tìm thấy giá tốt hơn', 'Thời gian giao quá lâu', 'Lý do khác'].includes(orderObj.cancelReason)) return `${base} (Khách hàng)`;
        return `${base} (Admin)`;
      case 'completed':
        if (orderObj.adminNote?.includes('Hệ thống tự động')) return `${base} (Hệ thống)`;
        if (orderObj.adminNote?.toLowerCase().includes('từ chối')) return `${base} (Admin đóng)`;
        return base;
      default: return base;
    }
  };

  const allowedStatusTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['delivering', 'cancelled'],
    delivering: ['delivered', 'failed_delivery', 'cancelled'],
    delivered: ['completed'],
    return_requested: [],
    return_approved: [],
    returning: [],
    completed: [],
    failed_delivery: [],
    returned: [],
    cancelled: []
  };

  const statusOptionsList = [
    { value: 'pending', label: 'Đang xử lý' },
    { value: 'confirmed', label: 'Xác nhận' },
    { value: 'delivering', label: ' Đang giao hàng' },
    { value: 'delivered', label: ' Đã giao hàng' },
    { value: 'completed', label: ' Hoàn tất' },
    { value: 'failed_delivery', label: ' Giao thất bại' },
    { value: 'return_requested', label: ' Yêu cầu trả hàng' },
    { value: 'return_approved', label: ' Đã duyệt trả hàng' },
    { value: 'returning', label: ' Đang hoàn về' },
    { value: 'returned', label: ' Đã nhận hàng trả' },
    { value: 'cancelled', label: ' Đã hủy' }
  ];

  // ✅ ĐÃ SỬA: Lấy giá trị item.price đã chốt lúc mua
  const subTotal = useMemo(() => order.items?.reduce((sum, item) => {
    const currentPrice = item.price || item.book?.discountedPrice || item.book?.price || 0;
    return sum + item.quantity * currentPrice;
  }, 0) || 0, [order.items]);

  const saveAdminNote = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/orders/${order._id}/status`, { status: order.status, adminNote, callAttempts }, { headers: { Authorization: `Bearer ${token}` } });
      Swal.fire('Thành công', 'Đã lưu ghi chú nội bộ', 'success');
    } catch (err) { Swal.fire('Lỗi', 'Không thể lưu ghi chú', 'error'); }
  };

  const executeStatusChange = async (newStatus, reason = '', extraData = {}) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/orders/${order._id}/status`,
        { status: newStatus, reason: reason, ...extraData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isFailureState = ['cancelled', 'failed_delivery'].includes(newStatus);
      const updatedPaymentStatus = extraData.paymentStatus || ((isFailureState && order.paymentStatus === 'Đã thanh toán') ? 'Hoàn tiền' : order.paymentStatus);

      setPreviousStatus(newStatus);
      setOrder(prev => ({
        ...prev, status: newStatus, paymentStatus: updatedPaymentStatus, cancelReason: reason || prev.cancelReason, adminNote: extraData.adminNote || prev.adminNote,
        shippingProvider: extraData.shippingProvider || prev.shippingProvider, trackingLink: extraData.trackingLink || prev.trackingLink,
        statusHistory: [...(prev.statusHistory || []), { status: newStatus, date: new Date().toISOString() }]
      }));
      Swal.fire('Thành công', 'Cập nhật trạng thái thành công', 'success');
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.msg || 'Không thể cập nhật trạng thái', 'error');
      setOrder(prev => ({ ...prev, status: previousStatus }));
    }
  };

  const handleApproveReturn = () => {
    Swal.fire({ title: 'Duyệt yêu cầu?', text: "Khách hàng sẽ nhận được thông báo để tạo đơn gửi hàng về Shop.", icon: 'info', showCancelButton: true, confirmButtonText: 'Đồng ý Duyệt', cancelButtonText: 'Hủy' }).then((result) => { if (result.isConfirmed) executeStatusChange('return_approved'); });
  };

  const handleRejectReturn = async () => {
    const { value: text, isConfirmed } = await Swal.fire({ title: 'Từ chối khiếu nại', input: 'textarea', inputPlaceholder: 'Nhập lý do từ chối (bắt buộc)...', showCancelButton: true, confirmButtonText: 'Từ chối', cancelButtonText: 'Hủy', inputValidator: (value) => { if (!value) return 'Bắt buộc phải nhập lý do!'; } });
    if (isConfirmed) executeStatusChange('completed', '', { adminNote: `Từ chối trả hàng: ${text}` });
  };

  const handleConfirmReceivedReturn = () => {
    Swal.fire({ title: 'Đã nhận được hàng?', text: "Xác nhận hàng trả về đúng tình trạng. Hệ thống sẽ chuyển sang bước Hoàn Tiền.", icon: 'success', showCancelButton: true, confirmButtonText: 'Xác nhận Đã Nhận', cancelButtonText: 'Chưa nhận' }).then((result) => { if (result.isConfirmed) executeStatusChange('returned'); });
  };

  const handleRejectReceivedReturn = async () => {
    const { value: text, isConfirmed } = await Swal.fire({ title: 'Từ chối kiện hàng này?', html: `<p class="text-sm text-gray-600 mb-3">Khách gửi sai sản phẩm, hàng bị rách nát, hoặc không đúng mô tả.</p><p class="text-sm font-bold text-rose-600 mb-2">Đơn sẽ được Đóng và KHÔNG hoàn tiền.</p>`, input: 'textarea', inputPlaceholder: 'Nhập biên bản từ chối...', showCancelButton: true, confirmButtonColor: '#e11d48', confirmButtonText: 'Xác nhận Từ Chối', cancelButtonText: 'Hủy', inputValidator: (value) => { if (!value) return 'Bắt buộc phải lập biên bản/lý do!'; } });
    if (isConfirmed) { executeStatusChange('completed', '', { adminNote: `[BIÊN BẢN TỪ CHỐI HÀNG HOÀN]: ${text}` }); }
  };

  const handleConfirmTransferPayment = () => {
    Swal.fire({ title: 'Xác nhận đã nhận tiền?', text: "Bạn đã kiểm tra App Ngân hàng và chắc chắn khách đã chuyển đủ tiền?", icon: 'question', showCancelButton: true, confirmButtonText: 'Đã nhận đủ tiền', cancelButtonText: 'Chưa nhận được' }).then((result) => { if (result.isConfirmed) { executeStatusChange('confirmed', '', { paymentStatus: 'Đã thanh toán' }); } });
  };

  const confirmStatusChange = async (event) => {
    const newStatus = event.target.value;
    const currentStatus = previousStatus;
    let cancelReason = ''; let extraData = {};
    const isFailureState = ['cancelled', 'failed_delivery'].includes(newStatus);

    if (newStatus === 'delivering') {
      const { value: formValues, isConfirmed } = await Swal.fire({ title: 'Thông tin Giao hàng', html: `<div class="text-left text-sm text-gray-700 font-bold mb-1">Đơn vị vận chuyển:</div><select id="swal-provider" class="swal2-select !mt-0 !mb-4 !w-full !text-sm"><option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option><option value="GHN">Giao Hàng Nhanh (GHN)</option></select><div class="text-left text-sm text-gray-700 font-bold mb-1">Mã vận đơn:</div><div class="flex items-center border border-gray-300 rounded-md bg-gray-50 overflow-hidden"><span id="swal-prefix" class="px-3 py-3 text-sm text-gray-500 border-r border-gray-300 whitespace-nowrap bg-gray-200">https://i.ghtk.vn/</span><input id="swal-tracking" class="w-full px-3 py-3 text-sm bg-white outline-none focus:ring-0" placeholder="Nhập mã (VD: S123456)"></div>`, didOpen: () => { const provider = document.getElementById('swal-provider'); const prefix = document.getElementById('swal-prefix'); provider.addEventListener('change', (e) => { if (e.target.value === 'GHTK') prefix.textContent = 'https://i.ghtk.vn/'; else if (e.target.value === 'GHN') prefix.textContent = 'https://donhang.ghn.vn/?order_code='; }); }, showCancelButton: true, confirmButtonText: 'Lưu & Cập nhật', preConfirm: () => { const provider = document.getElementById('swal-provider').value; const code = document.getElementById('swal-tracking').value; if (!code) { Swal.showValidationMessage('Vui lòng nhập mã vận đơn!'); return false; } const prefix = provider === 'GHTK' ? 'https://i.ghtk.vn/' : 'https://donhang.ghn.vn/?order_code='; return { shippingProvider: provider, trackingLink: prefix + code }; } });
      if (!isConfirmed) { setOrder(prev => ({ ...prev, status: currentStatus })); return; }
      extraData = formValues;
    } else if (isFailureState) {
      const { value: text, isConfirmed } = await Swal.fire({ title: `Nhập lý do ${translateStatus(newStatus).toLowerCase()}`, input: 'textarea', inputPlaceholder: 'Nhập lý do chi tiết...', showCancelButton: true, confirmButtonText: 'Xác nhận', inputValidator: (value) => { if (!value) return 'Bắt buộc phải nhập lý do!'; } });
      if (!isConfirmed) { setOrder(prev => ({ ...prev, status: currentStatus })); return; }
      cancelReason = text;
    } else {
      const result = await Swal.fire({ title: 'Xác nhận thay đổi?', text: `Đổi trạng thái sang "${translateStatus(newStatus)}"?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Đồng ý' });
      if (!result.isConfirmed) { setOrder(prev => ({ ...prev, status: currentStatus })); return; }
    }
    executeStatusChange(newStatus, cancelReason, extraData);
  };

  const handleConfirmRefund = async () => {
    const isVnpay = order.paymentMethod === 'vnpay';
    const result = await Swal.fire({ title: 'Xác nhận hoàn tiền?', text: isVnpay ? 'Hệ thống sẽ gửi lệnh hoàn tiền tự động qua cổng VNPAY. Bạn có chắc chắn?' : 'Bạn xác nhận đã chuyển khoản trả lại tiền cho khách hàng?', icon: 'warning', showCancelButton: true, confirmButtonColor: isVnpay ? '#4f46e5' : '#10b981', cancelButtonColor: '#d33', confirmButtonText: 'Xác nhận Đã hoàn tiền', cancelButtonText: 'Hủy' });

    if (result.isConfirmed) {
      Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const token = localStorage.getItem('adminToken');
        const { data } = await axios.put(`/api/admin/orders/${order._id}/refund`, { forceManual: !isVnpay }, { headers: { Authorization: `Bearer ${token}` } });
        Swal.fire('Thành công', data.message || 'Đã hoàn tiền thành công', 'success');
        setOrder(prev => ({ ...prev, paymentStatus: 'Đã hoàn tiền' }));
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Lỗi xử lý hoàn tiền';
        if (isVnpay) {
          const manualResult = await Swal.fire({ title: 'Lỗi cổng VNPAY', text: `${errorMsg}. Bạn có muốn bỏ qua VNPAY và tự chuyển khoản tay cho khách không?`, icon: 'error', showCancelButton: true, confirmButtonColor: '#e11d48', confirmButtonText: 'Tôi sẽ tự chuyển khoản tay', cancelButtonText: 'Hủy' });
          if (manualResult.isConfirmed) {
            Swal.fire({ title: 'Đang lưu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
              const token = localStorage.getItem('adminToken');
              await axios.put(`/api/admin/orders/${order._id}/refund`, { forceManual: true }, { headers: { Authorization: `Bearer ${token}` } });
              Swal.fire('Thành công', 'Đã lưu trạng thái hoàn tiền thủ công', 'success');
              setOrder(prev => ({ ...prev, paymentStatus: 'Đã hoàn tiền' }));
            } catch (manualErr) { Swal.fire('Lỗi', 'Không thể lưu trạng thái', 'error'); }
          }
        } else { Swal.fire('Lỗi', errorMsg, 'error'); }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/admin/orders')} className="mb-4 text-sm text-gray-500 hover:text-black font-medium">← Quay lại danh sách</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Chi tiết đơn hàng #{order._id?.slice(-6).toUpperCase()}</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-6">

            <div>
              <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FaShoppingCart className="text-indigo-500" /> Sản phẩm</h2>
              <div className="grid grid-cols-5 font-bold text-gray-700 text-sm p-3 bg-gray-50 border-b">
                <div>Hình ảnh</div><div className="col-span-2">Tên sách</div><div>Số lượng</div><div>Đơn giá</div>
              </div>
              {order.items?.map(item => {
                const currentPrice = item.price || item.book?.discountedPrice || item.book?.price || 0;
                return (
                  <div key={item.book?._id} className="grid grid-cols-5 items-center p-3 border-b last:border-0">
                    <img src={getImageUrl(item.book?.image)} alt="book" className="w-12 h-16 object-cover rounded shadow-sm" />
                    <div className="col-span-2 text-gray-800 font-medium pr-2">{item.book?.title}</div>
                    <div className="text-gray-700 ml-6">{item.quantity}</div>
                    <div className="text-gray-700 font-semibold">{formatPrice(currentPrice)}</div>
                  </div>
                )
              })}
              <div className="text-right font-semibold text-gray-800 mt-4 space-y-1 p-3 rounded">
                <p className="text-sm">Tổng giá sản phẩm: <span className="font-normal">{formatPrice(subTotal)}</span></p>
                <p className="text-sm">Phí vận chuyển: <span className="font-normal">{formatPrice(order.shippingFee || 0)}</span></p>
                {/* ✅ HIỂN THỊ VOUCHER CHUẨN */}
                {order.discountAmount > 0 && <p className="text-sm">Voucher giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}: <span className="font-normal text-emerald-600">-{formatPrice(order.discountAmount)}</span></p>}
                <p className="text-lg mt-1 border-t border-gray-100 pt-2 inline-block w-64">
                  Tổng cộng: <span className="text-red-600 font-bold ml-2">{formatPrice(order.totalPrice || 0)}</span>
                </p>
              </div>
            </div>

            {['return_requested', 'return_approved', 'returning', 'returned'].includes(order.status) && (
              <div className="border-t-2 border-dashed border-rose-200 pt-5 mt-5">
                <h2 className="font-bold text-rose-700 mb-3 uppercase tracking-wider text-sm flex items-center gap-2"><FaExclamationTriangle /> Thông tin Khiếu nại / Hoàn trả</h2>
                <div className="bg-rose-50 p-4 rounded-lg space-y-4 text-sm text-gray-700 border border-rose-100">
                  {order.returnReasonType ? (
                    <div className="space-y-1"><p><strong>Loại lý do:</strong> <span className="font-semibold text-rose-800">{order.returnReasonType}</span></p><p><strong>Mô tả chi tiết:</strong> <span className="italic text-gray-600">"{order.returnReasonDetail}"</span></p></div>
                  ) : (<p><strong>Lý do KH đưa ra:</strong> <span className="italic text-rose-800">"{order.cancelReason}"</span></p>)}
                  {(order.returnMedia?.length > 0 || order.returnImages?.length > 0) && (
                    <div><strong>Hình/Video chứng minh:</strong><div className="flex gap-3 mt-2 flex-wrap">{(order.returnMedia?.length > 0 ? order.returnMedia : order.returnImages).map((media, idx) => (<div key={idx} onClick={() => setLargeMediaUrl(getImageUrl(media))} className="inline-block cursor-pointer">{media.includes('video') || media.endsWith('.mp4') ? (<video src={getImageUrl(media)} className="w-16 h-16 object-cover border border-gray-300 rounded hover:opacity-80 transition-opacity" />) : (<img src={getImageUrl(media)} alt="proof" className="w-16 h-16 object-cover border border-gray-300 rounded hover:opacity-80 transition-opacity" />)}</div>))}</div></div>
                  )}
                  {(order.returnBankDetails || order.returnBankInfo) && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mt-2 shadow-sm"><p className="font-bold text-gray-800 mb-2 flex items-center gap-2"><FaMoneyBillWave className="text-emerald-500" />THÔNG TIN NGÂN HÀNG (KH CUNG CẤP):</p><p className="font-mono text-blue-700 font-semibold bg-blue-50 p-2.5 rounded border border-blue-100 mb-3">{order.returnBankDetails || order.returnBankInfo}</p>{order.returnBankQR && (<div><p className="text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1"><FaQrcode /> Mã QR Ngân hàng đính kèm:</p><img src={getImageUrl(order.returnBankQR)} alt="Bank QR" className="w-24 h-24 object-contain border border-gray-300 rounded p-1 cursor-pointer" onClick={() => setLargeMediaUrl(getImageUrl(order.returnBankQR))} /></div>)}</div>
                  )}
                  {['returning', 'returned'].includes(order.status) && (
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg mt-4"><p className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><FaTruck /> THÔNG TIN GỬI TRẢ HÀNG</p><div className="space-y-2 text-indigo-800"><p><strong>Đơn vị vận chuyển:</strong> {order.returnShippingProvider || 'N/A'}</p><p><strong>Mã vận đơn:</strong> <span className="font-mono bg-white px-2 py-1 rounded border border-indigo-100">{order.returnTrackingCode || 'N/A'}</span></p></div>{order.returnReceipt && (<div className="mt-3"><p className="text-xs text-indigo-700 font-semibold mb-2">Ảnh chụp biên nhận gửi hàng:</p><img src={getImageUrl(order.returnReceipt)} alt="Receipt" className="w-24 h-24 object-contain border border-indigo-300 rounded p-1 cursor-pointer bg-white" onClick={() => setLargeMediaUrl(getImageUrl(order.returnReceipt))} /></div>)}</div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-5 mt-5">
              <h2 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider flex items-center gap-2"><FaPhone className="text-stone-400" /> Ghi chú nội bộ & Gọi xác nhận</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="VD: Đã gọi lúc 10h sáng không bốc máy..." className="w-full border border-gray-200 rounded p-3 text-sm h-20 focus:outline-none focus:border-stone-400" /></div>
                <div className="flex flex-col gap-2"><input type="number" value={callAttempts} onChange={e => setCallAttempts(Number(e.target.value))} placeholder="Số lần gọi" className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none" min="0" /><button onClick={saveAdminNote} className="bg-stone-800 text-white font-semibold py-2 rounded text-sm hover:bg-black transition flex items-center justify-center gap-2"><FaSave /> Lưu Note</button></div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full text-sm text-gray-700">
              <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3 text-base">Thông tin nhận hàng</h3>
              <div className="space-y-2 mb-4">
                <p><strong>Người nhận:</strong> {order.shippingAddress?.fullName || 'Ẩn danh'}</p>
                <p><strong>SĐT:</strong> {order.shippingAddress?.phone || 'Không có SĐT'}</p>
                <p><strong>Địa chỉ:</strong> {formatAddress(order.shippingAddress)}</p>
                {order.trackingLink && (<p className="text-xs bg-blue-50 text-blue-800 p-2 rounded mt-2 border border-blue-100">📦 ĐVVC: <b>{order.shippingProvider}</b><br /><a href={order.trackingLink} target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-600 block mt-1">Tra cứu vận đơn</a></p>)}
              </div>

              <div className="mt-2 pt-4 border-t border-gray-100 space-y-3">
                <label className="block font-semibold text-gray-800">Cập nhật Trạng thái</label>
                <div className="flex flex-col gap-3">
                  {order.status === 'return_requested' ? (
                    <div className="flex flex-col gap-2 p-3 bg-rose-50 border border-rose-200 rounded text-center"><p className="text-xs font-bold text-rose-800 mb-2">Đơn đang chờ Xử lý Khiếu nại</p><button onClick={handleApproveReturn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded text-xs flex items-center justify-center gap-2"><FaCheck /> Duyệt Yêu Cầu</button><button onClick={handleRejectReturn} className="w-full bg-white border border-rose-400 text-rose-600 hover:bg-rose-50 font-bold py-2 rounded text-xs flex items-center justify-center gap-2"><FaBan /> Không Duyệt</button></div>
                  ) : order.status === 'return_approved' ? (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-center"><p className="text-xs font-bold text-indigo-800"><i className="fas fa-spinner fa-spin mr-1"></i> Đã duyệt, chờ KH cung cấp vận đơn...</p></div>
                  ) : order.status === 'returning' ? (
                    <div className="flex flex-col gap-2 p-3 bg-fuchsia-50 border border-fuchsia-200 rounded text-center"><p className="text-xs font-bold text-fuchsia-800 mb-1">Hàng đang hoàn về kho</p><button onClick={handleConfirmReceivedReturn} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded text-xs shadow-sm flex items-center justify-center gap-2"><FaCheckCircle /> Hàng Chuẩn - Đồng Ý Hoàn Tiền</button><button onClick={handleRejectReceivedReturn} className="w-full bg-white border border-rose-400 text-rose-600 hover:bg-rose-50 font-bold py-2 rounded text-xs shadow-sm flex items-center justify-center gap-2"><FaBan /> Hàng Lỗi/Sai - Từ Chối Nhận</button></div>
                  ) : (
                    <select value={order.status} onChange={confirmStatusChange} disabled={['cancelled', 'failed_delivery', 'returned', 'completed'].includes(order.status)} className="w-full border-2 border-indigo-200 rounded-lg px-3 py-2 bg-white disabled:bg-gray-50 disabled:text-gray-500 font-semibold focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                      {statusOptionsList.map(opt => {
                        const isCurrent = order.status === opt.value;
                        const isAllowedNext = allowedStatusTransitions[order.status]?.includes(opt.value);
                        if (isCurrent || isAllowedNext) return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                        return null;
                      })}
                    </select>
                  )}

                  {order.status !== 'cancelled' && order.paymentMethod === 'transfer' && order.paymentStatus === 'Chờ thanh toán' && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded shadow-sm"><div className="flex items-center gap-2 text-amber-700 mb-2"><FaMoneyBillWave className="text-xl" /><h3 className="font-bold text-sm uppercase">Đợi chuyển khoản</h3></div><p className="text-xs text-amber-800 font-medium mb-3">Khách hàng chọn hình thức chuyển khoản. Vui lòng kiểm tra tài khoản ngân hàng của Shop.</p><button onClick={handleConfirmTransferPayment} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded shadow transition text-xs">Xác nhận: Đã nhận được tiền</button></div>
                  )}

                  {order.status !== 'cancelled' && order.paymentStatus === 'Đã thanh toán' && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded shadow-sm mt-2"><div className="flex items-center gap-2 text-emerald-700 mb-1"><FaCheckCircle className="text-base" /><h3 className="font-bold text-sm">Đã thanh toán</h3></div><p className="text-xs text-emerald-800 font-medium">Qua <span className="uppercase">{order.paymentMethod}</span>. <span className="text-red-600 font-bold uppercase">Không thu COD.</span></p></div>
                  )}

                  {!['cancelled', 'failed_delivery', 'returned'].includes(order.status) && order.paymentMethod === 'cod' && order.paymentStatus !== 'Đã thanh toán' && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded shadow-sm mt-2"><div className="flex items-center gap-2 text-blue-700 mb-1"><FaMoneyBillWave className="text-base" /><h3 className="font-bold text-sm">Thanh toán (COD)</h3></div><p className="text-xs text-blue-800">Thu tiền khách hàng lúc giao.</p></div>
                  )}

                  {['cancelled', 'failed_delivery', 'returned'].includes(order.status) && order.paymentStatus === 'Hoàn tiền' && (
                    <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded shadow-sm mt-2"><div className="flex items-center gap-2 text-rose-700 mb-2"><FaExclamationTriangle className="text-xl" /><h3 className="font-bold text-sm uppercase">Hoàn tiền thủ công</h3></div><p className="text-xs text-rose-800 font-medium mb-3">Khách đã TT <strong>{formatPrice(order.totalPrice || 0)}</strong>. Vui lòng chuyển trả tiền.</p><button onClick={handleConfirmRefund} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded shadow transition text-xs">Đã chuyển khoản hoàn tiền</button></div>
                  )}
                  {order.paymentStatus === 'Đã hoàn tiền' && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded shadow-sm mt-2"><div className="flex items-center gap-2 text-blue-700"><FaCheckCircle className="text-base" /><h3 className="font-bold text-sm uppercase">Đã hoàn tiền xong</h3></div></div>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <h3 className="font-bold text-gray-800 mb-4 text-xs uppercase tracking-widest text-center">Lịch sử cập nhật</h3>
                <ul className="space-y-4 text-sm text-gray-600 relative border-l-2 border-indigo-100 ml-3 pl-5">
                  {order.statusHistory?.map((entry, index) => (
                    <li key={index} className="relative"><span className="absolute -left-[27px] top-1 w-3 h-3 bg-indigo-500 rounded-full ring-4 ring-white"></span><p className="font-bold text-gray-800 text-[13px]">{getStatusLabelWithActor(entry.status, order)}</p><p className="text-[11px] text-gray-400 font-medium mt-0.5">{formatDateTime(entry.date)}</p></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {largeMediaUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm cursor-pointer" onClick={() => setLargeMediaUrl(null)}>
          <div className="bg-white p-2 rounded-lg relative w-[60vw] h-[60vh] max-w-[95vw] max-h-[95vh] flex items-center justify-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {largeMediaUrl.includes('video') || largeMediaUrl.endsWith('.mp4') ? (<video src={largeMediaUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded" />) : (<img src={largeMediaUrl} alt="large view" className="max-w-full max-h-full object-contain rounded" />)}
            <button onClick={() => setLargeMediaUrl(null)} className="absolute -top-3 -right-3 text-gray-600 hover:text-black text-xl font-bold bg-white border border-gray-200 shadow-md rounded-full w-8 h-8 flex items-center justify-center transition-colors">X</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetail;