import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FaClipboardList, FaCheck, FaTruck, FaBoxOpen, FaStar, FaBan, FaUndo, FaMoneyBillWave } from 'react-icons/fa';
import Swal from 'sweetalert2';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const token = localStorage.getItem('token');
    const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
    const formatAddress = (a) => `${a.street}, ${a.ward || ''}, ${a.district}, ${a.city}`;

    const loadOrder = async () => {
        try {
            const { data } = await axios.get(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setOrder(data);
        } catch (err) {
            Swal.fire('Lỗi', 'Không thể tải chi tiết đơn hàng', 'error');
            navigate('/orders');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadOrder(); }, [id]);

    const getStepDate = (statusId) => {
        const entry = order?.statusHistory?.find(h => h.status === statusId);
        if (entry) {
            const d = new Date(entry.date);
            return {
                time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
            };
        }
        return null;
    };

    const handleCancelOrder = async () => {
        const { value: reason, isConfirmed } = await Swal.fire({
            title: 'Hủy đơn hàng',
            input: 'select',
            inputOptions: {
                'Thay đổi ý định': 'Thay đổi ý định',
                'Đặt nhầm sản phẩm': 'Đặt nhầm sản phẩm',
                'Tìm thấy giá tốt hơn': 'Tìm thấy giá tốt hơn',
                'Lý do khác': 'Lý do khác'
            },
            inputPlaceholder: 'Chọn lý do hủy',
            showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: 'Xác nhận hủy'
        });

        if (isConfirmed && reason) {
            try {
                await axios.put(`/api/orders/cancel/${id}`, { reason }, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Thành công', 'Đã hủy đơn hàng.', 'success');
                loadOrder();
            } catch (err) { Swal.fire('Lỗi', 'Không thể hủy', 'error'); }
        }
    };

    const handleRequestReturn = async () => {
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: 'Yêu cầu Trả hàng & Hoàn tiền', width: '600px',
            html: `
          <select id="swal-type" class="swal2-select !w-full !mt-0 !mb-3 !text-sm"><option value="">-- Chọn vấn đề --</option><option value="Giao sai sản phẩm">Giao sai sản phẩm</option><option value="Sản phẩm lỗi">Sản phẩm lỗi</option></select>
          <textarea id="swal-detail" class="swal2-textarea !w-full !mt-0 !mb-3 !text-sm" placeholder="Mô tả chi tiết (Bắt buộc)"></textarea>
          <div class="text-left mb-1 text-sm">Ảnh/Video chứng minh:</div><input type="file" id="swal-media" accept="image/*,video/*" multiple class="w-full text-sm border p-2 rounded mb-3">
          <div class="text-left mb-1 text-sm">Thông tin Bank:</div><input id="swal-bank-detail" type="text" class="swal2-input !w-full !mt-0 !mb-3 !text-sm" placeholder="VD: 1026325913 VCB TRANTHIEUVAN">
        `,
            showCancelButton: true, preConfirm: async () => {
                const type = document.getElementById('swal-type').value; const detail = document.getElementById('swal-detail').value; const bankDetail = document.getElementById('swal-bank-detail').value;
                if (!type || !detail || !bankDetail) { Swal.showValidationMessage('Vui lòng điền đủ thông tin!'); return false; }
                const toBase64 = (file) => new Promise((resolve) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve(r.result); });
                let returnMedia = []; const mediaInput = document.getElementById('swal-media');
                for (let i = 0; i < mediaInput.files.length; i++) returnMedia.push(await toBase64(mediaInput.files[i]));
                return { returnReasonType: type, returnReasonDetail: detail, returnBankDetails: bankDetail, returnMedia };
            }
        });
        if (isConfirmed) {
            Swal.fire({ title: 'Đang xử lý...', didOpen: () => Swal.showLoading() });
            try {
                await axios.put(`/api/orders/${id}/request-return`, formValues, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Thành công', 'Đã gửi yêu cầu', 'success'); loadOrder();
            } catch (err) { Swal.fire('Lỗi', 'Không thể gửi', 'error'); }
        }
    };

    const handleSubmitReturnTracking = async (approvedDate) => {
        const deadlineStr = new Date(new Date(approvedDate).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN');
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: 'Tạo đơn Trả hàng', width: '500px',
            html: `
        <div class="bg-indigo-50 border border-indigo-200 p-3 rounded text-xs text-indigo-800 mb-4 text-left font-medium">
          Vui lòng gửi hàng và nhập mã vận đơn trước <strong class="text-red-600">${deadlineStr}</strong>.
        </div>
        <select id="swal-ret-provider" class="swal2-select !w-full !mb-3 !text-sm"><option value="">-- Đơn vị vận chuyển --</option><option value="GHTK">GHTK</option><option value="GHN">GHN</option><option value="Viettel Post">Viettel Post</option></select>
        <input id="swal-ret-tracking" type="text" class="swal2-input !w-full !mb-4 !text-sm" placeholder="Mã vận đơn">
        <div class="text-left text-sm">Ảnh biên nhận:</div><input type="file" id="swal-ret-receipt" class="w-full text-sm border p-2 rounded">
      `,
            showCancelButton: true, confirmButtonText: 'Xác nhận Đã Gửi', preConfirm: async () => {
                const provider = document.getElementById('swal-ret-provider').value; const code = document.getElementById('swal-ret-tracking').value;
                if (!provider || !code) { Swal.showValidationMessage('Nhập ĐVVC và Mã vận đơn!'); return false; }
                let returnReceipt = null; const receiptInput = document.getElementById('swal-ret-receipt');
                if (receiptInput.files.length > 0) {
                    returnReceipt = await new Promise((res) => { const r = new FileReader(); r.readAsDataURL(receiptInput.files[0]); r.onload = () => res(r.result); });
                }
                return { returnShippingProvider: provider, returnTrackingCode: code, returnReceipt };
            }
        });
        if (isConfirmed) {
            try {
                await axios.put(`/api/orders/${id}/submit-tracking`, formValues, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Thành công', 'Đã lưu vận đơn', 'success'); loadOrder();
            } catch (err) { Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error'); }
        }
    };

    if (isLoading || !order) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;

    let steps = [];
    let currentStepIndex = 0;

    if (order.status === 'cancelled') {
        steps = [
            { id: 'pending', label: 'Đặt hàng', icon: <FaClipboardList /> },
            { id: 'cancelled', label: 'Đã hủy', icon: <FaBan />, isError: true }
        ];
        currentStepIndex = 1;
    }
    else if (order.status === 'failed_delivery') {
        steps = [
            { id: 'pending', label: 'Đặt hàng', icon: <FaClipboardList /> },
            { id: 'confirmed', label: 'Xác nhận', icon: <FaCheck /> },
            { id: 'delivering', label: 'Đang giao', icon: <FaTruck /> },
            { id: 'failed_delivery', label: 'Giao thất bại', icon: <FaBan />, isError: true },
        ];
        currentStepIndex = 3;
    }
    else if (['return_requested', 'return_approved', 'returning', 'returned'].includes(order.status)) {
        steps = [
            { id: 'delivered', label: 'Đã nhận', icon: <FaBoxOpen /> },
            { id: 'return_requested', label: 'Yêu cầu trả', icon: <FaUndo /> },
            { id: 'return_approved', label: 'Shop duyệt', icon: <FaClipboardList /> },
            { id: 'returning', label: 'Đang hoàn về', icon: <FaTruck /> },
            { id: 'returned', label: 'Đã hoàn tiền', icon: <FaCheck /> },
        ];
        const statusOrder = ['delivered', 'return_requested', 'return_approved', 'returning', 'returned'];
        currentStepIndex = statusOrder.indexOf(order.status);
    }
    else {
        steps = [
            { id: 'pending', label: 'Đặt hàng', icon: <FaClipboardList /> },
            { id: 'confirmed', label: 'Xác nhận', icon: <FaCheck /> },
            { id: 'delivering', label: 'Đang giao', icon: <FaTruck /> },
            { id: 'delivered', label: 'Đã giao', icon: <FaBoxOpen /> },
            { id: 'completed', label: 'Hoàn tất', icon: <FaStar /> },
        ];
        const statusOrder = ['pending', 'confirmed', 'delivering', 'delivered', 'completed'];
        currentStepIndex = statusOrder.indexOf(order.status);
        if (currentStepIndex === -1) currentStepIndex = 0;
    }

    const isRejected = order.status === 'completed' && order.adminNote && order.adminNote.toLowerCase().includes('từ chối');
    const approvalEntry = order.statusHistory?.find(h => h.status === 'return_approved');

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => navigate('/orders')} className="text-gray-500 hover:text-black font-semibold text-sm transition-colors">
                        ← Trở lại danh sách
                    </button>
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase tracking-widest block">Mã đơn hàng</span>
                        <span className="font-mono font-bold text-gray-900">#{order._id.slice(-6).toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 mt-8 space-y-6">

                <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                    <div className="flex items-start justify-between relative px-2 md:px-8">
                        <div className="absolute top-6 left-[10%] right-[10%] w-[80%] h-1 bg-gray-200 -translate-y-1/2 z-0 hidden md:block"></div>
                        <div
                            className={`absolute top-6 left-[10%] h-1 transition-all duration-500 -translate-y-1/2 z-0 hidden md:block
                ${order.status === 'cancelled' || order.status === 'failed_delivery' ? 'bg-red-500' : 'bg-indigo-600'}`}
                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 80}%` }}
                        ></div>

                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isError = step.isError && isCompleted;
                            const isActive = index === currentStepIndex;
                            const stepDate = getStepDate(step.id);

                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center w-20 md:w-24">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-xl shadow-sm border-4 transition-all duration-300 bg-white
                    ${isError ? 'border-red-500 text-red-600' :
                                            isCompleted ? 'border-indigo-600 text-indigo-600' :
                                                'border-gray-100 text-gray-300'}`}
                                    >
                                        {step.icon}
                                    </div>
                                    <div className={`mt-3 text-[11px] md:text-sm font-bold text-center ${isActive ? (isError ? 'text-red-600' : 'text-indigo-600') : (isCompleted ? 'text-gray-800' : 'text-gray-400')}`}>
                                        {step.label}
                                    </div>
                                    <div className="mt-1 flex flex-col items-center justify-center h-8">
                                        {stepDate ? (
                                            <>
                                                <span className="text-[10px] md:text-xs text-gray-500 font-semibold">{stepDate.time}</span>
                                                <span className="text-[9px] md:text-[10px] text-gray-400">{stepDate.date}</span>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-gray-300">-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {order.trackingLink && !['cancelled'].includes(order.status) && (
                        <div className="mt-10 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600">
                                    <FaTruck className="text-xl" />
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-xs font-bold text-indigo-900 uppercase tracking-widest mb-0.5">Vận chuyển bởi</p>
                                    <p className="text-sm md:text-base font-bold text-gray-900">{order.shippingProvider}</p>
                                </div>
                            </div>
                            <a
                                href={order.trackingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 text-xs md:text-sm font-bold rounded shadow-sm hover:bg-indigo-600 hover:text-white transition-colors text-center"
                            >
                                Tra cứu hành trình
                            </a>
                        </div>
                    )}

                    {isRejected && (
                        <div className="mt-6 bg-rose-50 border-l-4 border-rose-500 p-4 rounded text-sm text-rose-800 shadow-sm">
                            <p className="font-bold uppercase text-[11px] tracking-widest mb-1 flex items-center gap-1.5">
                                <FontAwesomeIcon icon={['fas', 'exclamation-triangle']} className="text-rose-600" /> Khiếu nại bị từ chối
                            </p>
                            <p className="font-medium italic">"{order.adminNote}"</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* CỘT TRÁI */}
                    <div className="md:col-span-2 space-y-6">

                        {/* ✅ BOX HƯỚNG DẪN CHUYỂN KHOẢN (Chỉ hiện khi dùng Transfer và chưa thanh toán) */}
                        {order.paymentMethod === 'transfer' && order.paymentStatus === 'Chờ thanh toán' && order.status !== 'cancelled' && (
                            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                                <div className="flex-1 text-blue-900">
                                    <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                                        <FaMoneyBillWave /> Hướng dẫn chuyển khoản
                                    </h3>
                                    <p className="text-sm mb-4">Vui lòng chuyển khoản số tiền <strong className="text-red-600 text-lg">{formatPrice(order.totalPrice)}</strong> vào tài khoản dưới đây để chúng tôi xử lý đơn hàng.</p>

                                    <div className="bg-white p-4 rounded-lg border border-blue-100 font-mono text-sm space-y-2 shadow-inner">
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="font-semibold text-gray-500">Ngân hàng:</span>
                                            <span className="font-bold text-right">Vietcombank (VCB)</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="font-semibold text-gray-500">Chủ tài khoản:</span>
                                            <span className="font-bold text-right">NGUYEN VAN A</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="font-semibold text-gray-500">Số tài khoản:</span>
                                            <span className="font-bold text-indigo-700 text-base text-right">1026325913</span>
                                        </div>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between pt-1 gap-2">
                                            <span className="font-semibold text-gray-500">Nội dung CK:</span>
                                            <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded text-center">
                                                {order._id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-700 mt-4 italic">* Lưu ý: Đơn hàng sẽ tự động hủy nếu shop không nhận được thanh toán trong vòng 24 giờ.</p>
                                </div>

                                {/* QR Code giả lập (Sinh tự động từ vietqr) */}
                                <div className="w-48 h-48 bg-white rounded-xl border-2 border-blue-200 p-2 shadow-sm flex-shrink-0 flex items-center justify-center text-center">
                                    <img
                                        src={`https://img.vietqr.io/image/vcb-1026325913-compact2.png?amount=${order.totalPrice}&addInfo=${order._id.slice(-6).toUpperCase()}&accountName=NGUYEN VAN A`}
                                        alt="QR Pay"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                </div>
                            </div>
                        )}

                        {/* DANH SÁCH SẢN PHẨM */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-5 border-b pb-3 text-lg">Sản phẩm đã đặt</h3>
                            <div className="flex flex-col gap-4">
                                {order.items.map(item => (
                                    <div key={item.book._id} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`}
                                                className="w-16 h-24 object-cover rounded shadow-sm border border-gray-100"
                                                alt={item.book.title}
                                            />
                                            <div>
                                                <p className="text-sm md:text-base font-bold text-gray-800 line-clamp-2">{item.book.title}</p>
                                                <p className="text-xs md:text-sm text-gray-500 mt-1">x{item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm md:text-base font-black text-gray-900">{formatPrice(item.book.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Khối tính tiền */}
                            <div className="mt-6 border-t border-gray-100 pt-5 space-y-2 text-sm">
                                {(() => {
                                    const subTotal = order.items.reduce((sum, item) => sum + item.book.price * item.quantity, 0);
                                    const discount = subTotal + (order.shippingFee || 0) - order.totalPrice;
                                    return (
                                        <>
                                            <div className="flex justify-between text-gray-600"><span>Tổng tiền hàng:</span><span className="font-semibold text-gray-900">{formatPrice(subTotal)}</span></div>
                                            <div className="flex justify-between text-gray-600"><span>Phí vận chuyển:</span><span className="font-semibold text-gray-900">{formatPrice(order.shippingFee || 0)}</span></div>
                                            {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Voucher giảm giá:</span><span className="font-bold">-{formatPrice(discount)}</span></div>}
                                            <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200">
                                                <span className="font-bold text-gray-900 text-base">Tổng thanh toán:</span>
                                                <span className="text-xl md:text-2xl font-black text-red-600">{formatPrice(order.totalPrice)}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI: THÔNG TIN NHẬN HÀNG & NÚT THAO TÁC */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 border-b pb-3">Thông tin nhận hàng</h3>
                            <div className="space-y-3 text-sm">
                                <div><span className="text-gray-500 block text-[11px] uppercase tracking-wider mb-0.5">Người nhận</span><span className="font-bold text-gray-800">{order.shippingAddress.fullName}</span></div>
                                <div><span className="text-gray-500 block text-[11px] uppercase tracking-wider mb-0.5">Điện thoại</span><span className="font-bold text-gray-800">{order.shippingAddress.phone}</span></div>
                                <div><span className="text-gray-500 block text-[11px] uppercase tracking-wider mb-0.5">Địa chỉ giao</span><span className="text-gray-700 leading-relaxed block">{formatAddress(order.shippingAddress)}</span></div>
                                <div>
                                    <span className="text-gray-500 block text-[11px] uppercase tracking-wider mb-1">Thanh toán</span>
                                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 font-bold text-xs rounded border border-gray-200 uppercase">
                                        {order.paymentMethod === 'vnpay' ? 'VNPAY' : order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thanh toán khi nhận (COD)'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Các Nút Thao Tác */}
                        <div className="flex flex-col gap-3">
                            {order.status === 'pending' && (
                                <button onClick={handleCancelOrder} className="w-full py-3 bg-white border-2 border-red-500 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm">
                                    Yêu cầu Hủy đơn hàng
                                </button>
                            )}

                            {order.status === 'delivered' && (
                                <button onClick={handleRequestReturn} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors">
                                    Yêu cầu Trả hàng / Hoàn tiền
                                </button>
                            )}

                            {order.status === 'return_approved' && (
                                <button onClick={() => handleSubmitReturnTracking(approvalEntry?.date)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors animate-bounce">
                                    Cập nhật Mã Vận Đơn Trả Hàng
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;