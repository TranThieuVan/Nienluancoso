import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Swal from 'sweetalert2';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const Profile = () => {
  const location = useLocation();
  const [tab, setTab] = useState('security');
  const { setUser: setAuthUser } = useAuthStore();

  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
  }, [location.state]);

  const [user, setUser] = useState({ name: '', email: '', avatar: '' });
  const [form, setForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const nameInputRef = useRef(null);

  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAddressId, setCurrentAddressId] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', street: '', ward: '', district: '', city: ''
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [preview, setPreview] = useState(null);
  const [pwMessage, setPwMessage] = useState('');
  const [pwMessageClass, setPwMessageClass] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUser = await axios.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        setUser(resUser.data);
        setNameInput(resUser.data.name);
        setNewEmail(resUser.data.email);
        fetchAddresses();
        fetchVouchers();
        const resProvinces = await axios.get('https://provinces.open-api.vn/api/p/');
        setProvinces(resProvinces.data);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Profile:', err);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const fetchAddresses = async () => {
    try {
      const resAddr = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
      setAddresses(resAddr.data);
    } catch (error) { console.error(error); }
  };

  const fetchVouchers = async () => {
    try {
      const t = localStorage.getItem('token');
      const resVouchers = await axios.get('http://localhost:5000/api/vouchers/active', {
        headers: { Authorization: `Bearer ${t}` }
      });
      setVouchers(resVouchers.data);
    } catch (error) { console.error('Lỗi tải mã giảm giá', error); }
  };

  const handleProvinceChange = async (e) => {
    const provinceCode = e.target.value;
    const provinceName = provinces.find(p => p.code == provinceCode)?.name;
    setAddressForm({ ...addressForm, city: provinceName, district: '', ward: '' });
    setWards([]);
    if (provinceCode) {
      const res = await axios.get(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
      setDistricts(res.data.districts);
    }
  };

  const handleDistrictChange = async (e) => {
    const districtCode = e.target.value;
    const districtName = districts.find(d => d.code == districtCode)?.name;
    setAddressForm({ ...addressForm, district: districtName, ward: '' });
    if (districtCode) {
      const res = await axios.get(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
      setWards(res.data.wards);
    }
  };

  const changePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = form;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage('Vui lòng nhập đầy đủ các trường mật khẩu');
      setPwMessageClass('text-red-500');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage('Mật khẩu mới và nhập lại không trùng khớp!');
      setPwMessageClass('text-red-500');
      return;
    }
    try {
      const res = await axios.put('/api/users/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPwMessage('Đổi mật khẩu thành công');
        setPwMessageClass('text-green-600');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPwMessage(err.response?.data?.msg || 'Lỗi đổi mật khẩu');
      setPwMessageClass('text-red-500');
    }
  };

  const saveAddress = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.street || !addressForm.ward || !addressForm.district || !addressForm.city) {
      return Swal.fire('Thông báo', 'Vui lòng điền đầy đủ thông tin địa chỉ', 'warning');
    }
    try {
      if (isEditing) {
        await axios.put(`/api/addresses/${currentAddressId}`, addressForm, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/addresses', addressForm, { headers: { Authorization: `Bearer ${token}` } });
      }
      fetchAddresses();
      resetAddressForm();
      Swal.fire('Thành công', 'Đã lưu địa chỉ', 'success');
    } catch (err) { Swal.fire('Lỗi', 'Không thể lưu địa chỉ', 'error'); }
  };

  const resetAddressForm = () => {
    setAddressForm({ fullName: '', phone: '', street: '', ward: '', district: '', city: '' });
    setIsEditing(false);
    setShowAddressForm(false);
  };

  const editAddress = (addr) => {
    setAddressForm({ fullName: addr.fullName, phone: addr.phone, street: addr.street, ward: addr.ward, district: addr.district, city: addr.city });
    setCurrentAddressId(addr._id);
    setIsEditing(true);
    setShowAddressForm(true);
  };

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append('name', user.name);
      formData.append('avatar', file);
      const res = await axios.put('/api/users/me', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data.user);
      setAuthUser(res.data.user);
    } catch (err) { Swal.fire('Lỗi', 'Không thể cập nhật ảnh', 'error'); }
  };

  const saveName = async () => {
    if (!nameInput.trim()) return;
    try {
      const formData = new FormData();
      formData.append('name', nameInput.trim());
      const res = await axios.put('/api/users/me', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data.user);
      setAuthUser(res.data.user);
      setEditingName(false);
    } catch (err) { Swal.fire('Lỗi', 'Không thể cập nhật tên', 'error'); }
  };

  const cancelEditName = () => {
    setNameInput(user.name);
    setEditingName(false);
  };


  const tabs = [
    { id: 'security', label: 'Bảo mật', icon: 'lock' },
    { id: 'address', label: 'Địa chỉ', icon: 'map-marker-alt' },
    { id: 'vouchers', label: 'Voucher', icon: 'ticket-alt' },
  ];

  const inputClass = "w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-black focus:bg-white transition-all";

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* ── HERO CARD ── */}
        <div className="relative bg-white overflow-hidden border border-gray-100">
          <div className="h-20 bg-black" />
          <div className="px-6 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-8">

              {/* Avatar + tên */}
              <div className="flex items-end gap-4">
                <div className="relative">
                  <img
                    src={preview || `http://localhost:5000/${user.avatar || 'uploads/avatars/default-user.png'}`}
                    className="w-24 h-24 object-cover border-4 border-white shadow-md"
                    alt="Avatar"
                  />
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-black border border-gray-200 flex items-center justify-center cursor-pointer transition">
                    <input type="file" onChange={onFileChange} className="hidden" accept="image/*" />
                    <FontAwesomeIcon icon={['fas', 'pen']} className="text-xs" />
                  </label>
                </div>

                <div className="mb-1">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={nameInputRef}
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                        className="text-lg font-bold text-gray-800 border-b-2 border-black outline-none bg-transparent w-44"
                      />
                      <button onClick={saveName} className="w-6 h-6 bg-stone-100 hover:bg-stone-200 text-black flex items-center justify-center transition border border-gray-200">
                        <FontAwesomeIcon icon={['fas', 'check']} className="text-[10px]" />
                      </button>
                      <button onClick={cancelEditName} className="w-6 h-6 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-black flex items-center justify-center transition border border-gray-200">
                        <FontAwesomeIcon icon={['fas', 'xmark']} className="text-[10px]" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h1 className="text-xl font-bold text-gray-800">{user.name || '—'}</h1>
                      <button
                        onClick={() => setEditingName(true)}
                        className="w-6 h-6 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-black flex items-center justify-center transition-all border border-gray-200"
                        title="Chỉnh sửa tên"
                      >
                        <FontAwesomeIcon icon={['fas', 'pen']} className="text-xs" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-5 text-center mb-1">
                <div>
                  <p className="text-lg font-bold text-black">{addresses.length}</p>
                  <p className="text-xs text-gray-400">Địa chỉ</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div>
                  <p className="text-lg font-bold text-black">{vouchers.length}</p>
                  <p className="text-xs text-gray-400">Voucher</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div>
                  <p className="text-lg font-bold text-green-500">Active</p>
                  <p className="text-xs text-gray-400">Trạng thái</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div className="bg-white border border-gray-100 p-1.5 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-all
                ${tab === t.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
            >
              <FontAwesomeIcon icon={['fas', t.icon]} className="text-xs" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div className="bg-white border border-gray-100 p-6 min-h-[380px]">

          {/* TAB: BẢO MẬT */}
          {tab === 'security' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-800">Bảo mật tài khoản</h2>
                <p className="text-xs text-gray-400 mt-0.5">Quản lý email và mật khẩu đăng nhập</p>
              </div>
              <hr className="border-gray-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Cột trái: Email */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-stone-100 flex items-center justify-center">
                      <FontAwesomeIcon icon={['fas', 'envelope']} className="text-stone-500 text-sm" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Cập nhật Email</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email hiện tại</label>
                      <input value={user.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email mới</label>
                      <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className={inputClass} placeholder="Nhập email mới" />
                    </div>
                    <button className="p-2 hover-flip-btn w-full">Cập nhật email</button>
                  </div>
                </div>

                {/* Cột phải: Mật khẩu */}
                <div className="space-y-4 md:border-l md:border-gray-100 md:pl-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-stone-100 flex items-center justify-center">
                      <FontAwesomeIcon icon={['fas', 'lock']} className="text-stone-500 text-sm" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Đổi mật khẩu</p>
                  </div>
                  <div className="space-y-3">
                    <input
                      value={form.currentPassword}
                      onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                      type="password"
                      placeholder="Mật khẩu hiện tại"
                      className={inputClass}
                    />
                    <input
                      value={form.newPassword}
                      onChange={e => setForm({ ...form, newPassword: e.target.value })}
                      type="password"
                      placeholder="Mật khẩu mới"
                      className={inputClass}
                    />
                    <div>
                      <input
                        value={form.confirmPassword}
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                        type="password"
                        placeholder="Nhập lại mật khẩu mới"
                        className={`${inputClass} ${form.confirmPassword && form.newPassword !== form.confirmPassword ? 'border-red-400' : ''}`}
                      />
                      {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Mật khẩu không khớp</p>
                      )}
                    </div>
                    <button onClick={changePassword} className="p-2 hover-flip-btn w-full">Đổi mật khẩu</button>
                    {pwMessage && <p className={`text-sm font-medium ${pwMessageClass}`}>{pwMessage}</p>}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: ĐỊA CHỈ */}
          {tab === 'address' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-gray-800">Địa chỉ giao hàng</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{addresses.length} địa chỉ đã lưu</p>
                </div>
                {!showAddressForm && (
                  <button onClick={() => setShowAddressForm(true)} className="p-2 hover-flip-btn">+ Thêm mới</button>
                )}
              </div>
              <hr className="border-gray-100" />

              {showAddressForm ? (
                <div className="bg-stone-50 border border-stone-200 p-5 space-y-4">
                  <p className="text-sm font-semibold text-gray-700">{isEditing ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="Họ và tên" value={addressForm.fullName} onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })} className={inputClass} />
                    <input placeholder="Số điện thoại" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} className={inputClass} />
                    <select onChange={handleProvinceChange} className={inputClass}><option value="">-- Tỉnh / Thành --</option>{provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select>
                    <select onChange={handleDistrictChange} disabled={!districts.length} className={inputClass}><option value="">-- Quận / Huyện --</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select>
                    <select onChange={(e) => setAddressForm({ ...addressForm, ward: wards.find(w => w.code == e.target.value)?.name })} disabled={!wards.length} className={inputClass}><option value="">-- Phường / Xã --</option>{wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}</select>
                    <input placeholder="Số nhà, tên đường" value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} className={inputClass} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveAddress} className="p-2 hover-flip-btn">Lưu</button>
                    <button onClick={resetAddressForm} className="p-2 hover-flip-btn">Hủy</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.length > 0 ? addresses.map(addr => (
                    <div key={addr._id} className="flex justify-between items-center p-4 border border-gray-100 hover:border-stone-400 hover:bg-stone-50 transition-all group">
                      <div className="flex gap-3 items-start">
                        <div className="w-9 h-9 bg-stone-100 flex items-center justify-center mt-0.5 shrink-0">
                          <FontAwesomeIcon icon={['fas', 'map-marker-alt']} className="text-stone-500 text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {addr.fullName} <span className="text-gray-300 mx-1">|</span>
                            <span className="font-normal text-gray-500">{addr.phone}</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                        <button onClick={() => editAddress(addr)} className="p-2 hover-flip-btn text-sm">Sửa</button>
                        {!addr.isDefault && <button className="p-2 hover-flip-btn text-sm">Xóa</button>}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-16 text-gray-300">
                      <FontAwesomeIcon icon={['fas', 'map-marker-alt']} className="text-5xl mb-3" />
                      <p className="text-sm text-gray-400">Chưa có địa chỉ nào</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: VOUCHER */}
          {tab === 'vouchers' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-800">Kho Voucher</h2>
                <p className="text-xs text-gray-400 mt-0.5">Các mã giảm giá đang có hiệu lực</p>
              </div>
              <hr className="border-gray-100" />

              {vouchers.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {vouchers.map(v => (
                    <div key={v._id} className="flex overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all h-24">
                      <div className="w-[88px] bg-black text-white flex flex-col justify-center items-center shrink-0 relative">
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white z-10" />
                        <span className="text-xl font-black leading-none">
                          {v.discountType === 'percent' ? `${v.discountValue}%` : `${v.discountValue / 1000}K`}
                        </span>
                        <span className="text-[9px] mt-1 opacity-60 uppercase tracking-widest">Giảm</span>
                      </div>
                      <div className="border-l border-dashed border-gray-200" />
                      <div className="flex-1 px-4 flex items-center justify-between bg-white">
                        <div>
                          <p className="font-bold text-gray-800 text-sm tracking-wide">{v.code}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Đơn tối thiểu {v.minOrderValue?.toLocaleString()}đ</p>
                          <p className="text-[10px] text-red-400 mt-0.5">HSD: {new Date(v.expirationDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <Link to='/cart' className="p-2 hover-flip-btn text-xs shrink-0 ml-2">
                          Dùng ngay
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <FontAwesomeIcon icon={['fas', 'ticket-alt']} className="text-5xl text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">Chưa có voucher nào</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;