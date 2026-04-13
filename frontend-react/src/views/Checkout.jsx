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

  const [newAddress, setNewAddress] = useState({ fullName: '', phone: '', street: '', ward: '', district: '', city: '' });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrOrderId, setQrOrderId] = useState(null);

  const [vouchers, setVouchers] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
  const formatAddress = (addr) => {
    if (!addr.street) return '';
    return `${addr.street}, ${addr.ward}, ${addr.district}, ${addr.city}`;
  };

  // ✅ ĐÃ SỬA: Ưu tiên cộng giá đã giảm
  const subTotal = useMemo(() => cart.reduce((sum, item) => {
    const currentPrice = item.book.discountedPrice || item.book.price;
    return sum + currentPrice * item.quantity;
  }, 0), [cart]);

  const totalAmount = useMemo(() => {
    const total = subTotal + shippingFee - discountAmount;
    return total > 0 ? total : 0;
  }, [subTotal, shippingFee, discountAmount]);

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

        const resProvinces = await axios.get('https://provinces.open-api.vn/api/p/');
        setProvinces(resProvinces.data);

        const voucherRes = await axios.get('/api/vouchers/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVouchers(voucherRes.data);
      } catch (err) { console.error('Lỗi tải dữ liệu', err); }
    };
    loadData();
  }, [navigate, token]);

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

  const generateQR = (orderId) => {
    const BANK_ID = 'vietcombank';
    const ACCOUNT_NO = '1026325913';
    const TEMPLATE = 'compact2';
    const ACCOUNT_NAME = 'Tran Thieu Van';
    const url = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${totalAmount}&addInfo=TT DON HANG ${orderId}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
    setQrUrl(url);
    setQrOrderId(orderId);
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
      return Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ địa chỉ.', 'warning');
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

  const handleSelectVoucherFromModal = async (voucher) => {
    try {
      const res = await axios.post('/api/vouchers/apply', {
        code: voucher.code,
        orderTotal: subTotal
      }, { headers: { Authorization: `Bearer ${token}` } });

      setDiscountAmount(res.data.discountAmount);
      setAppliedVoucher(res.data.voucherCode);
      setShowVoucherModal(false);

      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `Đã áp dụng mã ${res.data.voucherCode}`,
        showConfirmButton: false, timer: 2000
      });
    } catch (err) {
      Swal.fire('Thất bại', err.response?.data?.message || 'Mã giảm giá không hợp lệ', 'error');
    }
  };

  const handleRemoveVoucher = (e) => {
    e.stopPropagation();
    setDiscountAmount(0);
    setAppliedVoucher(null);
  };

  const submitOrder = async () => {
    if (!form.fullName || !form.phone || !form.street) {
      return Swal.fire('Thiếu thông tin', 'Vui lòng chọn hoặc thêm địa chỉ giao hàng.', 'warning');
    }
    try {
      const res = await axios.post('/api/orders', {
        shippingAddress: form,
        items: cart.map(item => ({ book: item.book._id, quantity: item.quantity })),
        shippingFee, discountAmount, voucherCode: appliedVoucher, paymentMethod, totalAmount
      }, { headers: { Authorization: `Bearer ${token}` } });

      const orderId = res.data.order._id;
      if (paymentMethod === 'vnpay') {
        const vnpRes = await axios.post('/api/vnpay/create_payment_url', {
          amount: totalAmount, language: 'vn', bankCode: '', orderId
        });
        localStorage.removeItem('checkoutItems');
        if (vnpRes.data?.paymentUrl) window.location.href = vnpRes.data.paymentUrl;
      } else if (paymentMethod === 'transfer') {
        generateQR(orderId);
      } else {
        await Swal.fire('Thành công', 'Đơn hàng đã được đặt!', 'success');
        localStorage.removeItem('checkoutItems');
        navigate('/orders');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi đặt hàng', 'Không thể đặt hàng. Vui lòng thử lại sau.', 'error');
    }
  };

  const inputClass = "w-full border border-gray-200 focus:border-black outline-none px-4 py-3 text-sm transition-colors bg-white";
  const selectClass = "w-full border border-gray-200 focus:border-black outline-none px-4 py-3 text-sm bg-white transition-colors disabled:bg-stone-50 disabled:text-stone-600";

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-600 mb-1">Mua hàng</p>
          <h1 className="text-3xl font-bold text-black">Thanh Toán</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-[40%] flex flex-col gap-4">
            <div className="bg-white border border-gray-100 p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-5 pb-4 border-b border-gray-100">
                Sản phẩm đã chọn ({cart.length})
              </h2>
              {cart.length === 0 ? (
                <p className="text-stone-600 text-sm italic">Không có sản phẩm nào.</p>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => {
                    const imgSrc = item.book.image?.startsWith('http') ? item.book.image : `http://localhost:5000${item.book.image}`;
                    // ✅ ĐÃ SỬA: Lấy giá khuyến mãi
                    const currentPrice = item.book.discountedPrice || item.book.price;
                    return (
                      <div key={item.book._id} className="flex gap-3 items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                        <img src={imgSrc} className="w-12 h-16 object-cover flex-shrink-0" alt={item.book.title} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-black line-clamp-2 leading-snug">{item.book.title}</p>
                          <p className="text-xs text-stone-600 mt-0.5">x{item.quantity}</p>
                        </div>
                        {/* ✅ ĐÃ SỬA: Nhân với giá đã giảm */}
                        <p className="text-sm font-bold text-black flex-shrink-0 ml-2">
                          {formatPrice(currentPrice * item.quantity)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-4">Mã khuyến mãi</h2>
              <button onClick={() => setShowVoucherModal(true)} className={`w-full flex items-center justify-between p-3.5 border transition-colors duration-200 ${appliedVoucher ? 'border-black bg-black/5' : 'border-gray-200 hover:border-stone-400'}`}>
                <div className="flex items-center gap-3 select-none">
                  <FontAwesomeIcon icon={['fas', 'ticket-alt']} className={appliedVoucher ? 'text-black' : 'text-stone-300'} />
                  <span className={`text-sm font-medium ${appliedVoucher ? 'text-black' : 'text-stone-600'}`}>{appliedVoucher ? `Mã: ${appliedVoucher}` : 'Chọn mã khuyến mãi'}</span>
                </div>
                <div className="flex items-center gap-3">
                  {appliedVoucher && <span onClick={handleRemoveVoucher} className="text-s text-red-800 hover:text-red-500 font-bold">Bỏ</span>}
                  <FontAwesomeIcon icon={['fas', 'chevron-right']} className="text-stone-300 text-xs" />
                </div>
              </button>
            </div>

            <div className="bg-white border border-gray-100 p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-4 pb-3 border-b border-gray-100">Tổng cộng</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-stone-500">Tạm tính</span><span className="font-medium text-black">{formatPrice(subTotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-stone-500">Phí vận chuyển</span><span className="font-medium text-black">{formatPrice(shippingFee)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-stone-500">Giảm giá</span><span className="font-medium text-green-600">-{formatPrice(discountAmount)}</span></div>}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100"><span className="font-bold text-black">Tổng cộng</span><span className="text-2xl font-bold text-black">{formatPrice(totalAmount)}</span></div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[60%] flex flex-col gap-4">
            <div className="bg-white border border-gray-100 p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-5 pb-4 border-b border-gray-100">Địa chỉ giao hàng</h2>
              {form.fullName ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><p className="font-semibold text-sm text-black">{form.fullName}</p><span className="text-stone-300">·</span><p className="text-sm text-stone-500">{form.phone}</p></div>
                    <p className="text-sm text-stone-500">{formatAddress(form)}</p>
                  </div>
                  <button onClick={() => setShowAddressModal(true)} className="flex-shrink-0 text-xs px-4 py-2 hover-flip-btn select-none">Thay đổi</button>
                </div>
              ) : (
                <div className="text-center py-6"><p className="text-stone-600 text-sm mb-4">Bạn chưa có địa chỉ giao hàng</p><button onClick={() => { setShowAddressModal(true); setShowNewAddressForm(true); }} className="px-8 py-2.5 hover-flip-btn">Thêm địa chỉ</button></div>
              )}
            </div>

            <div className="bg-white border border-gray-100 p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-5 pb-4 border-b border-gray-100">Phương thức thanh toán</h2>
              <div className="space-y-3 select-none ">
                {[
                  { value: 'vnpay', label: 'Thanh toán qua VNPAY', sub: 'Thẻ ATM, Visa, Mastercard', icon: null, imgSrc: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-VNPAY-QR-1.png' },
                  { value: 'cod', label: 'Thanh toán khi nhận hàng', sub: 'COD · Nhận hàng trả tiền', icon: 'money-bill-wave', iconColor: 'text-green-500' },
                  { value: 'transfer', label: 'Chuyển khoản VietQR', sub: 'Quét mã QR ngân hàng', icon: 'qrcode', iconColor: 'text-blue-500' },
                ].map(method => (
                  <label key={method.value} className={`flex items-center gap-4 p-4 border cursor-pointer transition-all duration-200 ${paymentMethod === method.value ? 'border-black bg-stone-50' : 'border-gray-100 hover:border-stone-300'}`}>
                    <input type="radio" checked={paymentMethod === method.value} onChange={() => setPaymentMethod(method.value)} className="accent-black w-4 h-4" />
                    <div className="flex-1"><p className="text-sm font-semibold text-black">{method.label}</p><p className="text-xs text-stone-600 mt-0.5">{method.sub}</p></div>
                    {method.imgSrc && <img src={method.imgSrc} alt="VNPAY" className="h-5 object-contain" />}
                    {method.icon && <FontAwesomeIcon icon={['fas', method.icon]} className={`${method.iconColor} text-lg`} />}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={submitOrder} className="w-full py-4 hover-flip-btn uppercase tracking-widest font-bold text-sm select-none">{paymentMethod === 'cod' ? 'Xác nhận đặt hàng' : `Thanh toán · ${formatPrice(totalAmount)}`}</button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-end md:items-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md shadow-2xl relative flex flex-col max-h-[85vh] transition-all duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div><h3 className="text-sm font-bold uppercase tracking-widest text-black">Mã khuyến mãi</h3><p className="text-xs text-stone-600 mt-0.5">{vouchers.length} mã khả dụng</p></div>
              <button onClick={() => setShowVoucherModal(false)} className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-black transition-colors"><FontAwesomeIcon icon={['fas', 'xmark']} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 select-none">
              {vouchers.length === 0 ? (
                <div className="text-center py-12 text-stone-600"><FontAwesomeIcon icon={['fas', 'ticket-alt']} className="text-3xl text-stone-200 mb-3" /><p className="text-sm">Hiện không có mã giảm giá nào.</p></div>
              ) : (
                vouchers.map(v => {
                  const isEligible = subTotal >= v.minOrderValue;
                  return (
                    <div key={v._id} onClick={() => isEligible && handleSelectVoucherFromModal(v)} className={`border p-4 flex items-center gap-4 transition-all duration-200 relative ${isEligible ? 'cursor-pointer hover:border-black border-gray-200' : 'opacity-50 cursor-not-allowed border-gray-100 bg-stone-50'}`}>
                      <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 ${isEligible ? 'bg-black text-white' : 'bg-stone-200 text-stone-600'}`}><FontAwesomeIcon icon={['fas', 'ticket-alt']} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black tracking-wide">{v.code}</p>
                        <p className="text-sm font-semibold text-stone-600 mt-0.5">Giảm {v.discountType === 'fixed' ? formatPrice(v.discountValue) : `${v.discountValue}%`} {v.discountType === 'percent' && v.maxDiscountAmount ? ` (Tối đa ${formatPrice(v.maxDiscountAmount)})` : ''}</p>
                        <p className="text-xs text-stone-600 mt-1">Đơn tối thiểu {formatPrice(v.minOrderValue)}</p>
                      </div>
                      <div className="flex-shrink-0">{appliedVoucher === v.code ? <FontAwesomeIcon icon={['fas', 'check-circle']} className="text-black text-xl" /> : <div className={`w-5 h-5 rounded-full border-2 ${isEligible ? 'border-stone-300' : 'border-stone-200'}`} />}</div>
                      {!isEligible && <div className="absolute top-2 right-2 text-[10px] text-red-400 bg-red-50 px-2 py-0.5 border border-red-100">Chưa đủ điều kiện</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm shadow-2xl relative">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-sm font-bold uppercase tracking-widest text-black">Quét mã VietQR</h3><button onClick={() => setShowQRModal(false)} className="text-stone-600 hover:text-black transition-colors"><FontAwesomeIcon icon={['fas', 'xmark']} /></button></div>
            <div className="p-6 space-y-4 text-center">
              <p className="text-xs text-stone-600">Dùng App ngân hàng để quét mã và thanh toán tự động</p>
              <div className="bg-stone-50 p-3 border border-gray-100"><img src={qrUrl} alt="VietQR" className="w-full h-auto mx-auto" /></div>
              <div className="bg-stone-50 p-4 text-left space-y-2 text-sm border border-gray-100">
                <div className="flex justify-between"><span className="text-stone-600">Số tiền</span><span className="font-bold text-black">{formatPrice(totalAmount)}</span></div>
                <p className="text-xs text-stone-600">Nội dung chuyển khoản đã tích hợp trong mã QR.</p>
              </div>
              <button onClick={async () => {
                try { if (qrOrderId) await axios.put(`/api/orders/${qrOrderId}/pay`, {}, { headers: { Authorization: `Bearer ${token}` } }); } catch (err) { console.error('Lỗi thanh toán:', err); } finally { localStorage.removeItem('checkoutItems'); navigate('/orders'); }
              }} className="w-full py-3 hover-flip-btn">Tôi đã chuyển khoản xong</button>
            </div>
          </div>
        </div>
      )}

      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white"><h3 className="text-sm font-bold uppercase tracking-widest text-black">Địa chỉ giao hàng</h3><button onClick={() => { setShowAddressModal(false); setShowNewAddressForm(false); }} className="text-stone-600 hover:text-black transition-colors"><FontAwesomeIcon icon={['fas', 'xmark']} /></button></div>
            <div className="p-5 space-y-4">
              {addresses.length > 0 && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto select-none">
                  {addresses.map(addr => (
                    <div key={addr._id} onClick={() => setTempSelectedAddressId(addr._id)} className={`flex gap-3 p-4 border cursor-pointer transition-all duration-200 ${tempSelectedAddressId === addr._id ? 'border-black bg-stone-50' : 'border-gray-100 hover:border-stone-300'}`}>
                      <div className="mt-0.5"><div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tempSelectedAddressId === addr._id ? 'border-black' : 'border-stone-300'}`}>{tempSelectedAddressId === addr._id && <div className="w-2 h-2 rounded-full bg-black" />}</div></div>
                      <div className="text-sm"><p className="font-semibold text-black">{addr.fullName} · {addr.phone}</p><p className="text-stone-500 text-xs mt-0.5">{formatAddress(addr)}</p></div>
                    </div>
                  ))}
                </div>
              )}
              {!showNewAddressForm && <button onClick={() => setShowNewAddressForm(true)} className="text-sm text-black font-semibold hover:underline flex items-center gap-2 select-none"><FontAwesomeIcon icon={['fas', 'plus']} className="text-xs" /> Thêm địa chỉ mới</button>}
              {showNewAddressForm && (
                <div className="border border-gray-100 p-4 bg-stone-50 space-y-3 relative select-none">
                  <div className="flex items-center justify-between mb-1"><h4 className="text-xs font-bold uppercase tracking-widest text-stone-600">Địa chỉ mới</h4><button onClick={() => setShowNewAddressForm(false)} className="text-stone-600 hover:text-black transition-colors"><FontAwesomeIcon icon={['fas', 'xmark']} /></button></div>
                  <div className="grid grid-cols-2 gap-3"><input value={newAddress.fullName} onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })} placeholder="Họ và tên" className={inputClass} /><input value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} placeholder="Số điện thoại" className={inputClass} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <select onChange={handleProvinceChange} className={selectClass}><option value="">Tỉnh / Thành phố</option>{provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select>
                    <select onChange={handleDistrictChange} disabled={!districts.length} className={selectClass}><option value="">Quận / Huyện</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select>
                    <select onChange={e => setNewAddress({ ...newAddress, ward: wards.find(w => w.code == e.target.value)?.name })} disabled={!wards.length} className={selectClass}><option value="">Phường / Xã</option>{wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}</select>
                  </div>
                  <input value={newAddress.street} onChange={e => setNewAddress({ ...newAddress, street: e.target.value })} placeholder="Số nhà, tên đường" className={inputClass} />
                  <div className="text-right"><button onClick={addNewAddress} className="px-6 py-2.5 hover-flip-btn text-sm">Lưu địa chỉ</button></div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 select-none"><button onClick={() => { setShowAddressModal(false); setShowNewAddressForm(false); }} className="px-5 py-2.5 border border-gray-200 text-sm text-stone-600 hover:border-stone-400 transition-colors">Huỷ</button><button onClick={confirmAddressSelection} className="px-6 py-2.5 hover-flip-btn text-sm">Xác nhận</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;