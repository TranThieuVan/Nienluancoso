import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaExclamationTriangle, FaEyeSlash } from 'react-icons/fa';
import Pagination from '@/components/Pagination'; // Nhớ kiểm tra file này đã chuyển sang React chưa nhé

const AdminCommentList = () => {
  const [comments, setComments] = useState([]);
  const [filters, setFilters] = useState({ bookTitle: '', userName: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get('http://localhost:5000/api/admin/comments', {
        params: { ...filters, page, limit },
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(data.comments);
      setTotal(data.total);
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể tải bình luận', 'error');
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1); // Reset về trang 1 khi lọc
  };

  const confirmDelete = async (id) => {
    const { value: reason } = await Swal.fire({
      title: 'Ẩn bình luận?',
      input: 'select',
      inputOptions: {
        'Nội dung phản cảm': 'Nội dung phản cảm',
        'Ngôn từ thô tục': 'Ngôn từ thô tục',
        'Không liên quan đến sản phẩm': 'Không liên quan đến sản phẩm',
        'Spam hoặc quảng cáo': 'Spam hoặc quảng cáo',
        'Vi phạm chính sách': 'Vi phạm chính sách',
      },
      inputPlaceholder: 'Chọn lý do ẩn',
      showCancelButton: true,
      confirmButtonText: 'Ẩn',
      cancelButtonText: 'Huỷ',
      customClass: {
        confirmButton: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mx-2',
        cancelButton: 'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value) return 'Bạn phải chọn lý do ẩn!';
      },
    });

    if (reason) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.put(`http://localhost:5000/api/admin/comments/${id}/hide`,
          { reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await fetchComments();
        Swal.fire('Đã ẩn!', `Lý do: ${reason}`, 'success');
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể ẩn bình luận', 'error');
      }
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN');
  };

  return (
    <div className="flex flex-col p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Quản lý bình luận</h1>
          <p className="text-gray-500">Xem và quản lý toàn bộ bình luận của người dùng theo sách.</p>
        </div>
      </div>

      <div className="flex justify-between mb-4 items-end">
        <div className="flex gap-3 items-center">
          <input
            name="bookTitle" value={filters.bookTitle} onChange={handleFilterChange}
            placeholder="Tìm theo tên sách"
            className="p-2 border border-gray-300 rounded w-64 shadow-sm focus:outline-none focus:ring"
          />
          <input
            name="userName" value={filters.userName} onChange={handleFilterChange}
            placeholder="Tìm theo người dùng"
            className="p-2 border border-gray-300 rounded w-64 shadow-sm focus:outline-none focus:ring"
          />
          <button onClick={fetchComments} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Lọc
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded shadow-sm">
          <thead className="bg-gray-100 text-gray-700 text-left text-sm">
            <tr>
              <th className="p-3 border-b">No.</th>
              <th className="p-3 border-b">Sách</th>
              <th className="p-3 border-b">Người dùng</th>
              <th className="p-3 border-b">Nội dung</th>
              <th className="p-3 border-b">Ngày</th>
              <th className="p-3 border-b text-center">Trạng thái</th>
              <th className="p-3 border-b text-center">Ẩn</th>
            </tr>
          </thead>
          <tbody>
            {comments.length > 0 ? (
              comments.map((c, index) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{(page - 1) * limit + index + 1}</td>
                  <td className="p-3 border-b">{c.bookId?.title || '—'}</td>
                  <td className="p-3 border-b">
                    <div className="font-medium">{c.userId?.name}</div>
                    <div className="text-gray-500 text-xs">{c.userId?.email}</div>
                  </td>
                  <td className="p-3 border-b">
                    {c.isHidden ? (
                      <div className="text-red-600 italic flex items-center gap-2">
                        <FaExclamationTriangle className="text-yellow-500" /> Đã bị ẩn: {c.hiddenReason}
                      </div>
                    ) : (
                      <div>{c.content}</div>
                    )}
                  </td>
                  <td className="p-3 border-b text-sm">{formatDate(c.createdAt)}</td>
                  <td className="p-3 border-b text-center">
                    <span className={c.isHidden ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {c.isHidden ? 'Đã bị ẩn' : 'Hiển thị'}
                    </span>
                  </td>
                  <td className="p-3 border-b text-center">
                    {!c.isHidden ? (
                      <button onClick={() => confirmDelete(c._id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm inline-flex items-center">
                        <FaEyeSlash className="mr-1" /> Ẩn
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">Đã ẩn</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center text-gray-500 py-4">Không có bình luận nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination className="mt-6" currentPage={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
    </div>
  );
};

export default AdminCommentList;