import { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Profile = () => {
  const [tab, setTab] = useState('info');
  const [user, setUser] = useState({ name: '', email: '', avatar: '' });
  const [form, setForm] = useState({ name: '', email: '', currentPassword: '', newPassword: '', avatar: null });
  const [addressForm, setAddressForm] = useState({ fullName: '', phone: '', street: '', district: '', city: '' });

  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [messageClass, setMessageClass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [addressId, setAddressId] = useState(null);

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

        const resAddr = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
        if (resAddr.data.length > 0) {
          const addr = resAddr.data[0];
          setAddressForm({ fullName: addr.fullName, phone: addr.phone, street: addr.street, district: addr.district, city: addr.city });
          setAddressId(addr._id);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Profile:', err);
      }
    };
    fetchData();
  }, [token]);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setForm({ ...form, avatar: file });
    }
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
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.reload();
    } catch (err) {
      setMessage('Có lỗi xảy ra!');
      setMessageClass('text-red-600');
    }
  };

  const changePassword = async () => {
    if (!form.currentPassword || !form.newPassword) {
      setMessage('Vui lòng nhập đầy đủ thông tin');
      setMessageClass('text-red-600');
      return;
    }
    try {
      const res = await axios.put('/api/users/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setMessage('Đổi mật khẩu thành công');
        setMessageClass('text-green-600');
        setForm({ ...form, currentPassword: '', newPassword: '' });
      } else {
        setMessage('Nhập sai mật khẩu cũ');
        setMessageClass('text-red-600');
      }
    } catch (err) {
      setMessage('Lỗi đổi mật khẩu');
      setMessageClass('text-red-600');
    }
  };

  const updateEmail = async () => {
    if (!newEmail || newEmail === user.email) {
      alert('Vui lòng nhập email mới hợp lệ!');
      return;
    }
    try {
      setLoadingEmail(true);
      await axios.put('/api/users/update-email', { email: newEmail }, { headers: { Authorization: `Bearer ${token}` } });
      setUser({ ...user, email: newEmail });
      localStorage.setItem('user', JSON.stringify({ ...user, email: newEmail }));
      alert('Email đã được cập nhật!');
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.msg || 'Không thể cập nhật email'));
    } finally {
      setLoadingEmail(false);
    }
  };

  const saveAddress = async () => {
    try {
      if (addressId) {
        await axios.put(`/api/addresses/${addressId}`, addressForm, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        const res = await axios.post('/api/addresses', addressForm, { headers: { Authorization: `Bearer ${token}` } });
        setAddressId(res.data._id);
      }
      alert('Lưu địa chỉ thành công!');
    } catch (err) {
      alert('Lỗi khi lưu địa chỉ!');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4">
      {/* Menu trái */}
      <div className="w-full md:w-1/3 bg-white rounded-xl shadow p-4 space-y-2">
        <div className={tab === 'info' ? activeClass : inactiveClass} onClick={() => setTab('info')}>Thông tin của tôi</div>
        <div className={tab === 'security' ? activeClass : inactiveClass} onClick={() => setTab('security')}>Email và mật khẩu</div>
        <div className={tab === 'address' ? activeClass : inactiveClass} onClick={() => setTab('address')}>Địa chỉ giao hàng</div>
      </div>

      {/* Nội dung phải */}
      <div className="w-full md:w-2/3 bg-white rounded-xl shadow p-6">
        {tab === 'info' && (
          <div className="space-y-6 min-h-[500px]">
            <h2 className="text-2xl font-bold text-gray-800">Cập nhật thông tin</h2>
            <div className="flex items-center gap-4">
              <img src={preview || `http://localhost:5000/${user.avatar || 'uploads/avatars/default-user.png'}`} className="w-24 h-24 rounded-full object-cover border" alt="Avatar" />
              <input type="file" onChange={onFileChange} />
            </div>
            <div>
              <label className="font-medium block mb-1">Tên người dùng</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" type="text" />
            </div>
            <button onClick={updateProfile} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Lưu thay đổi</button>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Bảo mật tài khoản</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <FontAwesomeIcon icon={['fas', 'envelope']} className="text-red-500 text-xl" />
                <span className="text-base text-3xl font-semibold text-gray-800">{user.email}</span>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thay đổi gmail của tôi</label>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} onFocus={() => setNewEmail('')} type="email" placeholder="Nhập email mới" className="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />
              <button onClick={updateEmail} disabled={loadingEmail} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">{loadingEmail ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="font-medium block mb-1">Thay đổi mật khẩu</label>
                <input value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} type="password" placeholder="Nhập mật khẩu hiện tại" className="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="font-medium block mb-1">Mật khẩu mới</label>
                <input value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} type="password" placeholder="Nhập mật khẩu mới" className="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={changePassword} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Lưu</button>
              {message && <p className={messageClass}>{message}</p>}
            </div>
          </div>
        )}

        {tab === 'address' && (
          <div className="space-y-6 min-h-[500px]">
            <h2 className="text-2xl font-bold text-gray-800">Địa chỉ giao hàng</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block font-medium mb-1">Họ và tên</label><input value={addressForm.fullName} onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" /></div>
              <div><label className="block font-medium mb-1">Số điện thoại</label><input value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" /></div>
            </div>
            <div><label className="block font-medium mb-1">Địa chỉ nhà</label><input value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block font-medium mb-1">Quận / Huyện</label><input value={addressForm.district} onChange={e => setAddressForm({ ...addressForm, district: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" /></div>
              <div><label className="block font-medium mb-1">Thành phố</label><input value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" /></div>
            </div>
            <button onClick={saveAddress} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Lưu địa chỉ</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;