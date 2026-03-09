import { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Swal from 'sweetalert2';

const Profile = () => {
  const [tab, setTab] = useState('info');
  const [user, setUser] = useState({ name: '', email: '', avatar: '' });
  const [form, setForm] = useState({
    name: '', email: '',
    currentPassword: '', newPassword: '', confirmPassword: '', // ✅ Thêm confirmPassword
    avatar: null
  });

  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAddressId, setCurrentAddressId] = useState(null);

  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', street: '', ward: '', district: '', city: ''
  });

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [messageClass, setMessageClass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  const token = localStorage.getItem('token');
  const activeClass = 'bg-blue-100 font-semibold p-2 rounded cursor-pointer';
  const inactiveClass = 'p-2 rounded cursor-pointer hover:bg-gray-100';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUser = await axios.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        setUser(resUser.data);
        setForm(f => ({ ...f, name: resUser.data.name, email: resUser.data.email }));
        setNewEmail(resUser.data.email);
        fetchAddresses();
        const resProvinces = await axios.get('https://provinces.open-api.vn/api/p/');
        setProvinces(resProvinces.data);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Profile:', err);
      }
    };
    fetchData();
  }, [token]);

  const fetchAddresses = async () => {
    try {
      const resAddr = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
      setAddresses(resAddr.data);
    } catch (error) { console.error(error); }
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

    // ✅ Kiểm tra tính hợp lệ của mật khẩu mới
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Vui lòng nhập đầy đủ các trường mật khẩu');
      setMessageClass('text-red-600');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu mới và nhập lại mật khẩu không trùng khớp!');
      setMessageClass('text-red-600');
      return;
    }

    try {
      const res = await axios.put('/api/users/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage('Đổi mật khẩu thành công');
        setMessageClass('text-green-600');
        setForm({ ...form, currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Lỗi đổi mật khẩu');
      setMessageClass('text-red-600');
    }
  };

  const saveAddress = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.street || !addressForm.ward || !addressForm.district || !addressForm.city) {
      return Swal.fire('Thông báo', 'Vui lòng điền đầy đủ thông tin địa chỉ thực tế', 'warning');
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

  // Các hàm khác giữ nguyên...
  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setPreview(URL.createObjectURL(file)); setForm({ ...form, avatar: file }); }
  };

  const updateProfile = async () => {
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      if (form.avatar) formData.append('avatar', form.avatar);
      const res = await axios.put('/api/users/me', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data.user);
      Swal.fire('Thành công', 'Cập nhật thành công', 'success').then(() => window.location.reload());
    } catch (err) { Swal.fire('Lỗi', 'Thất bại', 'error'); }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 max-w-7xl mx-auto mt-6">
      <div className="w-full md:w-1/4 bg-white rounded-xl shadow p-4 space-y-2 h-fit">
        <div className={tab === 'info' ? activeClass : inactiveClass} onClick={() => setTab('info')}>Thông tin của tôi</div>
        <div className={tab === 'security' ? activeClass : inactiveClass} onClick={() => setTab('security')}>Email và mật khẩu</div>
        <div className={tab === 'address' ? activeClass : inactiveClass} onClick={() => setTab('address')}>Địa chỉ giao hàng</div>
      </div>

      <div className="w-full md:w-3/4 bg-white rounded-xl shadow p-6 min-h-[500px]">
        {tab === 'info' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Cập nhật thông tin</h2>
            <div className="flex items-center gap-4">
              <img src={preview || `http://localhost:5000/${user.avatar || 'uploads/avatars/default-user.png'}`} className="w-24 h-24 rounded-full object-cover border" alt="Avatar" />
              <input type="file" onChange={onFileChange} />
            </div>
            <div>
              <label className="font-medium block mb-1">Tên người dùng</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2 outline-none" type="text" />
            </div>
            <button onClick={updateProfile} className="hover-flip-btn px-10 py-2 ">Lưu thay đổi</button>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-800">Bảo mật tài khoản</h2>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={['fas', 'envelope']} className="text-red-500 text-xl" />
                <span className="text-xl font-semibold text-gray-800">{user.email}</span>
              </div>
              <label className="block text-sm font-medium text-gray-700">Email mới</label>
              <div className="flex gap-2">
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="flex-1 border border-gray-300 rounded p-2" />
                <button className="hover-flip-btn px-10 py-2 ">Cập nhật</button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-bold text-gray-700">Thay đổi mật khẩu</h3>
              <input value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} type="password" placeholder="Mật khẩu hiện tại" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} type="password" placeholder="Mật khẩu mới" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" />
              {/* ✅ Trường nhập lại mật khẩu mới */}
              <input value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} type="password" placeholder="Nhập lại mật khẩu mới" className={`w-full border p-2 rounded outline-none focus:ring-2 ${form.confirmPassword && form.newPassword !== form.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`} />

              <button onClick={changePassword} className="hover-flip-btn px-10 py-2 ">Đổi mật khẩu</button>
              {message && <p className={`mt-2 ${messageClass}`}>{message}</p>}
            </div>
          </div>
        )}

        {tab === 'address' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Địa chỉ giao hàng</h2>
              {!showAddressForm && (
                <button onClick={() => setShowAddressForm(true)} className="hover-flip-btn px-10 py-2 ">Thêm địa chỉ mới</button>
              )}
            </div>

            {showAddressForm ? (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Họ và tên" value={addressForm.fullName} onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })} className="border p-2 rounded" />
                  <input placeholder="Số điện thoại" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} className="border p-2 rounded" />
                  <select onChange={handleProvinceChange} className="border p-2 rounded"><option value="">-- Tỉnh / Thành --</option>{provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select>
                  <select onChange={handleDistrictChange} disabled={!districts.length} className="border p-2 rounded"><option value="">-- Quận / Huyện --</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select>
                  <select onChange={(e) => setAddressForm({ ...addressForm, ward: wards.find(w => w.code == e.target.value)?.name })} disabled={!wards.length} className="border p-2 rounded"><option value="">-- Phường / Xã --</option>{wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}</select>
                  <input placeholder="Số nhà, tên đường" value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} className="border p-2 rounded" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAddress} className="hover-flip-btn px-10 py-2 ">Lưu</button>
                  <button onClick={resetAddressForm} className="bg-gray-400 text-white px-6 py-2 rounded font-bold">Hủy</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {/* ✅ Kiểm tra nếu danh sách trống */}
                {addresses.length > 0 ? (
                  addresses.map(addr => (
                    <div key={addr._id} className="p-4 border rounded-xl flex justify-between items-center bg-white shadow-sm hover:shadow-md transition">
                      <div>
                        <p className="font-bold">{addr.fullName} | {addr.phone}</p>
                        <p className="text-sm text-gray-500 mt-1">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => editAddress(addr)} className="hover-flip-btn px-10 py-2 ">Sửa</button>
                        {!addr.isDefault && <button className="text-red-600 text-sm font-bold">Xóa</button>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FontAwesomeIcon icon={['fas', 'map-marker-alt']} className="text-gray-300 text-4xl mb-3" />
                    <p className="text-gray-500 italic">Bạn chưa thêm địa chỉ giao hàng nào.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;