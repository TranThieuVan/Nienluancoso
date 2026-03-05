import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Checkout = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const shippingFee = 40000;

  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ fullName: '', phone: '', street: '', ward: '', district: '', city: '' });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [tempSelectedAddressId, setTempSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // ✅ State cho địa chỉ mới (thêm trường ward)
  const [newAddress, setNewAddress] = useState({ fullName: '', phone: '', street: '', ward: '', district: '', city: '' });

  // ✅ State cho dữ liệu API tỉnh thành
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  // State Thanh toán & QR
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫';

  // ✅ Cập nhật định dạng hiển thị địa chỉ 4 cấp
  const formatAddress = (addr) => {
    if (!addr.street) return "";
    return `${addr.street}, ${addr.ward}, ${addr.district}, ${addr.city}`;
  };

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

        // Tải danh sách địa chỉ đã lưu
        const addrRes = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
        setAddresses(addrRes.data);

        if (addrRes.data.length > 0) {
          const defaultAddress = addrRes.data.find(a => a.isDefault) || addrRes.data[0];
          setSelectedAddressId(defaultAddress._id);
          setTempSelectedAddressId(defaultAddress._id);
          setForm({ ...defaultAddress });
        }

        // ✅ Tải danh sách tỉnh thành ban đầu
        const resProvinces = await axios.get('https://provinces.open-api.vn/api/p/');
        setProvinces(resProvinces.data);

      } catch (err) {
        console.error('Lỗi tải dữ liệu', err);
      }
    };
    loadData();
  }, [navigate, token]);

  // ✅ Logic xử lý Dropdown địa chỉ giống Profile
  const handleProvinceChange = async (e) => {
    const provinceCode = e.target.value;
    const provinceName = provinces.find(p => p.code == provinceCode)?.name;
    setNewAddress({ ...newAddress, city: provinceName, district: '', ward: '' });
    setWards([]);
    if (provinceCode) {
      const res = await axios.get(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
      setDistricts(res.data.districts);
    }
  };

  const handleDistrictChange = async (e) => {
    const districtCode = e.target.value;
    const districtName = districts.find(d => d.code == districtCode)?.name;
    setNewAddress({ ...newAddress, district: districtName, ward: '' });
    if (districtCode) {
      const res = await axios.get(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
      setWards(res.data.wards);
    }
  };

  // Hàm tạo mã QR tự động điền tiền & nội dung
  const generateQR = (orderId) => {
    const BANK_ID = "vietcombank";
    const ACCOUNT_NO = "1026325913";
    const TEMPLATE = "compact2";
    const ACCOUNT_NAME = "CHU TAI KHOAN";

    const url = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${totalAmount}&addInfo=TT DON HANG ${orderId}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
    setQrUrl(url);
    setShowQRModal(true);
  };

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
    const { fullName, phone, street, ward, district, city } = newAddress;
    if (!fullName || !phone || !street || !ward || !district || !city) {
      return Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ địa chỉ thực tế (Tỉnh/Huyện/Xã/Số nhà).', 'warning');
    }
    try {
      const res = await axios.post('/api/addresses', newAddress, { headers: { Authorization: `Bearer ${token}` } });
      setAddresses([...addresses, res.data]);
      setTempSelectedAddressId(res.data._id);
      setNewAddress({ fullName: '', phone: '', street: '', ward: '', district: '', city: '' });
      setShowNewAddressForm(false);
      Swal.fire('Đã thêm địa chỉ', '', 'success');
    } catch {
      Swal.fire('Lỗi', 'Không thể thêm địa chỉ.', 'error');
    }
  };

  const submitOrder = async () => {
    if (!form.fullName || !form.phone || !form.street) {
      return Swal.fire('Thiếu thông tin', 'Vui lòng chọn hoặc thêm địa chỉ giao hàng.', 'warning');
    }

    try {
      const res = await axios.post('/api/orders', {
        shippingAddress: form,
        items: cart.map(item => ({ book: item.book._id, quantity: item.quantity })),
        shippingFee,
        paymentMethod,
        totalAmount
      }, { headers: { Authorization: `Bearer ${token}` } });

      const orderId = res.data._id;

      if (paymentMethod === 'transfer') {
        generateQR(orderId);
      } else {
        await Swal.fire('Thành công', 'Đơn hàng đã được đặt!', 'success');
        localStorage.removeItem('checkoutItems');
        navigate('/orders');
      }
    } catch (err) {
      Swal.fire('Lỗi đặt hàng', 'Không thể đặt hàng. Vui lòng thử lại sau.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6 items-start min-h-screen mt-6">
      {/* CỘT TRÁI - DANH SÁCH SẢN PHẨM */}
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

      {/* CỘT PHẢI - THANH TOÁN */}
      <div className="md:w-3/5 w-full space-y-6 sticky top-[80px]">
        {/* KHỐI ĐỊA CHỈ */}
        <div className="bg-white shadow p-6 space-y-4 rounded">
          <h2 className="text-xl font-bold text-gray-800">Địa chỉ giao hàng</h2>
          {form.fullName ? (
            <div className="border border-gray-300 py-2 px-4 bg-gray-50 flex items-center justify-between rounded">
              <div>
                <p className="font-medium">{form.fullName} | {form.phone}</p>
                <p className="text-gray-700 text-sm">{formatAddress(form)}</p>
              </div>
              <button onClick={() => setShowAddressModal(true)} className="py-1 px-4 hover-flip-btn rounded text-sm">Thay đổi</button>
            </div>
          ) : (
            <div className="border border-gray-300 py-6 px-4 bg-gray-50 text-center text-gray-600 rounded flex items-center justify-between">
              <p className="mb-0">Bạn chưa có địa chỉ giao hàng</p>
              <button onClick={() => { setShowAddressModal(true); setShowNewAddressForm(true); }} className="hover-flip-btn px-4 py-2 rounded">Thêm địa chỉ</button>
            </div>
          )}
        </div>

        {/* PHƯƠNG THỨC THANH TOÁN */}
        <div className="bg-white shadow p-6 space-y-4 rounded">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">Phương thức thanh toán</h2>
          <div className="space-y-3">
            <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-4 h-4" />
              <div className="flex-1 text-sm font-semibold text-gray-800">Thanh toán khi nhận hàng (COD)</div>
              <FontAwesomeIcon icon={['fas', 'money-bill-wave']} className="text-green-600" />
            </label>

            <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${paymentMethod === 'transfer' ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} className="w-4 h-4" />
              <div className="flex-1 text-sm font-semibold text-gray-800">Chuyển khoản VietQR (Tự động điền)</div>
              <FontAwesomeIcon icon={['fas', 'qrcode']} className="text-blue-600" />
            </label>
          </div>
        </div>

        <div className="text-right pt-4">
          <button onClick={submitOrder} className="py-2 px-6 font-semibold hover-flip-btn transition rounded uppercase tracking-wide w-full">
            {paymentMethod === 'cod' ? 'XÁC NHẬN ĐẶT HÀNG' : 'TIẾN HÀNH THANH TOÁN'}
          </button>
        </div>
      </div>

      {/* MODAL QR THANH TOÁN */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center space-y-4 relative">
            <button onClick={() => setShowQRModal(false)} className="absolute top-2 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
            <h3 className="text-lg font-bold text-gray-800 pt-2">Quét mã VietQR</h3>
            <p className="text-xs text-gray-500 italic">Dùng App Ngân hàng quét để tự động nhập tiền & nội dung</p>
            <div className="bg-white p-2 border-2 border-gray-100 rounded shadow-inner">
              <img src={qrUrl} alt="VietQR" className="w-full h-auto mx-auto" />
            </div>
            <div className="text-left bg-gray-50 p-3 rounded text-sm space-y-1 border">
              <p><strong>Số tiền:</strong> <span className="text-red-600 font-bold">{formatPrice(totalAmount)}</span></p>
              <p className="text-[11px] text-gray-500">Nội dung đã tích hợp sẵn trong mã QR.</p>
            </div>
            <button onClick={() => { localStorage.removeItem('checkoutItems'); navigate('/orders'); }} className="w-full py-2 hover-flip-btn rounded font-bold">TÔI ĐÃ CHUYỂN KHOẢN XONG</button>
          </div>
        </div>
      )}

      {/* ✅ MODAL CHỌN ĐỊA CHỈ - ĐÃ CẬP NHẬT DROPDOWN GIỐNG PROFILE */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-lg p-6 shadow-xl space-y-4 relative overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-2">Chọn địa chỉ giao hàng</h3>

            {/* Danh sách địa chỉ hiện có */}
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
              {addresses.length > 0 ? (
                addresses.map(addr => (
                  <div key={addr._id} className={`flex items-start gap-3 p-3 border rounded cursor-pointer ${tempSelectedAddressId === addr._id ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200'}`} onClick={() => setTempSelectedAddressId(addr._id)}>
                    <input type="radio" checked={tempSelectedAddressId === addr._id} readOnly className="mt-1" />
                    <div className="text-sm">
                      <p className="font-bold">{addr.fullName} | {addr.phone}</p>
                      <p className="text-gray-600">{formatAddress(addr)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm italic">Bạn chưa lưu địa chỉ nào.</p>
              )}
            </div>

            <div className="pt-2">
              <button onClick={() => setShowNewAddressForm(!showNewAddressForm)} className="text-blue-600 hover:underline text-sm font-bold">
                {showNewAddressForm ? "✕ Đóng form" : "➕ Thêm địa chỉ mới"}
              </button>
            </div>

            {/* ✅ Form thêm địa chỉ mới với cascading dropdown */}
            {showNewAddressForm && (
              <div className="grid grid-cols-1 gap-3 mt-3 bg-gray-50 p-4 rounded border">
                <input value={newAddress.fullName} onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })} placeholder="Họ và tên" className="w-full border rounded px-3 py-2 text-sm" />
                <input value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} placeholder="Số điện thoại" className="w-full border rounded px-3 py-2 text-sm" />

                {/* Tỉnh / Thành */}
                <select onChange={handleProvinceChange} className="w-full border rounded px-3 py-2 text-sm outline-none">
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>

                {/* Quận / Huyện */}
                <select onChange={handleDistrictChange} disabled={!districts.length} className="w-full border rounded px-3 py-2 text-sm outline-none disabled:bg-gray-200">
                  <option value="">-- Chọn Quận / Huyện --</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>

                {/* Phường / Xã */}
                <select
                  onChange={(e) => setNewAddress({ ...newAddress, ward: wards.find(w => w.code == e.target.value)?.name })}
                  disabled={!wards.length}
                  className="w-full border rounded px-3 py-2 text-sm outline-none disabled:bg-gray-200"
                >
                  <option value="">-- Chọn Phường / Xã --</option>
                  {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>

                <input value={newAddress.street} onChange={e => setNewAddress({ ...newAddress, street: e.target.value })} placeholder="Số nhà, tên đường" className="w-full border rounded px-3 py-2 text-sm" />

                <div className="text-right">
                  <button onClick={addNewAddress} className="hover-flip-btn px-6 py-2 rounded text-sm font-bold">LƯU ĐỊA CHỈ</button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => { setShowAddressModal(false); setShowNewAddressForm(false); }} className="px-4 py-2 border rounded text-sm font-bold hover:bg-gray-50">HỦY</button>
              <button onClick={confirmAddressSelection} className="py-2 px-6 hover-flip-btn rounded text-sm font-bold">XÁC NHẬN CHỌN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;