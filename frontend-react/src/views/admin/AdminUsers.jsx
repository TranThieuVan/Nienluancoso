import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      // Sử dụng axios thay vì fetch
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getAvatarUrl = (avatar) => {
    if (!avatar || avatar.includes('default-user.png')) {
      return 'http://localhost:5000/uploads/avatars/default-user.png';
    }
    return `http://localhost:5000/${avatar}`;
  };

  const onImageError = (e) => {
    e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png';
  };

  const toggleLock = async (user) => {
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.put(`/api/admin/users/${user._id}/toggle-lock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      await fetchUsers(); // Refresh danh sách sau khi khóa/mở khóa thành công
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Quản lý Người dùng</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border border-gray-300">Avatar</th>
              <th className="p-2 border border-gray-300">Tên</th>
              <th className="p-2 border border-gray-300">Email</th>
              <th className="p-2 border border-gray-300">Trạng thái</th>
              <th className="p-2 border border-gray-300">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="p-2 border border-gray-300 text-center align-middle">
                  <div className="flex justify-center items-center gap-2">
                    <img
                      src={getAvatarUrl(user.avatar)}
                      onError={onImageError}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover border"
                    />
                  </div>
                </td>
                <td className="p-2 border border-gray-300 text-center align-middle">
                  {user.name}
                </td>
                <td className="p-2 border border-gray-300 text-center align-middle">
                  {user.email}
                </td>
                <td className="p-2 border border-gray-300 text-center align-middle">
                  <span className={user.isLocked ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                    {user.isLocked ? 'Đã khóa' : 'Hoạt động'}
                  </span>
                </td>
                <td className="p-2 border border-gray-300 text-center align-middle">
                  <button
                    onClick={() => toggleLock(user)}
                    className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
                  >
                    {user.isLocked ? 'Mở khóa' : 'Khóa'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="mt-4 text-red-600 font-semibold">{error}</div>}
    </div>
  );
};

export default AdminUsers;