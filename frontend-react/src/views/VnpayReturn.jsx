import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';

const VnpayReturn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Checking your payment...');

    useEffect(() => {
        const checkPayment = async () => {
            const responseCode = searchParams.get('vnp_ResponseCode');
            const orderId = searchParams.get('vnp_TxnRef');
            const vnpayTransactionNo = searchParams.get('vnp_TransactionNo');
            const vnpayPayDate = searchParams.get('vnp_PayDate');
            const token = localStorage.getItem('token');

            if (responseCode === '00') {
                try {
                    await axios.put(`/api/orders/${orderId}/pay`, {
                        vnpayTransactionNo,
                        vnpayPayDate
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setStatus('success');
                    setMessage('Your payment is confirmed and your order is being processed.');
                    localStorage.removeItem('checkoutItems');
                } catch (error) {
                    console.error('Could not update paid order:', error);
                    setStatus('error');
                    setMessage('Payment succeeded, but we could not update your order. Please contact support.');
                }
            } else {
                // Remove the temporary order if payment failed or was cancelled.
                try {
                    await axios.delete(`/api/orders/${orderId}/hard-delete`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (deleteError) {
                    console.error('Could not remove temporary order:', deleteError);
                }

                if (responseCode === '24') {
                    setStatus('error');
                    setMessage('You cancelled the payment. The temporary order was removed. You can try again from your cart.');
                } else {
                    setStatus('error');
                    setMessage(`Payment failed (code: ${responseCode}). The temporary order was removed.`);
                }
            }
        };

        checkPayment();
    }, [searchParams]);

    const config = {
        loading: {
            icon: null,
            spin: true,
            label: 'Checking payment...',
            color: 'text-black',
            bg: 'bg-stone-50',
            border: 'border-gray-200',
        },
        success: {
            icon: 'circle-check',
            spin: false,
            label: 'Payment successful',
            color: 'text-black',
            bg: 'bg-black',
            border: 'border-black',
            iconColor: 'text-white',
        },
        error: {
            icon: 'circle-xmark',
            spin: false,
            label: 'Payment failed',
            color: 'text-black',
            bg: 'bg-stone-50',
            border: 'border-gray-200',
            iconColor: 'text-stone-400',
        },
    };

    const c = config[status];

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 bg-white">
            <div className="max-w-sm w-full text-center py-16">

                {/* ── Icon / Spinner ── */}
                <div className={`w-20 h-20 mx-auto mb-8 flex items-center justify-center border-2 ${c.bg} ${c.border} transition-all duration-500`}>
                    {status === 'loading' ? (
                        <div className="w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <FontAwesomeIcon
                            icon={['fas', c.icon]}
                            className={`text-3xl ${c.iconColor}`}
                        />
                    )}
                </div>

                {/* ── Label ── */}
                <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-3">
                    {status === 'loading' ? 'Payment' : status === 'success' ? 'VNPAY' : 'Notice'}
                </p>

                {/* ── Title ── */}
                <h2 className="text-2xl font-bold text-black mb-3">
                    {c.label}
                </h2>

                {/* ── Message ── */}
                <p className="text-sm text-stone-500 leading-relaxed mb-10 max-w-xs mx-auto">
                    {message}
                </p>

                {/* ── Actions ── */}
                {status !== 'loading' && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/"
                            className="px-8 py-3 hover-flip-btn text-sm tracking-wide"
                        >
                            Home
                        </Link>
                        {status === 'success' ? (
                            <Link
                                to="/orders"
                                className="px-8 py-3 hover-flip-btn text-sm tracking-wide"
                            >
                                View order
                            </Link>
                        ) : (
                            <button
                                onClick={() => navigate('/cart')}
                                className="px-8 py-3 border border-black text-black text-sm font-medium hover:bg-black hover:text-white transition-colors duration-200 tracking-wide"
                            >
                                Try payment again
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VnpayReturn;