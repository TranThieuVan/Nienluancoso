import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const AddBook = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', author: '', genre: '', price: '', stock: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (field, value) => {
    if (value === '') { setForm(prev => ({ ...prev, [field]: '' })); return; }
    const raw = value.replace(/\D/g, '');
    setForm(prev => ({ ...prev, [field]: raw ? parseInt(raw, 10) : '' }));
  };

  const handleCurrencyKeyDown = (e, field) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); setForm(prev => ({ ...prev, [field]: (Number(prev[field]) || 0) + 1000 })); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setForm(prev => ({ ...prev, [field]: Math.max(0, (Number(prev[field]) || 0) - 1000) })); }
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
      Object.entries(form).forEach(([k, v]) => formData.append(k, k === 'price' || k === 'stock' ? Number(v) : v));
      if (imageFile) formData.append('image', imageFile);
      await axios.post('http://localhost:5000/api/books', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      Swal.fire('Thành công', 'Đã thêm sách mới', 'success');
      navigate('/admin/books');
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.msg || 'Không thể thêm sách', 'error');
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-gray-400";

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">

      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="text-[10px] tracking-[.18em] uppercase text-indigo-600 font-semibold mb-1">Admin · Bookstore</p>
          <h1 className="text-3xl font-bold text-gray-900">Thêm Sách Mới</h1>
        </div>
        <button
          onClick={() => navigate('/admin/books')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Quay lại
        </button>
      </div>

      {/* ── Form Card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit}>

          {/* Section: Thông tin */}
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold pb-2 border-b border-gray-100 mb-5">Thông tin sách</p>

          {/* Tiêu đề */}
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Tiêu đề *</label>
            <input name="title" value={form.title} onChange={handleChange} required placeholder="Nhập tiêu đề sách..." className={inputCls} />
          </div>

          {/* Tác giả + Thể loại */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Tác giả</label>
              <input name="author" value={form.author} onChange={handleChange} placeholder="Tên tác giả" className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Thể loại</label>
              <input name="genre" value={form.genre} onChange={handleChange} placeholder="VD: Tiểu thuyết" className={inputCls} />
            </div>
          </div>

          {/* Giá + Tồn kho */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Giá bán *</label>
              <div className="relative">
                <input
                  required value={form.price !== '' ? Number(form.price).toLocaleString('vi-VN') : ''}
                  onChange={e => handleCurrencyChange('price', e.target.value)}
                  onKeyDown={e => handleCurrencyKeyDown(e, 'price')}
                  placeholder="0"
                  className={`${inputCls} pr-7 font-mono font-semibold`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">₫</span>
              </div>
              <p className="text-[10px] text-gray-400 italic mt-1">↑↓ để ±1.000₫</p>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Tồn kho *</label>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required placeholder="0" className={`${inputCls} font-mono font-semibold`} />
            </div>
          </div>

          {/* Mô tả */}
          <div className="mb-6">
            <label className="block text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Mô tả</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4}
              placeholder="Mô tả nội dung sách..."
              className={`${inputCls} resize-y`} />
          </div>
          <div className="mb-6">
            {/* Section: Ảnh bìa */}
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold pb-2 border-b border-gray-100 mb-5">Ảnh bìa</p>

            <label
              className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />

              {imagePreview ? (
                <div className="flex items-center gap-4 p-5 w-full">
                  <img src={imagePreview} alt="Preview" className="w-14 h-20 object-cover border border-gray-200 rounded flex-shrink-0 shadow-sm" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{imageFile?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Nhấp hoặc kéo thả để đổi ảnh</p>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-sm font-semibold text-indigo-600">Chọn hoặc kéo thả ảnh vào đây</p>
                  <p className="text-xs text-gray-400">PNG, JPG tối đa 5MB</p>
                </div>

              )}
            </label>
          </div>
          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
            <button type="submit"
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Xác nhận thêm sách
            </button>
            <button type="button" onClick={() => navigate('/admin/books')}
              className="px-6 py-3 text-sm font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBook;