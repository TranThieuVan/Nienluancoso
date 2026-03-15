import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Pagination from '@/components/Pagination';

const formatPrice = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫';

const AdminBookList = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 20;

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/books');
      setBooks(res.data);
      setGenres([...new Set(res.data.map(b => b.genre))]);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách sách:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedGenre]);

  const filteredBooks = useMemo(() =>
    books.filter(b =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedGenre === '' || b.genre === selectedGenre)
    ), [books, searchQuery, selectedGenre]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * booksPerPage;
    return filteredBooks.slice(start, start + booksPerPage);
  }, [filteredBooks, currentPage]);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const stats = useMemo(() => [
    { label: 'Tổng đầu sách', dot: 'bg-indigo-500', value: books.length },
    { label: 'Còn hàng', dot: 'bg-green-500', value: books.filter(b => b.stock > 0).length },
    { label: 'Hết hàng', dot: 'bg-red-500', value: books.filter(b => b.stock === 0).length },
  ], [books]);

  const deleteBook = async (id) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa', text: 'Bạn có chắc chắn muốn xóa sách này?', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
      customClass: {
        confirmButton: 'bg-red-600 text-white font-semibold py-2 px-4 mr-2 rounded',
        cancelButton: 'bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded',
      }, buttonsStyling: false,
    });
    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/books/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        await fetchBooks();
        Swal.fire('Đã xóa!', 'Cuốn sách đã được xóa.', 'success');
      } catch {
        Swal.fire('Lỗi!', 'Xóa không thành công.', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">

      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="text-[10px] tracking-[.18em] uppercase text-indigo-600 font-semibold mb-1">Admin · Bookstore</p>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Sách</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBooks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            onClick={() => navigate('/admin/add-book')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm sách
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-400">
            Hiển thị <strong className="text-gray-700">{filteredBooks.length}</strong> / {books.length} đầu sách
          </span>
          <div className="flex items-center gap-2">
            <select
              value={selectedGenre}
              onChange={e => setSelectedGenre(e.target.value)}
              className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="">Tất cả thể loại</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tiêu đề..."
                className="text-xs text-gray-700 bg-transparent outline-none w-44 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['No.', 'Sách', 'Thể loại', 'Giá', 'Tồn kho', 'Hành động'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold ${i >= 4 ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedBooks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-sm text-gray-400">Không tìm thấy sách nào phù hợp.</td>
                </tr>
              ) : (
                paginatedBooks.map((book, idx) => (
                  <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{(currentPage - 1) * booksPerPage + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                          alt={book.title}
                          className="w-9 h-12 object-cover border border-gray-100 flex-shrink-0"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{book.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{book.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full">
                        {book.genre}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {book.discountedPrice && book.discountedPrice < book.price ? (
                        <div>
                          <p className="text-xs text-gray-400 line-through font-mono">{formatPrice(book.price)}</p>
                          <p className="text-sm font-bold text-red-600 font-mono">{formatPrice(book.discountedPrice)}</p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-gray-800 font-mono">{formatPrice(book.price)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {book.stock === 0
                        ? <span className="text-xs font-bold text-red-500 font-mono">Hết hàng</span>
                        : <span className="text-sm font-semibold text-gray-700 font-mono">{book.stock}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/edit-book/${book._id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Sửa
                        </button>
                        <button
                          onClick={() => deleteBook(book._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookList;