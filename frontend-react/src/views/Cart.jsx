import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCartStore } from '../composables/cartStore';

const Cart = () => {
  const [cart, setCart] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();
  const setCartCountStore = useCartStore((state) => state.setCartCount);
  const token = localStorage.getItem('token');

  const formatPrice = (n) => n.toLocaleString('vi-VN');

  const loadCart = async () => {
    try {
      const { data } = await axios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = data.items || [];
      setCart([...items].reverse());

      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
      setCartCountStore(totalQty);

      const preselect = localStorage.getItem('preselectItem');
      if (preselect) {
        setSelectedItems([preselect]);
        localStorage.removeItem('preselectItem');
      }
    } catch (err) {
      console.error('Lỗi tải giỏ hàng', err);
    }
  };

  useEffect(() => { loadCart(); }, []);

  const totalSelected = useMemo(() => {
    return cart
      .filter((item) => selectedItems.includes(item.book._id))
      .reduce((sum, item) => sum + item.book.price * item.quantity, 0);
  }, [cart, selectedItems]);

  const updateQuantity = async (bookId, quantity) => {
    const item = cart.find(i => i.book._id === bookId);
    if (!item || quantity > item.book.stock || quantity < 1) return;
    try {
      await axios.put('/api/cart/update', { bookId, quantity }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart(cart.map(i => i.book._id === bookId ? { ...i, quantity } : i));
      setCartCountStore(cart.reduce((sum, i) => sum + (i.book._id === bookId ? quantity : i.quantity), 0));
    } catch (err) {
      console.error('Lỗi cập nhật số lượng:', err);
    }
  };

  const removeItem = async (bookId) => {
    try {
      await axios.delete(`/api/cart/remove/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newCart = cart.filter(i => i.book._id !== bookId);
      setCart(newCart);
      setSelectedItems(selectedItems.filter(id => id !== bookId));
      setCartCountStore(newCart.reduce((sum, i) => sum + i.quantity, 0));
    } catch (err) {
      console.error('Lỗi khi xoá khỏi giỏ:', err);
    }
  };

  const proceedToCheckout = () => {
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
      return;
    }
    const selected = cart.filter(item => selectedItems.includes(item.book._id));
    localStorage.setItem('checkoutItems', JSON.stringify(selected));
    navigate('/checkout');
  };

  const selectableIds = useMemo(() => cart.filter(item => item.book.stock > 0).map(item => item.book._id), [cart]);
  const isAllSelected = selectableIds.length > 0 && selectableIds.every(id => selectedItems.includes(id));

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedItems(selectableIds);
    else setSelectedItems([]);
  };

  const toggleItemSelect = (id, checked) => {
    if (checked) setSelectedItems([...selectedItems, id]);
    else setSelectedItems(selectedItems.filter(itemId => itemId !== id));
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-1">Của tôi</p>
          <h1 className="text-3xl font-bold text-black">Giỏ Hàng</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT: ITEMS ── */}
          <div className="w-full lg:w-[68%] flex flex-col gap-3">

            {cart.length === 0 ? (
              <div className="bg-white border border-gray-100 flex flex-col items-center justify-center py-24 gap-4">
                <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-4xl text-stone-200" />
                <div className="text-center">
                  <p className="font-semibold text-black mb-1">Giỏ hàng trống</p>
                  <p className="text-stone-400 text-sm">Hãy thêm sản phẩm vào giỏ hàng của bạn.</p>
                </div>
                <button onClick={() => navigate('/books')} className="mt-2 px-8 py-3 hover-flip-btn">
                  Tiếp tục mua sắm
                </button>
              </div>
            ) : (
              <>
                {/* Select All Row */}
                <div className="bg-white border border-gray-100 px-5 py-3.5 flex items-center gap-3 select-none">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <label className="text-sm font-medium text-stone-600 cursor-pointer select-none">
                    Chọn tất cả ({selectableIds.length} sản phẩm)
                  </label>
                </div>

                {/* Cart Items */}
                {cart.map((item) => {
                  const imgSrc = item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`;
                  const outOfStock = item.book.stock === 0;

                  return (
                    <div
                      key={item.book._id}
                      className={`bg-white border border-gray-100 px-5 py-4 flex items-center select-none gap-4 transition-opacity duration-200 ${outOfStock ? 'opacity-60' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        {!outOfStock ? (
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.book._id)}
                            onChange={(e) => toggleItemSelect(item.book._id, e.target.checked)}
                            className="w-4 h-4 accent-black cursor-pointer"
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>

                      {/* Book Image */}
                      <img
                        src={imgSrc}
                        className="w-16 h-24 object-cover flex-shrink-0 cursor-pointer"
                        alt={item.book.title}
                        onClick={() => navigate(`/books/${item.book._id}`)}
                      />

                      {/* Book Info */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold text-sm text-black line-clamp-2 cursor-pointer hover:underline underline-offset-2"
                          onClick={() => navigate(`/books/${item.book._id}`)}
                        >
                          {item.book.title}
                        </h3>
                        <p className="text-xs text-stone-400 mt-1">{item.book.author}</p>
                        {outOfStock ? (
                          <span className="inline-block mt-2 text-[11px] text-red-500 bg-red-50 px-2 py-0.5">Hết hàng</span>
                        ) : (
                          <p className="text-xs text-stone-400 mt-1">Còn {item.book.stock} sản phẩm</p>
                        )}
                        <p className="text-sm font-bold text-black mt-2">{formatPrice(item.book.price)}₫</p>
                      </div>

                      {/* Quantity Control */}
                      {!outOfStock && (
                        <div className="flex border border-gray-200 flex-shrink-0">
                          <button
                            onClick={() => item.quantity > 1 && updateQuantity(item.book._id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-600 disabled:opacity-30"
                            disabled={item.quantity <= 1}
                          >
                            <FontAwesomeIcon icon={['fas', 'minus']} className="text-xs" />
                          </button>
                          <div className="w-10 h-8 flex items-center justify-center text-sm font-semibold border-x border-gray-200">
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => updateQuantity(item.book._id, item.quantity + 1)}
                            disabled={item.quantity >= item.book.stock}
                            className="w-8 h-8 flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <FontAwesomeIcon icon={['fas', 'plus']} className="text-xs" />
                          </button>
                        </div>
                      )}

                      {/* Subtotal + Remove — same column */}
                      <div className="flex flex-col items-center  gap-2 flex-shrink-0 min-w-[88px]">
                        <p className="text-xs text-stone-400">Thành tiền</p>
                        <p className={`font-bold  text-sm ${outOfStock ? 'text-stone-300' : 'text-black'}`}>
                          {outOfStock ? '—' : `${formatPrice(item.book.price * item.quantity)}₫`}
                        </p>
                        <button
                          onClick={() => removeItem(item.book._id)}
                          className="text-stone-300 hover:text-red-400 transition-colors mt-1"
                          title="Xóa"
                        >
                          <FontAwesomeIcon icon={['fas', 'trash']} className="text-m" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* ── RIGHT: ORDER SUMMARY ── */}
          {cart.length > 0 && (
            <div className="w-full lg:w-[32%] sticky top-24">
              <div className="bg-white border border-gray-100 p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-black mb-5 pb-4 border-b border-gray-100">
                  Thông tin đơn hàng
                </h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500">
                      Sản phẩm đã chọn ({selectedItems.length})
                    </span>
                    <span className="font-semibold text-black">{formatPrice(totalSelected)}₫</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500">Phí vận chuyển</span>
                    <span className="text-green-600 font-medium">Tính lúc đặt hàng</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-black">Tổng tiền</span>
                    <span className="text-xl font-bold text-black">{formatPrice(totalSelected)}₫</span>
                  </div>
                </div>

                <button
                  onClick={proceedToCheckout}
                  className="w-full py-3.5 hover-flip-btn uppercase tracking-widest text-sm font-bold"
                >
                  Thanh toán
                </button>

                <button
                  onClick={() => navigate('/books')}
                  className="w-full mt-3 py-2.5 text-xs text-stone-400 hover:text-black transition-colors tracking-wide"
                >
                  ← Tiếp tục mua sắm
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;