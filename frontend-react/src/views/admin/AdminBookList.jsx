import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Pagination from '@/components/Pagination';
import { apiUrl } from '../../config/api';
import { imageUrl as getImageUrl } from '../../config/api';
const formatPrice = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫';

const AdminBookList = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [publishers, setPublishers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState('');
  const [sortOption, setSortOption] = useState('');

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 20;

  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // ─── Fetch Dữ Liệu ───
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(apiUrl('/api/books?limit=1000'));
      const booksArray = res.data.books || res.data || [];
      setBooks(booksArray);
      setGenres([...new Set(booksArray.map(b => b.genre).filter(Boolean))]);
      setPublishers([...new Set(booksArray.map(b => b.publisher).filter(Boolean))]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await axios.get(apiUrl('/api/books/analytics'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingAnalytics(false); }
  }, []);

  useEffect(() => { fetchBooks(); fetchAnalytics(); }, [fetchBooks, fetchAnalytics]);

  // ─── Logic Bộ Lọc & Sắp Xếp ───
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedGenre, selectedPublisher, sortOption]);

  const filteredBooks = useMemo(() => {
    let result = books.filter(b =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedGenre === '' || b.genre === selectedGenre) &&
      (selectedPublisher === '' || b.publisher === selectedPublisher)
    );

    if (sortOption === 'on_sale') {
      result = result.filter(b => b.discountedPrice && b.discountedPrice < b.price);
    }
    if (sortOption === 'low_stock') {
      result = result.filter(b => b.stock > 0 && b.stock <= 5);
    }

    result.sort((a, b) => {
      if (sortOption === 'price_desc') return (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price);
      if (sortOption === 'price_asc') return (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price);
      return a.title.localeCompare(b.title, 'vi');
    });

    return result;
  }, [books, searchQuery, selectedGenre, selectedPublisher, sortOption]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * booksPerPage;
    return filteredBooks.slice(start, start + booksPerPage);
  }, [filteredBooks, currentPage]);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const deleteBook = async (id) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa', text: 'Bạn có chắc chắn muốn xóa sách này?', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
      customClass: { confirmButton: 'bg-red-600 text-white font-semibold py-2 px-4 mr-2 rounded', cancelButton: 'bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded' }, buttonsStyling: false,
    });
    if (result.isConfirmed) {
      try {
        const userToken = localStorage.getItem('adminToken') || localStorage.getItem('token');
        await axios.delete(apiUrl(`/api/books/${id}`), {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        await fetchBooks();
        Swal.fire('Đã xóa!', 'Cuốn sách đã được xóa.', 'success');
      } catch { Swal.fire('Lỗi!', 'Xóa không thành công.', 'error'); }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div><h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Quản lý Kho Sách</h1></div>
        <div className="flex items-center gap-3">
          <button onClick={fetchBooks} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all"><i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Làm mới</button>
          <button onClick={() => navigate('/admin/add-book')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-sm hover:bg-indigo-700 transition-all"><i className="fa-solid fa-plus"></i> Thêm sách mới</button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-emerald-600 rounded-2xl p-5 shadow-lg shadow-emerald-100 text-white">
          <div className="flex items-center justify-between mb-4"><p className="text-[9px] uppercase tracking-widest font-black opacity-80">Vốn hóa kho</p><i className="fa-solid fa-sack-dollar text-lg opacity-50"></i></div>
          <p className="text-xl font-black font-mono">{formatPrice(analytics?.summary.totalInventoryValue || 0)}</p>
          <p className="mt-3 text-[9px] font-bold bg-white/20 inline-block px-2 py-0.5 rounded uppercase">Đang lưu kho</p>
        </div>
        <div className="bg-indigo-600 rounded-2xl p-5 shadow-lg shadow-indigo-100 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] uppercase tracking-widest font-black opacity-80">Top Doanh thu thể loại</p><i className="fa-solid fa-crown text-lg opacity-50"></i>
            </div>
            <p className="text-xl font-black truncate" title={analytics?.summary.topGenre?.name || 'Chưa có dữ liệu'}>{analytics?.summary.topGenre?.name || '—'}</p>
          </div>
          <div className="mt-3"><p className="text-[10px] font-bold bg-white/20 inline-block px-2.5 py-1 rounded uppercase tracking-wide">Chiếm {analytics?.summary.topGenre?.percentage || 0}%</p></div>
        </div>
        <div className="bg-amber-500 rounded-2xl p-5 shadow-lg shadow-amber-100 text-white">
          <div className="flex items-center justify-between mb-3"><p className="text-[9px] uppercase tracking-widest font-black opacity-80">Chỉ số hiệu quả</p><i className="fa-solid fa-bolt-lightning text-lg opacity-50"></i></div>
          <div className="space-y-1.5 font-black text-xs">
            <div className="flex justify-between"><span>Vòng quay:</span><span>{analytics?.summary.turnoverRate || 0}%</span></div>
            <div className="flex justify-between"><span>Biên lãi:</span><span>{analytics?.summary.grossMargin || 0}%</span></div>
          </div>
        </div>
        <div className="bg-violet-600 rounded-2xl p-5 shadow-lg shadow-violet-100 text-white">
          <div className="flex items-center justify-between mb-3"><p className="text-[9px] uppercase tracking-widest font-black opacity-80">Số lượng khuyến mãi</p><i className="fa-solid fa-tags text-lg opacity-50"></i></div>
          <p className="text-xl font-black font-mono">{analytics?.summary.discountedCount || 0}</p>
          <p className="mt-3 text-[9px] font-bold bg-white/20 inline-block px-2 py-0.5 rounded uppercase">Sách đang Sale</p>
        </div>
        <div className="bg-orange-500 rounded-2xl p-5 shadow-lg shadow-orange-100 text-white">
          <div className="flex items-center justify-between mb-3"><p className="text-[9px] uppercase tracking-widest font-black opacity-80">Cần nhập hàng</p><i className="fa-solid fa-triangle-exclamation text-lg opacity-50"></i></div>
          <p className="text-xl font-black font-mono">{analytics?.summary.inventory.lowStock || 0}</p>
          <p className="mt-3 text-[9px] font-bold bg-white/20 inline-block px-2 py-0.5 rounded uppercase">Tồn kho ≤ 5</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-400 font-bold uppercase tracking-tighter">Danh sách sản phẩm ({filteredBooks.length})</span>
          <div className="flex items-center gap-2">
            <select value={sortOption} onChange={e => setSortOption(e.target.value)} className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-black shadow-sm">
              <option value="">Sắp xếp mặc định</option>
              <option value="on_sale" className="text-indigo-600 font-bold">✨ SÁCH ĐANG GIẢM GIÁ</option>
              <option value="low_stock" className="text-orange-600 font-bold">⚠️ SÁCH SẮP HẾT HÀNG</option>
              <option value="price_desc">Giá: Cao đến Thấp</option>
              <option value="price_asc">Giá: Thấp đến Cao</option>
            </select>

            <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)} className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-black shadow-sm">
              <option value="">Tất cả thể loại</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select value={selectedPublisher} onChange={e => setSelectedPublisher(e.target.value)} className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-black shadow-sm max-w-[150px] truncate">
              <option value="">Tất cả NXB</option>
              {publishers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              <i className="fa-solid fa-magnifying-glass text-gray-400 text-xs"></i>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm sách..." className="text-xs text-gray-700 bg-transparent outline-none w-32 font-bold" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* ✅ ĐÃ ĐIỀU CHỈNH TỶ LỆ CỘT ĐỂ THÊM CỘT NXB */}
          <table className="w-full text-base text-left table-fixed min-w-[1000px]">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="w-[5%] px-4 py-5 text-[11px] uppercase font-black text-gray-400">No.</th>
                <th className="w-[30%] px-4 py-5 text-[11px] uppercase font-black text-gray-400">Thông tin sách</th>
                <th className="w-[12%] px-4 py-5 text-[11px] uppercase font-black text-gray-400">Thể loại</th>
                <th className="w-[13%] px-4 py-5 text-[11px] uppercase font-black text-gray-400">Nhà xuất bản</th>
                <th className="w-[12%] px-4 py-5 text-[11px] uppercase font-black text-gray-400">Giá bán</th>
                <th className="w-[10%] px-4 py-5 text-[11px] uppercase font-black text-gray-400 text-center">Tồn kho</th>
                <th className="w-[18%] px-4 py-5 text-[11px] uppercase font-black text-gray-400 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBooks.length === 0 ? (
                <tr><td colSpan="7" className="py-20 text-center text-gray-400 font-black uppercase tracking-widest text-lg">Không tìm thấy dữ liệu</td></tr>
              ) : (
                paginatedBooks.map((book, idx) => (
                  <tr key={book._id} className="hover:bg-indigo-50/50 transition-colors group">
                    <td className="px-4 py-5 text-sm text-gray-400 font-mono font-bold">{(currentPage - 1) * booksPerPage + idx + 1}</td>

                    <td className="px-4 py-5">
                      <div className="flex items-center gap-4">
                        <img src={getImageUrl(book.image)} alt="book" className="w-12 h-16 object-cover rounded-lg shadow-sm border border-gray-100" />
                        <div className="min-w-0 flex-1">
                          {/* ✅ Tên sách tự cắt (truncate), có thêm title để hover xem đầy đủ */}
                          <p className="text-base font-black text-gray-900 truncate tracking-tight" title={book.title}>{book.title}</p>
                          <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-tighter opacity-70 truncate" title={book.author}>{book.author}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      <span className="inline-block px-3 py-1 bg-violet-50 text-violet-700 text-[10px] font-black rounded-full uppercase border border-violet-100 truncate max-w-full" title={book.genre}>{book.genre}</span>
                    </td>

                    {/* ✅ CỘT NXB ĐỘC LẬP */}
                    <td className="px-4 py-5">
                      <span className="inline-block px-3 py-1 bg-sky-50 text-sky-700 text-[10px] font-black rounded-full uppercase border border-sky-100 truncate max-w-full" title={book.publisher || 'Chưa cập nhật'}>
                        {book.publisher || 'Chưa cập nhật'}
                      </span>
                    </td>

                    <td className="px-4 py-5">
                      {book.discountedPrice && book.discountedPrice < book.price ? (
                        <div>
                          <p className="text-xs text-gray-300 line-through font-mono font-bold">{formatPrice(book.price)}</p>
                          <p className="text-base font-black text-rose-600 font-mono tracking-tighter">{formatPrice(book.discountedPrice)}</p>
                        </div>
                      ) : (
                        <p className="text-base font-black text-gray-800 font-mono tracking-tighter">{formatPrice(book.price)}</p>
                      )}
                    </td>

                    <td className="px-4 py-5 text-center">
                      {book.stock === 0 ? (
                        <span className="text-[11px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 uppercase tracking-tighter shadow-sm">Hết hàng</span>
                      ) : (
                        <span className={`text-base font-black font-mono ${book.stock <= 5 ? 'text-orange-500 animate-pulse' : 'text-gray-700'}`}>{book.stock}</span>
                      )}
                    </td>

                    <td className="px-4 py-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => navigate(`/admin/edit-book/${book._id}`)} className="px-4 py-2 text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Sửa</button>
                        <button onClick={() => deleteBook(book._id)} className="px-4 py-2 text-xs font-black text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-6 border-t border-gray-100 bg-white">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookList;