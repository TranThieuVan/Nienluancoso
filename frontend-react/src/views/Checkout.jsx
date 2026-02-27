import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Checkout = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const shippingFee = 40000;

  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ fullName: '', phone: '', street: '', district: '', city: '' });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [tempSelectedAddressId, setTempSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ fullName: '', phone: '', street: '', district: '', city: '' });

  const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
  const formatAddress = (addr) => `${addr.street}, ${addr.district}, ${addr.city}`;

  const subTotal = useMemo(() => cart.reduce((sum, item) => sum + item.book.price * item.quantity, 0), [cart]);
  const totalAmount = useMemo(() => subTotal + shippingFee, [subTotal]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const selected = localStorage.getItem('checkoutItems');
        if (!selected) {
          await Swal.fire('Không có sản phẩm', 'Vui lòng chọn sản phẩm trước khi thanh toán.', 'info');
          return navigate('/cart');
        }

        const parsedItems = JSON.parse(selected);
        setCart(parsedItems.filter(item => item.book && item.book.price != null));

        const addrRes = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
        setAddresses(addrRes.data);

        if (addrRes.data.length > 0) {
          const defaultAddress = addrRes.data.find(a => a.isDefault) || addrRes.data[0];
          setSelectedAddressId(defaultAddress._id);
          setTempSelectedAddressId(defaultAddress._id);
          setForm({ ...defaultAddress });
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu', err);
      }
    };
    loadData();
  }, [navigate, token]);

  const confirmAddressSelection = () => {
    const selected = addresses.find(a => a._id === tempSelectedAddressId);
    if (selected) {
      setSelectedAddressId(selected._id);
      setForm({ ...selected });
    }
    setShowAddressModal(false);
    setShowNewAddressForm(false);
  };

  const addNewAddress = async () => {
    if (!newAddress.fullName || !newAddress.phone || !newAddress.street || !newAddress.district || !newAddress.city) {
      return Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ địa chỉ.', 'warning');
    }
    try {
      const res = await axios.post('/api/addresses', newAddress, { headers: { Authorization: `Bearer ${token}` } });
      setAddresses([...addresses, res.data]);
      setTempSelectedAddressId(res.data._id);
      setNewAddress({ fullName: '', phone: '', street: '', district: '', city: '' });
      setShowNewAddressForm(false);
      Swal.fire('Đã thêm địa chỉ', '', 'success');
    } catch {
      Swal.fire('Lỗi', 'Không thể thêm địa chỉ. Vui lòng thử lại.', 'error');
    }
  };

  const submitOrder = async () => {
    if (!form.fullName || !form.phone || !form.street || !form.district || !form.city) {
      return Swal.fire('Thiếu thông tin', 'Vui lòng chọn địa chỉ giao hàng.', 'warning');
    }

    try {
      await axios.post('/api/orders', {
        shippingAddress: form,
        items: cart.map(item => ({ book: item.book._id, quantity: item.quantity })),
        shippingFee
      }, { headers: { Authorization: `Bearer ${token}` } });

      await Swal.fire('Thành công', 'Đơn hàng đã được đặt!', 'success');
      localStorage.removeItem('checkoutItems');
      navigate('/orders');
    } catch (err) {
      Swal.fire('Lỗi đặt hàng', err.response?.data?.msg || 'Không thể đặt hàng. Vui lòng thử lại sau.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6 items-start min-h-screen mt-6">
      <div className="md:w-2/5 w-full bg-white shadow p-4 space-y-4 rounded">
        <h2 className="text-xl font-bold text-gray-800">Sản phẩm đã chọn</h2>
        {cart.length > 0 ? (
          <div>
            {cart.map(item => (
              <div key={item.book._id} className="flex gap-3 items-center border-b pb-3 hover:bg-gray-100 mb-2">
                <img src={item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`} className="w-16 h-20 object-cover rounded shadow" alt="book" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 line-clamp-2">{item.book.title}</p>
                  <p className="text-sm text-gray-500">x{item.quantity}</p>
                </div>
                <div className="font-semibold text-gray-700">{formatPrice(item.book.price * item.quantity)}</div>
              </div>
            ))}
            <div className="pt-4 border-t space-y-1 text-right font-medium text-gray-800">
              <p>Tổng giá sách: <span>{formatPrice(subTotal)}</span></p>
              <p>Phí vận chuyển: <span>{formatPrice(shippingFee)}</span></p>
              <p className="text-lg font-bold pt-1">Tổng cộng: <span className="text-red-600">{formatPrice(totalAmount)}</span></p>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic">Không có sản phẩm nào được chọn.</div>
        )}
      </div>

      <div className="md:w-3/5 w-full bg-white shadow p-6 space-y-4 sticky top-[80px] rounded">
        <h2 className="text-xl font-bold text-gray-800">Địa chỉ giao hàng</h2>
        {form.fullName ? (
          <div className="border border-gray-300 py-2 px-4 bg-gray-50 flex items-center justify-between rounded">
            <div>
              <p className="font-medium">{form.fullName} | {form.phone}</p>
              <p className="text-gray-700">{formatAddress(form)}</p>
            </div>
            <button onClick={() => setShowAddressModal(true)} className="py-1 px-4 hover-flip-btn rounded">Thay đổi</button>
          </div>
        ) : (
          <div className="border border-gray-300 py-6 px-4 bg-gray-50 text-center text-gray-600 rounded flex items-center justify-between">
            <p className="mb-0">Bạn chưa có địa chỉ giao hàng</p>
            <button onClick={() => { setShowAddressModal(true); setShowNewAddressForm(true); }} className="hover-flip-btn px-4 py-2 rounded">Thêm địa chỉ</button>
          </div>
        )}
        <div className="text-right pt-4">
          <button onClick={submitOrder} className="py-2 px-6 font-semibold hover-flip-btn transition rounded uppercase tracking-wide">XÁC NHẬN ĐẶT HÀNG</button>
        </div>
      </div>

      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-[90%] max-w-xl rounded-lg p-6 shadow space-y-4 relative">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Chọn địa chỉ giao hàng</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {addresses.map(addr => (
                <div key={addr._id} className="flex items-center gap-2">
                  <input type="radio" checked={tempSelectedAddressId === addr._id} onChange={() => setTempSelectedAddressId(addr._id)} className="cursor-pointer" />
                  <label className="cursor-pointer" onClick={() => setTempSelectedAddressId(addr._id)}><strong>{addr.fullName}</strong> | {formatAddress(addr)}</label>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t mt-4">
              <button onClick={() => setShowNewAddressForm(!showNewAddressForm)} className="text-blue-600 hover:underline text-sm font-semibold">➕ Thêm địa chỉ mới</button>
            </div>
            {showNewAddressForm && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <input value={newAddress.fullName} onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })} placeholder="Họ và tên" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} placeholder="Số điện thoại" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={newAddress.street} onChange={e => setNewAddress({ ...newAddress, street: e.target.value })} placeholder="Địa chỉ nhà" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={newAddress.district} onChange={e => setNewAddress({ ...newAddress, district: e.target.value })} placeholder="Quận/Huyện" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} placeholder="Thành phố" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="text-right"><button onClick={addNewAddress} className="hover-flip-btn mt-2 px-6 py-2 rounded">Lưu địa chỉ</button></div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddressModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Hủy</button>
              <button onClick={confirmAddressSelection} className="py-2 px-4 hover-flip-btn rounded">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;