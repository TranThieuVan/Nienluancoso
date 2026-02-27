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
      setCart(data.items || []);

      const totalQty = (data.items || []).reduce((sum, i) => sum + i.quantity, 0);
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

  useEffect(() => {
    loadCart();
  }, []);

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
    <div className="container mx-auto p-6 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* BÊN TRÁI */}
        <div className="w-full lg:w-3/4">
          <h1 className="text-3xl font-bold text-center mb-6">GIỎ HÀNG CỦA BẠN</h1>

          <div className="bg-gray-100 p-4 space-y-1">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500">Giỏ hàng trống.</div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="w-5 h-5 cursor-pointer" />
                <label className="font-semibold text-gray-700">Chọn tất cả</label>
              </div>
            )}

            {cart.map(item => (
              <div key={item.book._id} className="bg-white p-4 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4 sm:flex-1">
                  <div className="flex items-start">
                    {item.book.stock > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.book._id)}
                        onChange={(e) => toggleItemSelect(item.book._id, e.target.checked)}
                        className="w-5 h-5 mt-2 cursor-pointer"
                      />
                    )}
                  </div>
                  <img src={item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`} className="w-16 h-24 object-cover" alt="book" />
                  <div className="flex flex-col justify-between">
                    <h3 className="font-semibold text-gray-800 line-clamp-2">{item.book.title}</h3>
                    <p className="text-sm text-gray-500">{item.book.author}</p>
                    <p className={`text-sm font-semibold mt-1 ${item.book.stock === 0 ? 'text-red-600' : 'text-red-500'}`}>
                      {item.book.stock === 0 ? 'Hết hàng' : `Số lượng còn lại: ${item.book.stock}`}
                    </p>
                    <p className="text-lg mt-1 font-semibold text-black">{formatPrice(item.book.price)}đ</p>
                  </div>
                </div>

                <div className="flex items-center sm:items-start sm:justify-end gap-10">
                  <div className="flex flex-col items-center w-28">
                    {item.book.stock > 0 ? (
                      <div className="flex border overflow-hidden h-8">
                        <button className="px-2 text-lg hover:bg-gray-200" onClick={() => item.quantity > 1 && updateQuantity(item.book._id, item.quantity - 1)}>−</button>
                        <input type="text" value={item.quantity} readOnly className="w-10 text-center outline-none bg-gray-200" />
                        <button className={`px-2 text-lg hover:bg-gray-200 ${item.quantity >= item.book.stock ? 'text-gray-400 cursor-not-allowed' : ''}`} onClick={() => updateQuantity(item.book._id, item.quantity + 1)} disabled={item.quantity >= item.book.stock}>+</button>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 mt-2 font-semibold">Hết hàng</p>
                    )}
                    <p className={`text-xs mt-1 h-4 transition-opacity duration-300 ${item.quantity >= item.book.stock && item.book.stock > 0 ? 'text-red-500 opacity-100' : 'opacity-0'}`}>Số lượng vượt quá</p>
                  </div>

                  <div className="text-right min-w-[110px]">
                    <p className="text-sm text-gray-600">Thành tiền:</p>
                    <p className={`font-bold text-lg whitespace-nowrap ${item.book.stock === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                      {item.book.stock === 0 ? '0 đ' : formatPrice(item.book.price * item.quantity) + ' đ'}
                    </p>
                  </div>

                  <button onClick={() => removeItem(item.book._id)} className="text-gray-500 hover:text-black text-xl bigger">
                    <FontAwesomeIcon icon={['fas', 'trash']} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BÊN PHẢI */}
        <div className="w-full lg:w-1/4 bg-white shadow mt-4 lg:mt-16 p-6 h-fit sticky top-20">
          <h2 className="text-xl font-semibold mb-2">THÔNG TIN ĐƠN HÀNG</h2>
          <hr className="mb-4" />
          <div className="flex justify-between items-center text-black mb-6">
            <p className="text-lg font-medium">Tổng tiền</p>
            <p className="text-xl font-bold">{formatPrice(totalSelected)} đ</p>
          </div>
          <button onClick={proceedToCheckout} className="w-full hover-flip-btn py-3 text-center tracking-widest uppercase">
            Thanh toán
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;