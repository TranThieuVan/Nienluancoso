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
  const formatDate = (isoString) => new Date(isoString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });

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
      case 'returned': return { text: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300', label: 'Đã trả hàng' };
      case 'cancelled': return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Đã hủy' };
      default: return { text: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-200', label: status };
    }
  };

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`/api/orders?page=${currentPage}&limit=5`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [currentPage]);

  const handlePageChange = (pageNumber) => { setCurrentPage(pageNumber); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-1">Tài khoản</p>
          <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={['fas', 'box-open']} className="text-2xl text-gray-400" />
            </div>
            <p className="font-semibold text-gray-800 mb-1">Chưa có đơn hàng nào</p>
            <p className="text-gray-500 text-sm">Hãy khám phá và đặt mua những cuốn sách hay nhé.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => {
              const sc = statusConfig(order.status);
              const firstItem = order.items[0];
              const moreItemsCount = order.items.length - 1;

              return (
                <div key={order._id} className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">Mã đơn</span>
                        <span className="font-mono text-sm font-bold text-gray-800">#{order._id.slice(-6).toUpperCase()}</span>
                      </div>
                      <div className="w-px h-6 bg-gray-300" />
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">Ngày đặt</span>
                        <span className="text-sm font-medium text-gray-800">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </div>
                  </div>

                  {/* Body: Thumbnail Sản phẩm */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {firstItem && (
                        <>
                          <img
                            src={firstItem.book.image?.startsWith('http') ? firstItem.book.image : `http://localhost:5000${firstItem.book.image}`}
                            alt={firstItem.book.title}
                            className="w-14 h-20 object-cover rounded shadow-sm border border-gray-100 flex-shrink-0"
                          />
                          <div>
                            <p className="text-sm font-bold text-gray-800 line-clamp-2">{firstItem.book.title}</p>
                            <p className="text-xs text-gray-500 mt-1">Số lượng: x{firstItem.quantity}</p>
                            {moreItemsCount > 0 && (
                              <p className="text-xs font-semibold text-indigo-600 mt-1">+ {moreItemsCount} sản phẩm khác</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                      <div className="text-left md:text-right mb-0 md:mb-3">
                        <p className="text-xs text-gray-500 mb-0.5">Tổng tiền</p>
                        <p className="text-lg font-black text-red-600">{formatPrice(order.totalPrice)}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="px-5 py-2 bg-stone-800 hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;