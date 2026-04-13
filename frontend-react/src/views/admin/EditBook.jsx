import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// Danh sách thể loại gán cứng để đồng bộ với Backend
const GENRES = [
  'Comics', 'Kinh tế', 'Chính trị', 'Tình cảm/Lãng mạn',
  'Viễn tưởng', 'Kinh dị', 'Self-help', 'Kinh doanh/Tài chính', 'Bí ẩn/Trinh thám'
];

const EditBook = () => {
  const { id: bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/books/${bookId}`);
        setBook(res.data);
      } catch (err) {
        console.error('Lỗi khi tải thông tin sách:', err);
        Swal.fire('Lỗi', 'Không thể tải thông tin sách', 'error');
      }
    };
    fetchBook();
  }, [bookId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBook(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (field, value) => {
    if (value === '') { setBook(prev => ({ ...prev, [field]: '' })); return; }
    const raw = value.replace(/\D/g, '');
    setBook(prev => ({ ...prev, [field]: raw ? parseInt(raw, 10) : '' }));
  };

  const handleCurrencyKeyDown = (e, field) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setBook(prev => ({ ...prev, [field]: (Number(prev[field]) || 0) + 1000 }));
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setBook(prev => ({ ...prev, [field]: Math.max(0, (Number(prev[field]) || 0) - 1000) }));
    }
  };

  const applyFile = (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => applyFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(book).forEach(([k, v]) => {
        if (['price', 'stock', 'importPrice'].includes(k)) {
          formData.append(k, Number(v));
        } else if (k !== 'image' && k !== 'embedding') {
          formData.append(k, v);
        }
      });
      if (imageFile) formData.append('image', imageFile);

      await axios.put(`http://localhost:5000/api/books/${bookId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        },
      });
      Swal.fire('Thành công', 'Đã cập nhật thông tin sách', 'success');
      navigate('/admin/books');
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.msg || 'Không thể cập nhật sách', 'error');
    }
  };

  if (!book) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;

  const inputCls = "w-full px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-gray-400";

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chỉnh Sửa Sách</h1>
        </div>
        <button onClick={() => navigate('/admin/books')} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Quay lại
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Tiêu đề *</label>
            <input name="title" value={book.title || ''} onChange={handleChange} required className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Tác giả</label>
              <input name="author" value={book.author || ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Thể loại *</label>
              <select
                name="genre"
                value={book.genre || ''}
                onChange={handleChange}
                required
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="" disabled>-- Chọn thể loại --</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Giá gốc (Nhập) *</label>
              <div className="relative">
                <input required value={book.importPrice !== undefined && book.importPrice !== '' ? Number(book.importPrice).toLocaleString('vi-VN') : ''} onChange={e => handleCurrencyChange('importPrice', e.target.value)} onKeyDown={e => handleCurrencyKeyDown(e, 'importPrice')} className={`${inputCls} pr-7 font-mono font-semibold`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">₫</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Giá bán (Bìa) *</label>
              <div className="relative">
                <input required value={book.price !== undefined && book.price !== '' ? Number(book.price).toLocaleString('vi-VN') : ''} onChange={e => handleCurrencyChange('price', e.target.value)} onKeyDown={e => handleCurrencyKeyDown(e, 'price')} className={`${inputCls} pr-7 font-mono font-semibold`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">₫</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Tồn kho *</label>
              <input name="stock" type="number" min="0" value={book.stock || 0} onChange={handleChange} required className={`${inputCls} font-mono font-semibold`} />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Mô tả</label>
            <textarea name="description" value={book.description || ''} onChange={handleChange} rows={4} className={`${inputCls} resize-y`} />
          </div>

          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold pb-2 border-b border-gray-100 mb-5">Ảnh bìa</p>
            <div className="flex flex-col gap-4">
              {book.image && !imagePreview && (
                <div className="flex items-center gap-4">
                  <img
                    src={book.image.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                    alt="Current"
                    className="w-20 h-28 object-cover border border-gray-200 rounded"
                  />
                  <p className="text-xs text-gray-400">Ảnh hiện tại</p>
                </div>
              )}
              {imagePreview && (
                <div className="flex items-center gap-4">
                  <img src={imagePreview} alt="Preview" className="w-20 h-28 object-cover border border-gray-200 rounded" />
                  <p className="text-xs text-indigo-500 font-semibold">Ảnh mới đã chọn</p>
                </div>
              )}
              <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 py-8 ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
                <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                <p className="text-sm font-semibold text-indigo-600">{imageFile ? 'Đổi ảnh khác' : 'Tải ảnh mới lên'}</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG tối đa 5MB</p>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Lưu thay đổi
            </button>
            <button type="button" onClick={() => navigate('/admin/books')} className="px-6 py-3 text-sm font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBook;