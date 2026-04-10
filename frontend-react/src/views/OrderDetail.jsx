import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Swal from 'sweetalert2';

/* ── Icon map cho stepper (FontAwesome only) ── */
const stepIcons = {
    pending: ['fas', 'clipboard-list'],
    confirmed: ['fas', 'check'],
    delivering: ['fas', 'truck'],
    delivered: ['fas', 'box-open'],
    completed: ['fas', 'star'],
    cancelled: ['fas', 'ban'],
    failed_delivery: ['fas', 'ban'],
    return_requested: ['fas', 'rotate-left'],
    return_approved: ['fas', 'clipboard-list'],
    returning: ['fas', 'truck'],
    returned: ['fas', 'check'],
};

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
            const { data } = await axios.get(`/api/orders/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrder(data);
        } catch {
            Swal.fire('Lỗi', 'Không thể tải chi tiết đơn hàng', 'error');
            navigate('/orders');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadOrder(); }, [id]);

    const getStepDate = (statusId) => {
        const entry = order?.statusHistory?.find((h) => h.status === statusId);
        if (!entry) return null;
        const d = new Date(entry.date);
        return {
            time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        };
    };

    const handleCancelOrder = async () => {
        const { value: reason, isConfirmed } = await Swal.fire({
            title: 'Hủy đơn hàng',
            input: 'select',
            inputOptions: {
                'Thay đổi ý định': 'Thay đổi ý định',
                'Đặt nhầm sản phẩm': 'Đặt nhầm sản phẩm',
                'Tìm thấy giá tốt hơn': 'Tìm thấy giá tốt hơn',
                'Lý do khác': 'Lý do khác',
            },
            inputPlaceholder: 'Chọn lý do hủy',
            showCancelButton: true,
            confirmButtonColor: '#000',
            confirmButtonText: 'Xác nhận hủy',
        });
        if (isConfirmed && reason) {
            try {
                await axios.put(`/api/orders/cancel/${id}`, { reason }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                Swal.fire('Thành công', 'Đã hủy đơn hàng.', 'success');
                loadOrder();
            } catch {
                Swal.fire('Lỗi', 'Không thể hủy', 'error');
            }
        }
    };

    const handleRequestReturn = async () => {
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: 'Yêu cầu Trả hàng & Hoàn tiền',
            width: '600px',
            html: `
        <select id="swal-type" class="swal2-select !w-full !mt-0 !mb-3 !text-sm">
          <option value="">-- Chọn vấn đề --</option>
          <option value="Giao sai sản phẩm">Giao sai sản phẩm</option>
          <option value="Sản phẩm lỗi">Sản phẩm lỗi</option>
        </select>
        <textarea id="swal-detail" class="swal2-textarea !w-full !mt-0 !mb-3 !text-sm" placeholder="Mô tả chi tiết (Bắt buộc)"></textarea>
        <div class="text-left mb-1 text-sm">Ảnh/Video chứng minh:</div>
        <input type="file" id="swal-media" accept="image/*,video/*" multiple class="w-full text-sm border p-2 rounded mb-3">
        <div class="text-left mb-1 text-sm">Thông tin Bank:</div>
        <input id="swal-bank-detail" type="text" class="swal2-input !w-full !mt-0 !mb-3 !text-sm" placeholder="VD: 1026325913 VCB TRANTHIEUVAN">
      `,
            showCancelButton: true,
            preConfirm: async () => {
                const type = document.getElementById('swal-type').value;
                const detail = document.getElementById('swal-detail').value;
                const bankDetail = document.getElementById('swal-bank-detail').value;
                if (!type || !detail || !bankDetail) {
                    Swal.showValidationMessage('Vui lòng điền đủ thông tin!');
                    return false;
                }
                const toBase64 = (file) =>
                    new Promise((resolve) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve(r.result); });
                let returnMedia = [];
                const mediaInput = document.getElementById('swal-media');
                for (let i = 0; i < mediaInput.files.length; i++) returnMedia.push(await toBase64(mediaInput.files[i]));
                return { returnReasonType: type, returnReasonDetail: detail, returnBankDetails: bankDetail, returnMedia };
            },
        });
        if (isConfirmed) {
            Swal.fire({ title: 'Đang xử lý...', didOpen: () => Swal.showLoading() });
            try {
                await axios.put(`/api/orders/${id}/request-return`, formValues, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                Swal.fire('Thành công', 'Đã gửi yêu cầu', 'success');
                loadOrder();
            } catch {
                Swal.fire('Lỗi', 'Không thể gửi', 'error');
            }
        }
    };

    const handleSubmitReturnTracking = async (approvedDate) => {
        const deadlineStr = new Date(
            new Date(approvedDate).getTime() + 7 * 24 * 60 * 60 * 1000
        ).toLocaleDateString('vi-VN');

        const { value: formValues, isConfirmed } = await Swal.fire({
            title: 'Tạo đơn Trả hàng',
            width: '500px',
            html: `
        <div class="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-800 mb-4 text-left font-medium">
          Gửi hàng và nhập mã vận đơn trước <strong class="text-red-600">${deadlineStr}</strong>.
        </div>
        <select id="swal-ret-provider" class="swal2-select !w-full !mb-3 !text-sm">
          <option value="">-- Đơn vị vận chuyển --</option>
          <option value="GHTK">GHTK</option>
          <option value="GHN">GHN</option>
          <option value="Viettel Post">Viettel Post</option>
        </select>
        <input id="swal-ret-tracking" type="text" class="swal2-input !w-full !mb-4 !text-sm" placeholder="Mã vận đơn">
        <div class="text-left text-sm">Ảnh biên nhận:</div>
        <input type="file" id="swal-ret-receipt" class="w-full text-sm border p-2 rounded">
      `,
            showCancelButton: true,
            confirmButtonText: 'Xác nhận Đã Gửi',
            preConfirm: async () => {
                const provider = document.getElementById('swal-ret-provider').value;
                const code = document.getElementById('swal-ret-tracking').value;
                if (!provider || !code) { Swal.showValidationMessage('Nhập ĐVVC và Mã vận đơn!'); return false; }
                let returnReceipt = null;
                const receiptInput = document.getElementById('swal-ret-receipt');
                if (receiptInput.files.length > 0) {
                    returnReceipt = await new Promise((res) => {
                        const r = new FileReader(); r.readAsDataURL(receiptInput.files[0]); r.onload = () => res(r.result);
                    });
                }
                return { returnShippingProvider: provider, returnTrackingCode: code, returnReceipt };
            },
        });
        if (isConfirmed) {
            try {
                await axios.put(`/api/orders/${id}/submit-tracking`, formValues, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                Swal.fire('Thành công', 'Đã lưu vận đơn', 'success');
                loadOrder();
            } catch {
                Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
            }
        }
    };

    /* ── Loading ── */
    if (isLoading || !order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
                <div className="w-10 h-10 border-4 border-stone-100 border-t-black rounded-full animate-spin mb-4" />
                <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400">Đang tải...</p>
            </div>
        );
    }

    /* ── Build steps ── */
    let steps = [];
    let currentStepIndex = 0;

    if (order.status === 'cancelled') {
        steps = [
            { id: 'pending', label: 'Đặt hàng' },
            { id: 'cancelled', label: 'Đã hủy', isError: true },
        ];
        currentStepIndex = 1;
    } else if (order.status === 'failed_delivery') {
        steps = [
            { id: 'pending', label: 'Đặt hàng' },
            { id: 'confirmed', label: 'Xác nhận' },
            { id: 'delivering', label: 'Đang giao' },
            { id: 'failed_delivery', label: 'Giao thất bại', isError: true },
        ];
        currentStepIndex = 3;
    } else if (['return_requested', 'return_approved', 'returning', 'returned'].includes(order.status)) {
        steps = [
            { id: 'delivered', label: 'Đã nhận' },
            { id: 'return_requested', label: 'Yêu cầu trả' },
            { id: 'return_approved', label: 'Shop duyệt' },
            { id: 'returning', label: 'Đang hoàn về' },
            { id: 'returned', label: 'Đã hoàn tiền' },
        ];
        const order2 = ['delivered', 'return_requested', 'return_approved', 'returning', 'returned'];
        currentStepIndex = order2.indexOf(order.status);
    } else {
        steps = [
            { id: 'pending', label: 'Đặt hàng' },
            { id: 'confirmed', label: 'Xác nhận' },
            { id: 'delivering', label: 'Đang giao' },
            { id: 'delivered', label: 'Đã giao' },
            { id: 'completed', label: 'Hoàn tất' },
        ];
        const order3 = ['pending', 'confirmed', 'delivering', 'delivered', 'completed'];
        currentStepIndex = order3.indexOf(order.status);
        if (currentStepIndex === -1) currentStepIndex = 0;
    }

    const isRejected = order.status === 'completed' && order.adminNote?.toLowerCase().includes('từ chối');
    const approvalEntry = order.statusHistory?.find((h) => h.status === 'return_approved');

    const subTotal = order.items.reduce((sum, item) => sum + item.book.price * item.quantity, 0);
    const discount = subTotal + (order.shippingFee || 0) - order.totalPrice;

    return (
        <div className="min-h-screen bg-stone-50 pb-16">

            {/* ── HEADER ── */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/orders')}
                        className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-black transition-colors flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={['fas', 'arrow-left']} />
                        Đơn hàng của tôi
                    </button>
                    <div className="text-right">
                        <span className="text-[9px] text-stone-400 uppercase tracking-[0.3em] font-bold block">Mã đơn hàng</span>
                        <span className="font-mono font-bold text-black text-sm">#{order._id.slice(-6).toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 mt-8 space-y-5">

                {/* ── STEPPER ── */}
                <div className="bg-white border border-gray-100 p-8">
                    <div className="flex items-start justify-between relative px-4 md:px-10">

                        {/* Track line base */}
                        <div className="absolute top-5 left-[10%] right-[10%] h-px bg-gray-200 hidden md:block" />
                        {/* Track line progress */}
                        <div
                            className={`absolute top-5 left-[10%] h-px transition-all duration-500 hidden md:block
                ${order.status === 'cancelled' || order.status === 'failed_delivery' ? 'bg-red-400' : 'bg-black'}`}
                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 80}%` }}
                        />

                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isActive = index === currentStepIndex;
                            const isError = step.isError && isCompleted;
                            const stepDate = getStepDate(step.id);

                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center w-16 md:w-24">
                                    {/* Circle */}
                                    <div
                                        className={`w-10 h-10 border-2 flex items-center justify-center transition-all duration-300 bg-white
                      ${isError ? 'border-red-500 text-red-500'
                                                : isCompleted ? 'border-black text-black'
                                                    : 'border-gray-200 text-stone-300'}`}
                                    >
                                        <FontAwesomeIcon icon={stepIcons[step.id]} className="text-sm" />
                                    </div>

                                    {/* Label */}
                                    <p className={`mt-3 text-[10px] md:text-xs font-bold text-center leading-tight
                    ${isActive ? (isError ? 'text-red-500' : 'text-black')
                                            : isCompleted ? 'text-stone-600'
                                                : 'text-stone-300'}`}
                                    >
                                        {step.label}
                                    </p>

                                    {/* Date */}
                                    <div className="mt-1 flex flex-col items-center h-8">
                                        {stepDate ? (
                                            <>
                                                <span className="text-[9px] md:text-[10px] text-stone-500 font-semibold">{stepDate.time}</span>
                                                <span className="text-[8px] md:text-[9px] text-stone-400">{stepDate.date}</span>
                                            </>
                                        ) : (
                                            <span className="text-[9px] text-stone-200">—</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Tracking link */}
                    {order.trackingLink && !['cancelled'].includes(order.status) && (
                        <div className="mt-10 p-4 bg-stone-50 border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 border border-gray-200 flex items-center justify-center text-stone-600">
                                    <FontAwesomeIcon icon={['fas', 'truck']} className="text-sm" />
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-0.5">Vận chuyển bởi</p>
                                    <p className="text-sm font-bold text-black">{order.shippingProvider}</p>
                                </div>
                            </div>
                            <a
                                href={order.trackingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-5 py-2 border border-black text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                            >
                                Tra cứu hành trình
                            </a>
                        </div>
                    )}

                    {/* Rejected notice */}
                    {isRejected && (
                        <div className="mt-6 bg-rose-50 border-l-4 border-rose-500 px-5 py-4">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-rose-600 mb-1 flex items-center gap-1.5">
                                <FontAwesomeIcon icon={['fas', 'triangle-exclamation']} /> Khiếu nại bị từ chối
                            </p>
                            <p className="text-sm font-medium text-rose-800 italic">"{order.adminNote}"</p>
                        </div>
                    )}
                </div>

                {/* ── MAIN GRID ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* ── LEFT COL ── */}
                    <div className="md:col-span-2 space-y-5">

                        {/* Transfer instruction */}
                        {order.paymentMethod === 'transfer' &&
                            order.paymentStatus === 'Chờ thanh toán' &&
                            order.status !== 'cancelled' && (
                                <div className="bg-white border border-gray-100 p-6 flex flex-col md:flex-row gap-6 items-start">
                                    <div className="flex-1">
                                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400 mb-3">
                                            Hướng dẫn chuyển khoản
                                        </p>
                                        <p className="text-sm text-stone-600 mb-4">
                                            Vui lòng chuyển khoản số tiền{' '}
                                            <strong className="text-black">{formatPrice(order.totalPrice)}</strong>{' '}
                                            vào tài khoản dưới đây để chúng tôi xử lý đơn hàng.
                                        </p>
                                        <div className="border border-gray-100 text-sm divide-y divide-gray-100">
                                            {[
                                                ['Ngân hàng', 'Vietcombank (VCB)'],
                                                ['Chủ tài khoản', 'NGUYEN VAN A'],
                                                ['Số tài khoản', '1026325913'],
                                            ].map(([label, value]) => (
                                                <div key={label} className="flex justify-between px-4 py-3">
                                                    <span className="text-stone-400 font-medium">{label}</span>
                                                    <span className="font-bold text-black">{value}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between px-4 py-3">
                                                <span className="text-stone-400 font-medium">Nội dung CK</span>
                                                <span className="font-black text-black bg-stone-100 px-2 py-0.5 text-xs uppercase">
                                                    {order._id.slice(-6).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-stone-400 mt-3 italic">
                                            * Đơn hàng tự động hủy nếu không nhận được thanh toán trong 24 giờ.
                                        </p>
                                    </div>
                                    <div className="w-40 h-40 border border-gray-100 flex-shrink-0 overflow-hidden">
                                        <img
                                            src={`https://img.vietqr.io/image/vcb-1026325913-compact2.png?amount=${order.totalPrice}&addInfo=${order._id.slice(-6).toUpperCase()}&accountName=NGUYEN VAN A`}
                                            alt="QR Pay"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            )}

                        {/* Items */}
                        <div className="bg-white border border-gray-100 p-6">
                            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400 mb-5 pb-4 border-b border-gray-100">
                                Sản phẩm đã đặt
                            </p>
                            <div className="flex flex-col divide-y divide-gray-50">
                                {order.items.map((item) => (
                                    <div key={item.book._id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`}
                                                className="w-14 h-20 object-cover border border-gray-100 flex-shrink-0"
                                                alt={item.book.title}
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-black line-clamp-2 leading-snug">
                                                    {item.book.title}
                                                </p>
                                                <p className="text-xs text-stone-400 mt-1">x{item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-black flex-shrink-0 ml-4">
                                            {formatPrice(item.book.price * item.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Price summary */}
                            <div className="mt-5 border-t border-gray-100 pt-5 space-y-2 text-sm">
                                <div className="flex justify-between text-stone-500">
                                    <span>Tổng tiền hàng</span>
                                    <span className="font-semibold text-black">{formatPrice(subTotal)}</span>
                                </div>
                                <div className="flex justify-between text-stone-500">
                                    <span>Phí vận chuyển</span>
                                    <span className="font-semibold text-black">{formatPrice(order.shippingFee || 0)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Voucher giảm giá</span>
                                        <span className="font-bold">−{formatPrice(discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-100">
                                    <span className="font-bold text-black">Tổng thanh toán</span>
                                    <span className="text-xl font-black text-black">{formatPrice(order.totalPrice)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COL ── */}
                    <div className="space-y-5">

                        {/* Shipping info */}
                        <div className="bg-white border border-gray-100 p-6">
                            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400 mb-5 pb-4 border-b border-gray-100">
                                Thông tin nhận hàng
                            </p>
                            <div className="space-y-4 text-sm">
                                {[
                                    { label: 'Người nhận', value: order.shippingAddress.fullName },
                                    { label: 'Điện thoại', value: order.shippingAddress.phone },
                                    { label: 'Địa chỉ', value: formatAddress(order.shippingAddress) },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-0.5">
                                            {label}
                                        </span>
                                        <span className="font-semibold text-black leading-relaxed">{value}</span>
                                    </div>
                                ))}
                                <div>
                                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 block mb-1">
                                        Thanh toán
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest border border-gray-200 px-3 py-1 inline-block text-stone-600">
                                        {order.paymentMethod === 'vnpay' ? 'VNPAY'
                                            : order.paymentMethod === 'transfer' ? 'Chuyển khoản'
                                                : 'COD'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-3">
                            {order.status === 'pending' && (
                                <button
                                    onClick={handleCancelOrder}
                                    className="w-full py-3 border-2 border-red-400 text-red-500 font-bold text-sm uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <FontAwesomeIcon icon={['fas', 'ban']} className="mr-2" />
                                    Hủy đơn hàng
                                </button>
                            )}

                            {order.status === 'delivered' && (
                                <button
                                    onClick={handleRequestReturn}
                                    className="w-full py-3 bg-black text-white font-bold text-sm uppercase tracking-widest hover:bg-stone-800 transition-all"
                                >
                                    <FontAwesomeIcon icon={['fas', 'rotate-left']} className="mr-2" />
                                    Trả hàng / Hoàn tiền
                                </button>
                            )}

                            {order.status === 'return_approved' && (
                                <button
                                    onClick={() => handleSubmitReturnTracking(approvalEntry?.date)}
                                    className="w-full py-3 bg-black text-white font-bold text-sm uppercase tracking-widest hover:bg-stone-800 transition-all"
                                >
                                    <FontAwesomeIcon icon={['fas', 'truck']} className="mr-2" />
                                    Cập nhật mã vận đơn
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