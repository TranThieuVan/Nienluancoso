import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';
import { useFavorites } from '../composables/useFavorites';
import { useCart } from '../composables/useCart';

const BookList = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const perPage = 20;

  const { toggleFavorite, isFavorite, fetchFavorites } = useFavorites();
  const { addToCart } = useCart();

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      let response;
      if (sortBy === 'rating') {
        response = await axios.get('/api/ratings/top-rated');
      } else if (sortBy === 'sold') {
        response = await axios.get('/api/books/top-selling');
      } else {
        response = await axios.get('/api/books');
      }
      setBooks(response.data);
    } catch (err) {
      console.error('Lỗi khi tải sách:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchBooks();
      const genreRes = await axios.get('/api/books/genres');
      setGenres(genreRes.data);
      await fetchFavorites();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const filteredBooks = useMemo(() => {
    let result = [...books];
    if (searchTitle) {
      result = result.filter(book =>
        book.title.toLowerCase().includes(searchTitle.toLowerCase())
      );
    }
    if (selectedGenre) {
      result = result.filter(book => book.genre === selectedGenre);
    }
    if (['priceHigh', 'priceLow', 'title'].includes(sortBy)) {
      switch (sortBy) {
        case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'priceHigh': result.sort((a, b) => b.price - a.price); break;
        case 'priceLow': result.sort((a, b) => a.price - b.price); break;
        default: break;
      }
    }
    return result;
  }, [books, searchTitle, selectedGenre, sortBy]);

  const paginatedBooks = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredBooks.slice(start, start + perPage);
  }, [filteredBooks, page]);

  const totalPages = Math.ceil(filteredBooks.length / perPage);

  const sortOptions = [
    { value: 'title', label: 'Tên A → Z' },
    { value: 'sold', label: 'Bán chạy nhất' },
    { value: 'priceHigh', label: 'Giá cao → thấp' },
    { value: 'priceLow', label: 'Giá thấp → cao' },
  ];

  const filterContent = (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div>
        <p className="text-[10px] tracking-[0.35em] uppercase text-stone-400 mb-3">Tìm kiếm</p>
        <div className="relative">
          <input
            value={searchTitle}
            onChange={(e) => { setSearchTitle(e.target.value); setPage(1); }}
            type="text"
            placeholder="Nhập tên sách..."
            className="w-full pl-4 pr-9 py-2.5 text-sm border border-gray-200 focus:border-black outline-none transition-colors bg-white placeholder:text-stone-400"
          />
          <FontAwesomeIcon
            icon={['fas', 'magnifying-glass']}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 text-xs"
          />
        </div>
      </div>

      {/* Genre */}
      <div>
        <p className="text-[10px] tracking-[0.35em] uppercase text-stone-400 mb-3">Thể loại</p>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => { setSelectedGenre(''); setPage(1); setSidebarOpen(false); }}
            className={`text-left px-3 py-2 text-sm transition-colors duration-150 ${selectedGenre === ''
              ? 'bg-black text-white font-medium'
              : 'text-stone-600 hover:text-black hover:bg-stone-50'
              }`}
          >
            Tất cả
          </button>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => { setSelectedGenre(genre); setPage(1); setSidebarOpen(false); }}
              className={`text-left px-3 py-2 text-sm transition-colors duration-150 ${selectedGenre === genre
                ? 'bg-black text-white font-medium'
                : 'text-stone-600 hover:text-black hover:bg-stone-50'
                }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* ── PAGE HEADER ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-1">Thư viện</p>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl font-bold text-black">
              {selectedGenre || 'Tất cả sách'}
            </h1>
            {!isLoading && (
              <p className="text-sm text-stone-400 pb-1">{filteredBooks.length} đầu sách</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">

          {/* ── SIDEBAR (desktop) ── */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              {filterContent}
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-3">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex items-center gap-2 text-sm border border-gray-200 px-4 py-2 text-stone-600 hover:border-black hover:text-black transition-colors"
              >
                <FontAwesomeIcon icon={['fas', 'sliders']} className="text-xs" />
                Bộ lọc
                {selectedGenre && (
                  <span className="w-1.5 h-1.5 rounded-full bg-black ml-1" />
                )}
              </button>

              <div className="ml-auto">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="text-sm border border-gray-200 focus:border-black outline-none px-4 py-2 bg-white text-stone-600 focus:text-black transition-colors cursor-pointer"
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Book Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-xs tracking-widest uppercase text-stone-400">Đang tải...</p>
              </div>
            ) : paginatedBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {paginatedBooks.map((book) => {
                  const imgSrc = book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`;
                  return (
                    <div key={book._id} className="group flex flex-col">
                      {/* Image */}
                      <div className="relative overflow-hidden bg-stone-50 aspect-[2/3]">
                        <img
                          src={imgSrc}
                          alt={book.title}
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                          onClick={() => navigate(`/books/${book._id}`)}
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/35 flex items-end justify-center pb-4 gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => toggleFavorite(book)}
                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors shadow-sm"
                          >
                            <FontAwesomeIcon
                              icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                              className={isFavorite(book._id) ? 'text-red-500 text-sm' : 'text-stone-600 text-sm'}
                            />
                          </button>
                          <button
                            onClick={() => addToCart(book)}
                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors shadow-sm"
                          >
                            <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-stone-700 text-sm" />
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div
                        className="py-3 cursor-pointer flex-1 flex flex-col"
                        onClick={() => navigate(`/books/${book._id}`)}
                      >
                        <h3 className="text-xs font-semibold text-black line-clamp-2 leading-snug" title={book.title}>
                          {book.title}
                        </h3>
                        <p className="text-[11px] text-stone-400 mt-1 truncate">{book.author}</p>
                        <p className="text-sm font-bold text-black mt-2">{book.price.toLocaleString('vi-VN')}₫</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <FontAwesomeIcon icon={['far', 'folder-open']} className="text-4xl text-stone-200" />
                <p className="text-stone-400 text-sm">Không tìm thấy cuốn sách nào phù hợp.</p>
                {(searchTitle || selectedGenre) && (
                  <button
                    onClick={() => { setSearchTitle(''); setSelectedGenre(''); setPage(1); }}
                    className="text-xs underline text-stone-500 hover:text-black transition-colors"
                  >
                    Xoá bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-xl flex flex-col md:hidden transition-transform duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-bold uppercase tracking-widest text-black">Bộ lọc</p>
              <button onClick={() => setSidebarOpen(false)} className="text-stone-400 hover:text-black transition-colors">
                <FontAwesomeIcon icon={['fas', 'xmark']} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {filterContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BookList;