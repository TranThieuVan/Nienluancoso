import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';

const VnpayReturn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...');

    useEffect(() => {
        const checkPayment = async () => {
            const responseCode = searchParams.get('vnp_ResponseCode');
            const orderId = searchParams.get('vnp_TxnRef');

            // ✅ CHỘP THÊM 2 THÔNG SỐ TRÊN URL XUỐNG
            const vnpayTransactionNo = searchParams.get('vnp_TransactionNo');
            const vnpayPayDate = searchParams.get('vnp_PayDate');

            if (responseCode === '00') {
                try {
                    const token = localStorage.getItem('token');

                    // ✅ GỬI KÈM 2 THÔNG SỐ ĐÓ VÀO BODY CỦA API
                    await axios.put(`/api/orders/${orderId}/pay`, {
                        vnpayTransactionNo: vnpayTransactionNo,
                        vnpayPayDate: vnpayPayDate
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    setStatus('success');
                    setMessage('🎉 Chúc mừng! Bạn đã thanh toán thành công.');
                    localStorage.removeItem('checkoutItems');

                } catch (error) {
                    console.error("Lỗi cập nhật đơn hàng:", error);
                    setStatus('error');
                    setMessage('Thanh toán thành công nhưng có lỗi khi ghi nhận đơn hàng. Vui lòng liên hệ hỗ trợ.');
                }
            } else if (responseCode === '24') {
                setStatus('error');
                setMessage('Khách hàng đã hủy giao dịch.');
            } else {
                setStatus('error');
                setMessage(`Giao dịch thất bại! (Mã lỗi: ${responseCode})`);
            }
        };

        checkPayment();
    }, [searchParams]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4 mt-10">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">

                {/* Icon Trạng thái */}
                {status === 'loading' && (
                    <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                )}
                {status === 'success' && (
                    <div className="text-green-500 text-6xl mb-4">
                        <FontAwesomeIcon icon={['fas', 'circle-check']} />
                    </div>
                )}
                {status === 'error' && (
                    <div className="text-red-500 text-6xl mb-4">
                        <FontAwesomeIcon icon={['fas', 'circle-xmark']} />
                    </div>
                )}

                {/* Tiêu đề */}
                <h2 className={`text-2xl font-bold mb-2 ${status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-gray-800'}`}>
                    {status === 'loading' ? 'Đang kiểm tra...' : status === 'success' ? 'Giao dịch thành công' : 'Giao dịch thất bại'}
                </h2>

                {/* Lời nhắn */}
                <p className="text-gray-600 mb-8">{message}</p>

                {/* Nút bấm điều hướng */}
                <div className="flex gap-4 justify-center">
                    <Link to="/" className="hover-flip-btn px-10 py-2 ">
                        Về trang chủ
                    </Link>
                    {status === 'success' ? (
                        <Link to="/orders" className="hover-flip-btn px-10 py-2 ">
                            Xem đơn hàng
                        </Link>
                    ) : (
                        <button onClick={() => navigate('/cart')} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition">
                            Thanh toán lại
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VnpayReturn;