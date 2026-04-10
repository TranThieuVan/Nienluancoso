import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
  const formatDate = (isoString) =>
    new Date(isoString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const statusConfig = (status) => {
    switch (status) {
      case 'pending': return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Đang xử lý' };
      case 'confirmed': return { text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', label: 'Đã xác nhận' };
      case 'delivering': return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Đang giao' };
      case 'delivered': return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Đã giao' };
      case 'completed': return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Hoàn tất' };
      case 'failed_delivery': return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Giao thất bại' };
      case 'return_requested': return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Yêu cầu trả hàng' };
      case 'return_approved': return { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Đã duyệt trả hàng' };
      case 'returning': return { text: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', label: 'Đang hoàn về' };
      case 'returned': return { text: 'text-stone-600', bg: 'bg-stone-100', border: 'border-stone-300', label: 'Đã trả hàng' };
      case 'cancelled': return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Đã hủy' };
      default: return { text: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-200', label: status };
    }
  };

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`/api/orders?page=${currentPage}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [currentPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-1">Tài khoản</p>
          <h1 className="text-3xl font-bold text-black">Đơn Hàng Của Tôi</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── LOADING ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-10 h-10 border-4 border-stone-100 border-t-black rounded-full animate-spin mb-4" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400">Đang tải...</p>
          </div>

          /* ── EMPTY ── */
        ) : orders.length === 0 ? (
          <div className="bg-white border border-gray-100 flex flex-col items-center justify-center py-24 gap-4">
            <FontAwesomeIcon icon={['fas', 'box-open']} className="text-4xl text-stone-200" />
            <div className="text-center">
              <p className="font-semibold text-black mb-1">Chưa có đơn hàng nào</p>
              <p className="text-stone-400 text-sm">Hãy khám phá và đặt mua những cuốn sách hay nhé.</p>
            </div>
            <button
              onClick={() => navigate('/books')}
              className="mt-2 px-8 py-3 hover-flip-btn"
            >
              Khám phá sách
            </button>
          </div>

          /* ── LIST ── */
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const sc = statusConfig(order.status);
              const firstItem = order.items[0];
              const moreCount = order.items.length - 1;

              return (
                <div
                  key={order._id}
                  className="bg-white border border-gray-100 overflow-hidden hover:border-stone-300 transition-colors duration-200"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-stone-50/60">
                    <div className="flex items-center gap-5">
                      <div>
                        <span className="text-[9px] text-stone-400 uppercase font-bold tracking-[0.2em] block">Mã đơn</span>
                        <span className="font-mono text-sm font-bold text-black">
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <div className="w-px h-5 bg-gray-200" />
                      <div>
                        <span className="text-[9px] text-stone-400 uppercase font-bold tracking-[0.2em] block">Ngày đặt</span>
                        <span className="text-sm font-medium text-black">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-3 py-1 text-[10px] font-bold border uppercase tracking-widest ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    {/* Book preview */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {firstItem && (
                        <>
                          <img
                            src={
                              firstItem.book.image?.startsWith('http')
                                ? firstItem.book.image
                                : `http://localhost:5000${firstItem.book.image}`
                            }
                            alt={firstItem.book.title}
                            className="w-12 h-18 object-cover flex-shrink-0 border border-gray-100"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-black line-clamp-2 leading-snug">
                              {firstItem.book.title}
                            </p>
                            <p className="text-xs text-stone-400 mt-1">
                              x{firstItem.quantity}
                            </p>
                            {moreCount > 0 && (
                              <p className="text-xs font-bold text-stone-500 mt-1">
                                + {moreCount} sản phẩm khác
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Total + CTA */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                      <div className="sm:text-right">
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-0.5">Tổng tiền</p>
                        <p className="text-base font-black text-black">
                          {formatPrice(order.totalPrice)}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="px-5 py-2 border border-black text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>

                  {/* Refund Notice */}
                  {order.paymentStatus === 'Hoàn tiền' && (
                    <div className="mx-5 mb-5 px-4 py-3 bg-amber-50 border border-amber-200 flex items-center gap-2.5">
                      <FontAwesomeIcon icon={['fas', 'circle-info']} className="text-amber-500 flex-shrink-0" />
                      <p className="text-amber-800 text-xs font-bold">
                        Hệ thống sẽ hoàn tiền trong thời gian sớm nhất, vui lòng chờ!
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-10 border-t border-stone-100 pt-8 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;