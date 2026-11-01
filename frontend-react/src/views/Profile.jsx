import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Swal from 'sweetalert2';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { apiUrl } from '../config/api';
import { imageUrl as getImageUrl } from '../config/api';
// ── RANK CONFIG (Màu sắc bắt mắt, rực rỡ, không dùng gradient) ─────────
const RANK_CONFIG = {
  'Khách hàng': { label: 'Customer', icon: ['fas', 'user'], bgClass: 'bg-stone-800', textColor: 'text-stone-600' },
  'Bạc': { label: 'Silver', icon: ['fas', 'medal'], bgClass: 'bg-gray-400', textColor: 'text-gray-500' },
  'Vàng': { label: 'Gold', icon: ['fas', 'star'], bgClass: 'bg-amber-500', textColor: 'text-amber-500' },
  'Bạch kim': { label: 'Platinum', icon: ['fas', 'crown'], bgClass: 'bg-violet-600', textColor: 'text-violet-600' },
  'Kim cương': { label: 'Diamond', icon: ['fas', 'gem'], bgClass: 'bg-cyan-500', textColor: 'text-cyan-600' },
};

const Profile = () => {
  const location = useLocation();
  const [tab, setTab] = useState('security');
  const { setUser: setAuthUser } = useAuthStore();

  const [user, setUser] = useState({ name: '', email: '', avatar: '', rank: 'Khách hàng' });
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

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

  // ── INIT DATA ──
  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
  }, [location.state]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUser = await axios.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        setUser(resUser.data);
        setNameInput(resUser.data.name);
        setNewEmail(resUser.data.email);
        fetchAddresses();
        fetchVouchers();
      } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    if (tab !== 'address' || !showAddressForm || provinces.length > 0) return;

    const controller = new AbortController();
    axios.get('https://provinces.open-api.vn/api/p/', { signal: controller.signal })
      .then(res => setProvinces(res.data))
      .catch(error => {
        if (!controller.signal.aborted) console.error('Lỗi tải danh sách tỉnh thành:', error);
      });

    return () => controller.abort();
  }, [tab, showAddressForm, provinces.length]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // ── DATA FETCHERS ──
  const fetchAddresses = async () => {
    try {
      const resAddr = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
      setAddresses(resAddr.data);
    } catch (error) { console.error(error); }
  };

  const fetchVouchers = async () => {
    try {
      const resVouchers = await axios.get(apiUrl('/api/vouchers/active'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVouchers(resVouchers.data);
    } catch (error) { console.error('Lỗi tải mã giảm giá', error); }
  };

  // ── HANDLERS: ADDRESSES ──
  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    const name = provinces.find(p => p.code == code)?.name;
    setAddressForm({ ...addressForm, city: name, district: '', ward: '' });
    setWards([]);
    if (code) {
      const res = await axios.get(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
      setDistricts(res.data.districts);
    }
  };

  const handleDistrictChange = async (e) => {
    const code = e.target.value;
    const name = districts.find(d => d.code == code)?.name;
    setAddressForm({ ...addressForm, district: name, ward: '' });
    if (code) {
      const res = await axios.get(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
      setWards(res.data.wards);
    }
  };

  const saveAddress = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.street || !addressForm.ward || !addressForm.district || !addressForm.city) {
      return Swal.fire({ title: 'Missing information', text: 'Complete all address fields.', icon: 'warning', confirmButtonColor: '#000' });
    }
    try {
      if (isEditing) {
        await axios.put(`/api/addresses/${currentAddressId}`, addressForm, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/addresses', addressForm, { headers: { Authorization: `Bearer ${token}` } });
      }
      fetchAddresses();
      resetAddressForm();
      Swal.fire({ title: 'Saved', text: 'Your address has been saved.', icon: 'success', confirmButtonColor: '#000' });
    } catch { Swal.fire('Error', 'Could not save the address.', 'error'); }
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

  // ── HANDLERS: USER INFO ──
  const changePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = form;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage('Complete all password fields.');
      setPwMessageClass('text-red-500');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage('The new passwords do not match.');
      setPwMessageClass('text-red-500');
      return;
    }
    try {
      const res = await axios.put('/api/users/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPwMessage('Password updated successfully.');
        setPwMessageClass('text-green-600');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPwMessage('Could not update your password. Please try again.');
      setPwMessageClass('text-red-500');
    }
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
    } catch { Swal.fire('Error', 'Could not update your photo.', 'error'); }
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
    } catch { Swal.fire('Error', 'Could not update your name.', 'error'); }
  };

  // ── CONSTANTS & RENDER HELPERS ──
  const inputClass = "w-full border border-gray-200 bg-stone-50 px-4 py-3 text-sm md:text-base outline-none focus:border-black focus:bg-white transition-all rounded-none";
  const btnClass = "px-6 py-3 bg-black text-white text-sm md:text-base font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors w-full md:w-auto text-center rounded-none";

  const tabs = [
    { id: 'security', label: 'Security', icon: 'lock' },
    { id: 'address', label: 'Addresses', icon: 'map-marker-alt' },
    { id: 'vouchers', label: 'Vouchers', icon: 'ticket-alt' },
  ];

  const rank = user.rank || 'Khách hàng';
  const rankCfg = RANK_CONFIG[rank] ?? RANK_CONFIG['Khách hàng'];

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ══ HERO CARD (MINIMALIST) ════════════════════════════════════ */}
        <div className="bg-white border border-gray-200">
          {/* Banner */}
          <div className={`w-full h-16 md:h-20 ${rankCfg.bgClass} flex items-center justify-end px-6 md:px-8`}>
            <div className="flex items-center gap-2 text-white px-4 py-1.5 border border-white/30 backdrop-blur-sm">
              <FontAwesomeIcon icon={rankCfg.icon} className="text-sm md:text-base" />
              <span className="text-xs md:text-sm font-bold tracking-[0.2em] uppercase">
                {rankCfg.label}
              </span>
            </div>
          </div>

          {/* User Info & Stats */}
          <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8 -mt-10 md:-mt-12 relative z-10">

            {/* Left: Avatar + Name */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 md:gap-6">
              <div className="relative shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white border border-gray-200 p-1">
                  <img
                    src={preview || getImageUrl(user.avatar || '/uploads/avatars/default-user.png')}
                    className="w-full h-full object-cover"
                    alt="Avatar"
                  />
                </div>
                <label className="absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 bg-black text-white flex items-center justify-center cursor-pointer hover:bg-stone-800 transition-colors border border-white">
                  <input type="file" onChange={onFileChange} className="hidden" accept="image/*" />
                  <FontAwesomeIcon icon={['fas', 'pen']} className="text-xs md:text-sm" />
                </label>
              </div>

              <div className="pb-1 mt-2 sm:mt-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      className="text-lg md:text-xl font-bold text-black border-b-2 border-black outline-none bg-transparent w-44 md:w-56"
                    />
                    <button onClick={saveName} className="w-7 h-7 md:w-8 md:h-8 bg-black text-white flex items-center justify-center transition-colors">
                      <FontAwesomeIcon icon={['fas', 'check']} className="text-[10px] md:text-xs" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="w-7 h-7 md:w-8 md:h-8 border border-gray-300 text-stone-500 hover:text-black flex items-center justify-center transition-colors bg-white">
                      <FontAwesomeIcon icon={['fas', 'xmark']} className="text-[10px] md:text-xs" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <h1 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight">{user.name || '—'}</h1>
                    <button
                      onClick={() => setEditingName(true)}
                      className="w-7 h-7 bg-stone-100 text-stone-400 hover:bg-black hover:text-white flex items-center justify-center transition-colors border border-gray-200"
                    >
                      <FontAwesomeIcon icon={['fas', 'pen']} className="text-[10px]" />
                    </button>
                  </div>
                )}
                <p className="text-sm md:text-base text-stone-500 mt-1">{user.email}</p>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex gap-8 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8 text-center">
              <div>
                <p className="text-xl md:text-2xl font-black text-black">{addresses.length}</p>
                <p className="text-[10px] md:text-xs text-stone-400 uppercase tracking-[0.2em] mt-1">Addresses</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <p className="text-xl md:text-2xl font-black text-black">{vouchers.length}</p>
                <p className="text-[10px] md:text-xs text-stone-400 uppercase tracking-[0.2em] mt-1">Vouchers</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <p className="text-xl md:text-2xl font-black text-emerald-600"><FontAwesomeIcon icon={['fas', 'check']} className="text-lg md:text-xl" /></p>
                <p className="text-[10px] md:text-xs text-stone-400 uppercase tracking-[0.2em] mt-1">Status</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="bg-white border border-gray-200 p-6 md:p-8 min-h-[400px]">

          {/* TAB BAR (Minimalist) */}
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[120px] py-4 flex items-center justify-center gap-2 text-xs md:text-sm font-bold uppercase tracking-[0.15em] transition-colors border-b-2
                  ${tab === t.id ? 'border-black text-black' : 'border-transparent text-stone-400 hover:text-black hover:border-stone-300'}`}
              >
                <FontAwesomeIcon icon={['fas', t.icon]} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* TAB: SECURITY */}
          {tab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Email */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <FontAwesomeIcon icon={['fas', 'envelope']} className="text-stone-400 text-lg md:text-xl" />
                  <h2 className="text-base md:text-lg font-bold text-black uppercase tracking-wide">Update Email</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Current email</label>
                    <input value={user.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">New email</label>
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className={inputClass} placeholder="Enter your new email" />
                  </div>
                  <button className={btnClass}>Update email</button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-5 lg:border-l lg:border-gray-100 lg:pl-10">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <FontAwesomeIcon icon={['fas', 'lock']} className="text-stone-400 text-lg md:text-xl" />
                  <h2 className="text-base md:text-lg font-bold text-black uppercase tracking-wide">Change Password</h2>
                </div>
                <div className="space-y-4">
                  <input
                    value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                    type="password" placeholder="Current password" className={inputClass}
                  />
                  <input
                    value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })}
                    type="password" placeholder="New password" className={inputClass}
                  />
                  <div>
                    <input
                      value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      type="password" placeholder="Confirm new password"
                      className={`${inputClass} ${form.confirmPassword && form.newPassword !== form.confirmPassword ? 'border-red-400' : ''}`}
                    />
                    {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                      <p className="text-[10px] md:text-xs text-red-500 mt-1.5 font-bold uppercase tracking-widest">Passwords do not match</p>
                    )}
                  </div>
                  <button onClick={changePassword} className={btnClass}>Update password</button>
                  {pwMessage && <p className={`text-xs md:text-sm font-bold uppercase tracking-widest mt-2 ${pwMessageClass}`}>{pwMessage}</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADDRESSES */}
          {tab === 'address' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h2 className="text-base md:text-lg font-bold text-black uppercase tracking-wide">Saved addresses</h2>
                {!showAddressForm && (
                  <button onClick={() => setShowAddressForm(true)} className="px-5 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors text-xs md:text-sm font-bold uppercase tracking-widest">
                    + Add address
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <div className="bg-stone-50 border border-gray-200 p-6 md:p-8 space-y-5">
                  <p className="text-sm md:text-base font-bold text-black uppercase tracking-widest mb-2">{isEditing ? 'Edit address' : 'New address'}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="Full name" value={addressForm.fullName} onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })} className={inputClass} />
                    <input placeholder="Phone number" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} className={inputClass} />
                    <select onChange={handleProvinceChange} className={inputClass}><option value="">-- Province / City --</option>{provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select>
                    <select onChange={handleDistrictChange} disabled={!districts.length} className={inputClass}><option value="">-- District --</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select>
                    <select onChange={(e) => setAddressForm({ ...addressForm, ward: wards.find(w => w.code == e.target.value)?.name })} disabled={!wards.length} className={inputClass}><option value="">-- Ward --</option>{wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}</select>
                    <input placeholder="Street address" value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} className={inputClass} />
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button onClick={saveAddress} className="px-8 py-3 bg-black text-white text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors">Save</button>
                    <button onClick={resetAddressForm} className="px-8 py-3 border border-gray-300 text-stone-600 text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-stone-100 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {addresses.length > 0 ? addresses.map(addr => (
                    <div key={addr._id} className="flex flex-col sm:flex-row sm:items-start justify-between p-5 md:p-6 border border-gray-200 hover:border-black transition-colors group">
                      <div className="flex gap-4 items-start">
                        <FontAwesomeIcon icon={['fas', 'map-pin']} className="text-stone-300 text-sm md:text-base mt-1 shrink-0" />
                        <div>
                          <p className="font-bold text-black text-sm md:text-base tracking-wide">
                            {addr.fullName} <span className="text-stone-300 mx-2 font-normal">|</span> <span className="text-stone-500 font-medium">{addr.phone}</span>
                          </p>
                          <p className="text-xs md:text-sm text-stone-500 mt-2 leading-relaxed">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4 sm:mt-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editAddress(addr)} className="px-4 py-1.5 border border-gray-200 text-stone-600 hover:border-black hover:text-black transition-colors text-xs md:text-sm font-bold uppercase tracking-widest">Edit</button>
                        {!addr.isDefault && <button className="px-4 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-xs md:text-sm font-bold uppercase tracking-widest">Delete</button>}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 text-stone-400">
                      <FontAwesomeIcon icon={['fas', 'map']} className="text-4xl md:text-5xl mb-4 opacity-50" />
                      <p className="text-sm md:text-base font-medium">No saved addresses.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: VOUCHERS */}
          {tab === 'vouchers' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-base md:text-lg font-bold text-black uppercase tracking-wide">Your vouchers</h2>
              </div>

              {vouchers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {vouchers.map(v => (
                    <div key={v._id} className="flex border border-gray-200 hover:border-black transition-colors h-28 md:h-32 bg-white">
                      {/* Left: Giảm giá */}
                      <div className="w-24 md:w-32 bg-black text-white flex flex-col justify-center items-center shrink-0">
                        <span className="text-xl md:text-3xl font-black tracking-tighter">
                          {v.discountType === 'percent' ? `${v.discountValue}%` : `${v.discountValue / 1000}K`}
                        </span>
                        <span className="text-[9px] md:text-[10px] mt-1 opacity-60 uppercase tracking-[0.2em] font-bold">Off</span>
                      </div>

                      {/* Right: Info */}
                      <div className="flex-1 p-4 md:p-5 flex flex-col justify-center relative">
                        <div className="pr-16 md:pr-20">
                          <p className="font-bold text-black text-sm md:text-base tracking-widest uppercase">{v.code}</p>
                          <p className="text-xs md:text-sm text-stone-500 mt-1">Minimum order {v.minOrderValue?.toLocaleString('en-US')}₫</p>
                          {v.discountType === 'percent' && v.maxDiscountAmount && (
                            <p className="text-[10px] md:text-xs font-bold text-stone-600 mt-0.5">Maximum discount {v.maxDiscountAmount.toLocaleString('en-US')}₫</p>
                          )}
                        </div>
                        <p className="text-[9px] md:text-[10px] text-stone-400 mt-3 md:mt-4 uppercase tracking-widest font-bold">Expires: {new Date(v.expirationDate).toLocaleDateString('en-US')}</p>

                        <Link to='/cart' className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 px-3 py-1.5 md:px-4 md:py-2 bg-black text-white hover:bg-stone-800 transition-colors text-[10px] md:text-xs font-bold uppercase tracking-widest text-center">
                          Use
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-stone-400">
                  <FontAwesomeIcon icon={['fas', 'ticket']} className="text-4xl md:text-5xl mb-4 opacity-50" />
                  <p className="text-sm md:text-base font-medium">No vouchers are available right now.</p>
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