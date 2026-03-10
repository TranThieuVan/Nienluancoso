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

  // ✅ STATE CHO VOUCHER
  const [vouchers, setVouchers] = useState([]); // Chứa danh sách voucher từ API
  const [showVoucherModal, setShowVoucherModal] = useState(false); // Đóng/mở bảng chọn voucher
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
  const formatAddress = (addr) => {
    if (!addr.street) return "";
    return `${addr.street}, ${addr.ward}, ${addr.district}, ${addr.city}`;
  };

  const subTotal = useMemo(() => cart.reduce((sum, item) => sum + item.book.price * item.quantity, 0), [cart]);

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

        // ✅ TẢI DANH SÁCH VOUCHER ĐANG HOẠT ĐỘNG
        const voucherRes = await axios.get('/api/vouchers/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVouchers(voucherRes.data);

      } catch (err) {
        console.error('Lỗi tải dữ liệu', err);
      }
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

  // ✅ CHỌN MÃ TỪ MODAL VÀ GỌI API KIỂM TRA
  const handleSelectVoucherFromModal = async (voucher) => {
    try {
      const res = await axios.post('/api/vouchers/apply', {
        code: voucher.code,
        orderTotal: subTotal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDiscountAmount(res.data.discountAmount);
      setAppliedVoucher(res.data.voucherCode);
      setShowVoucherModal(false); // Đóng modal sau khi chọn thành công

      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `Đã áp dụng mã ${res.data.voucherCode}`,
        showConfirmButton: false, timer: 2000
      });
    } catch (err) {
      Swal.fire('Thất bại', err.response?.data?.message || 'Mã giảm giá không hợp lệ', 'error');
    }
  };

  // ✅ GỠ BỎ MÃ GIẢM GIÁ
  const handleRemoveVoucher = (e) => {
    e.stopPropagation(); // Ngăn sự kiện click mở modal
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
        shippingFee,
        discountAmount,
        voucherCode: appliedVoucher,
        paymentMethod,
        totalAmount
      }, { headers: { Authorization: `Bearer ${token}` } });

      const orderId = res.data.order._id;
      if (paymentMethod === 'vnpay') {
        const vnpRes = await axios.post('/api/vnpay/create_payment_url', {
          amount: totalAmount,
          language: 'vn',
          bankCode: '',
          orderId: orderId
        });

        localStorage.removeItem('checkoutItems');
        if (vnpRes.data && vnpRes.data.paymentUrl) {
          window.location.href = vnpRes.data.paymentUrl;
        }
      }
      else if (paymentMethod === 'transfer') {
        generateQR(orderId);
      }
      else {
        await Swal.fire('Thành công', 'Đơn hàng đã được đặt!', 'success');
        localStorage.removeItem('checkoutItems');
        navigate('/orders');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi đặt hàng', 'Không thể đặt hàng. Vui lòng thử lại sau.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6 items-start min-h-screen mt-6">
      {/* CỘT TRÁI - DANH SÁCH SẢN PHẨM & VOUCHER */}
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

            {/* ✅ KHU VỰC VOUCHER REDESIGN NHƯ SHOPEE */}
            <div className="py-5 border-b">
              <h3 className="text-base font-bold text-gray-800 mb-3">Mã khuyến mãi</h3>
              <div
                className={`flex items-center justify-between border ${appliedVoucher ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-gray-50'} rounded-lg p-3 cursor-pointer transition-colors`}
                onClick={() => setShowVoucherModal(true)}
              >
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={['fas', 'ticket-alt']} className={`${appliedVoucher ? 'text-green-600' : 'text-gray-500'} text-lg`} />
                  <span className={`text-sm font-semibold ${appliedVoucher ? 'text-green-700' : 'text-gray-700'}`}>
                    {appliedVoucher ? `Đã chọn mã: ${appliedVoucher}` : 'Chọn mã'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {appliedVoucher && (
                    <button
                      onClick={handleRemoveVoucher}
                      className="text-xs text-red-500 font-bold hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  )}
                  <FontAwesomeIcon icon={['fas', 'chevron-right']} className="text-gray-400 text-sm" />
                </div>
              </div>
            </div>

            {/* TỔNG KẾT TIỀN */}
            <div className="pt-4 space-y-1 text-right font-medium text-gray-800 text-sm">
              <p className="flex justify-between"><span>Tổng giá sách:</span> <span>{formatPrice(subTotal)}</span></p>
              <p className="flex justify-between"><span>Phí vận chuyển:</span> <span>{formatPrice(shippingFee)}</span></p>

              {discountAmount > 0 && (
                <p className="flex justify-between text-green-600 font-bold">
                  <span>Giảm giá Voucher:</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </p>
              )}

              <p className="text-lg font-bold pt-2 border-t mt-2 flex justify-between items-center">
                <span>Tổng cộng:</span>
                <span className="text-red-600 text-2xl">{formatPrice(totalAmount)}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic">Không có sản phẩm nào được chọn.</div>
        )}
      </div>

      {/* CỘT PHẢI - THANH TOÁN */}
      <div className="md:w-3/5 w-full space-y-6 sticky top-[80px]">
        {/* ... (Đoạn Cột phải KHÔNG ĐỔI gì cả, giữ nguyên code y hệt phần Address và Payment Method) ... */}
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
            <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${paymentMethod === 'vnpay' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} className="w-4 h-4" />
              <div className="flex-1 text-sm font-semibold text-gray-800">Thanh toán qua VNPAY (Thẻ ATM, Visa...)</div>
              <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-VNPAY-QR-1.png" alt="VNPAY" className="h-4 object-contain" />
            </label>

            <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-4 h-4" />
              <div className="flex-1 text-sm font-semibold text-gray-800">Thanh toán khi nhận hàng (COD)</div>
              <FontAwesomeIcon icon={['fas', 'money-bill-wave']} className="text-green-600" />
            </label>

            <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${paymentMethod === 'transfer' ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} className="w-4 h-4" />
              <div className="flex-1 text-sm font-semibold text-gray-800">Chuyển khoản VietQR (Thủ công)</div>
              <FontAwesomeIcon icon={['fas', 'qrcode']} className="text-blue-600" />
            </label>
          </div>
        </div>

        <div className="text-right pt-4">
          <button onClick={submitOrder} className="py-3 px-6 font-bold hover-flip-btn transition rounded uppercase tracking-wide w-full text-lg shadow-lg bg-black text-white hover:bg-gray-800">
            {paymentMethod === 'cod' ? 'XÁC NHẬN ĐẶT HÀNG' : `THANH TOÁN ${formatPrice(totalAmount)}`}
          </button>
        </div>
      </div>

      {/* ✅ MODAL HIỂN THỊ DANH SÁCH MÃ GIẢM GIÁ */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-end md:items-center z-[110] p-4 transition-all">
          <div className="bg-white w-full max-w-md rounded-t-xl md:rounded-xl shadow-2xl relative flex flex-col max-h-[85vh] animate-in slide-in-from-bottom md:zoom-in">
            {/* Header Modal */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-800">Chọn mã khuyến mãi</h3>
              <button onClick={() => setShowVoucherModal(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">✕</button>
            </div>

            {/* Danh sách Voucher */}
            <div className="p-4 overflow-y-auto space-y-4">
              {vouchers.length === 0 ? (
                <div className="text-center py-10 text-gray-500 italic">Hiện không có mã giảm giá nào.</div>
              ) : (
                vouchers.map(v => {
                  const isEligible = subTotal >= v.minOrderValue; // Kiểm tra điều kiện đơn tối thiểu

                  return (
                    <div
                      key={v._id}
                      onClick={() => isEligible && handleSelectVoucherFromModal(v)}
                      className={`relative border rounded-lg p-4 flex items-center justify-between transition-all ${isEligible ? 'cursor-pointer hover:border-blue-500 border-gray-200 bg-white shadow-sm' : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'}`}
                    >
                      {/* Cột trái: Icon */}
                      <div className={`w-12 h-12 flex justify-center items-center rounded-full mr-4 ${isEligible ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                        <FontAwesomeIcon icon={['fas', 'ticket-alt']} className="text-xl" />
                      </div>

                      {/* Cột giữa: Thông tin */}
                      <div className="flex-1">
                        <p className={`font-black uppercase tracking-wide text-sm ${isEligible ? 'text-gray-800' : 'text-gray-500'}`}>{v.code}</p>
                        <p className="text-sm font-semibold text-red-600 mt-0.5">
                          Giảm {v.discountType === 'fixed' ? formatPrice(v.discountValue) : `${v.discountValue}%`}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Đơn tối thiểu {formatPrice(v.minOrderValue)}
                        </p>
                      </div>

                      {/* Cột phải: Trạng thái chọn */}
                      <div className="ml-2">
                        {appliedVoucher === v.code ? (
                          <FontAwesomeIcon icon={['fas', 'check-circle']} className="text-blue-600 text-2xl" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 ${isEligible ? 'border-gray-300' : 'border-gray-300'}`}></div>
                        )}
                      </div>

                      {/* Lớp phủ báo lỗi nếu không đủ điều kiện */}
                      {!isEligible && (
                        <div className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded">
                          Chưa đủ điều kiện
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CÁC MODALS (Address, QR) GIỮ NGUYÊN */}

      {/* 1. MODAL QUÉT MÁ QR */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center space-y-4 relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-2 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-gray-800 pt-2">Quét mã VietQR</h3>
            <p className="text-xs text-gray-500 italic">
              Dùng App Ngân hàng quét để tự động nhập tiền & nội dung
            </p>

            <div className="bg-white p-2 border-2 border-gray-100 rounded shadow-inner">
              <img src={qrUrl} alt="VietQR" className="w-full h-auto mx-auto" />
            </div>

            <div className="text-left bg-gray-50 p-3 rounded text-sm space-y-1 border">
              <p>
                <strong>Số tiền:</strong>{' '}
                <span className="text-red-600 font-bold">{formatPrice(totalAmount)}</span>
              </p>
              <p className="text-[11px] text-gray-500">Nội dung đã tích hợp sẵn trong mã QR.</p>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('checkoutItems');
                navigate('/orders');
              }}
              className="w-full py-2 hover-flip-btn rounded font-bold"
            >
              TÔI ĐÃ CHUYỂN KHOẢN XONG
            </button>
          </div>
        </div>
      )}

      {/* 2. MODAL CHỌN ĐỊA CHỈ GIAO HÀNG */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-lg p-6 shadow-xl space-y-4 relative overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-2">Chọn địa chỉ giao hàng</h3>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
              {addresses.length > 0 ? (
                addresses.map(addr => (
                  <div
                    key={addr._id}
                    className={`flex items-start gap-3 p-3 border rounded cursor-pointer ${tempSelectedAddressId === addr._id ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200'
                      }`}
                    onClick={() => setTempSelectedAddressId(addr._id)}
                  >
                    <input
                      type="radio"
                      checked={tempSelectedAddressId === addr._id}
                      readOnly
                      className="mt-1"
                    />
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
              <button
                onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                className="text-right text-black hover:underline text-sm font-bold"
              >
                {showNewAddressForm ? "" : "Thêm địa chỉ mới"}
              </button>
            </div>

            {/* FORM THÊM ĐỊA CHỈ MỚI */}
            {/* LƯU Ý: NHỚ XÓA CÁI NÚT "Thêm địa chỉ mới / X" CŨ Ở BÊN NGOÀI ĐI NHÉ */}
            {showNewAddressForm && (
              <div className="relative flex flex-col gap-3 mt-3 bg-gray-50 p-5 rounded border">
                {/* Dấu X góc phải */}
                <button
                  onClick={() => setShowNewAddressForm(false)}
                  className="absolute top-2 right-3 text-gray-400 hover:text-black font-black text-lg transition-colors"
                >
                  ✕
                </button>

                <h4 className="font-bold text-gray-700 text-sm mb-1">Thêm địa chỉ giao hàng mới</h4>

                {/* Hàng 1: Họ tên và SĐT (Chia 2 cột) */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={newAddress.fullName}
                    onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })}
                    placeholder="Họ và tên"
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    value={newAddress.phone}
                    onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                    placeholder="Số điện thoại"
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Hàng 2: Tỉnh/Thành, Quận/Huyện, Phường/Xã (Chia 3 cột) */}
                <div className="grid grid-cols-3 gap-3">
                  <select
                    onChange={handleProvinceChange}
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">-- Tỉnh / Thành phố --</option>
                    {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>

                  <select
                    onChange={handleDistrictChange}
                    disabled={!districts.length}
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-200 bg-white"
                  >
                    <option value="">-- Quận / Huyện --</option>
                    {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>

                  <select
                    onChange={(e) => setNewAddress({ ...newAddress, ward: wards.find(w => w.code == e.target.value)?.name })}
                    disabled={!wards.length}
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-200 bg-white"
                  >
                    <option value="">-- Phường / Xã --</option>
                    {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                  </select>
                </div>

                {/* Hàng 3: Số nhà, tên đường (Full chiều ngang) */}
                <input
                  value={newAddress.street}
                  onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
                  placeholder="Số nhà, tên đường"
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                />

                {/* Nút lưu */}
                <div className="text-right mt-1">
                  <button
                    onClick={addNewAddress}
                    className="hover-flip-btn px-6 py-2 rounded text-sm font-bold bg-black text-white hover:bg-gray-800 transition-colors"
                  >
                    LƯU ĐỊA CHỈ
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setShowNewAddressForm(false);
                }}
                className="px-4 py-2 border rounded text-sm font-bold hover:bg-gray-50"
              >
                HỦY
              </button>
              <button
                onClick={confirmAddressSelection}
                className="py-2 px-6 hover-flip-btn rounded text-sm font-bold"
              >
                XÁC NHẬN CHỌN
              </button>
            </div>
          </div>
        </div>
      )}    </div>
  );
};

export default Checkout;