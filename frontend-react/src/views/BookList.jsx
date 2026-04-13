import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';
import BookCard from '../components/BookCard';

const BookList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const filterParam = queryParams.get('filter');

  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [promotions, setPromotions] = useState([]);

  const [searchTitle, setSearchTitle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedPromoId, setSelectedPromoId] = useState('');

  const [isSaleFilter, setIsSaleFilter] = useState(filterParam === 'sale');

  const [sortBy, setSortBy] = useState('title');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const perPage = 20;

  useEffect(() => {
    setIsSaleFilter(filterParam === 'sale');
  }, [filterParam]);

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      let response;
      if (sortBy === 'rating') {
        response = await axios.get('/api/ratings/top-rated');
      } else if (sortBy === 'sold') {
        response = await axios.get('/api/books/top-selling');
      } else {
        response = await axios.get('/api/books?limit=1000');
      }
      setBooks(response.data.books || response.data);
    } catch (err) {
      console.error('Lỗi khi tải sách:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await axios.get('/api/promotions');
      const active = res.data.filter(p => p.isActive && new Date(p.endDate) >= Date.now());
      setPromotions(active);
    } catch (err) {
      console.error('Lỗi tải khuyến mãi:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchBooks(), fetchPromotions()]);
      const genreRes = await axios.get('/api/books/genres');
      setGenres(genreRes.data);
    };
    init();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [sortBy]);

  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (isSaleFilter) {
      result = result.filter(book => book.discountedPrice && book.discountedPrice < book.price);
    }

    if (isSaleFilter && selectedPromoId) {
      const currentPromo = promotions.find(p => p._id === selectedPromoId);
      if (currentPromo) {
        if (currentPromo.targetType === 'genre') {
          result = result.filter(book => book.genre === currentPromo.targetValue);
        } else if (currentPromo.targetType === 'book') {
          try {
            const allowedIds = JSON.parse(currentPromo.targetValue).map(item => item.bookId);
            result = result.filter(book => allowedIds.includes(book._id));
          } catch (e) { console.error("Lỗi lọc promo", e); }
        }
      }
    }

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
        case 'priceHigh':
          result.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price));
          break;
        case 'priceLow':
          result.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price));
          break;
        default: break;
      }
    }
    return result;
  }, [books, searchTitle, selectedGenre, sortBy, isSaleFilter, selectedPromoId, promotions]);

  const paginatedBooks = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredBooks.slice(start, start + perPage);
  }, [filteredBooks, page]);

  const totalPages = Math.ceil(filteredBooks.length / perPage);

  const getPageTitle = () => {
    if (isSaleFilter) {
      if (selectedPromoId) {
        const pName = promotions.find(p => p._id === selectedPromoId)?.name;
        return pName ? pName.toUpperCase() : 'KHUYẾN MÃI';
      }
      return selectedGenre ? `${selectedGenre} GIẢM GIÁ` : 'Tất cả sách GIẢM GIÁ';
    }
    return selectedGenre || 'Tất cả sách';
  };

  const filterContent = (
    <div className="flex flex-col gap-8">
      {/* Search */}
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3 font-bold">Tìm kiếm</p>
        <div className="relative select-none">
          <input
            value={searchTitle}
            onChange={(e) => { setSearchTitle(e.target.value); setPage(1); }}
            type="text"
            placeholder="Nhập tên sách..."
            className="w-full pl-4 pr-9 py-2.5 text-sm border border-gray-200 focus:border-black outline-none transition-colors bg-white placeholder:text-stone-300"
          />
          <FontAwesomeIcon icon={['fas', 'magnifying-glass']} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 text-xs" />
        </div>
      </div>

      {/* Khuyến mãi Checkbox */}
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3 font-bold">Trạng thái</p>
        <label className="flex items-center select-none gap-3 cursor-pointer group">
          <div className={`w-5 h-5 border flex items-center justify-center transition-all ${isSaleFilter ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300 bg-white group-hover:border-rose-400'}`}>
            {isSaleFilter && <FontAwesomeIcon icon={['fas', 'check']} className="text-xs" />}
          </div>
          <span className={`text-sm transition-colors ${isSaleFilter ? 'text-rose-500 font-bold' : 'text-stone-600 group-hover:text-black'}`}>Đang giảm giá</span>
          <input type="checkbox" className="hidden" checked={isSaleFilter} onChange={(e) => { setIsSaleFilter(e.target.checked); if (!e.target.checked) setSelectedPromoId(''); setPage(1); if (!e.target.checked && filterParam === 'sale') navigate('/books'); }} />
        </label>
      </div>

      {/* Thể loại (Có Scroll) */}
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3 font-bold">Thể loại</p>
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
          <button
            onClick={() => { setSelectedGenre(''); setPage(1); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            // ✅ ĐÃ SỬA: Loại bỏ font-bold, thống nhất dùng font-medium để tránh chữ bự ra ép rớt dòng gây giật layout
            className={`text-left px-3 py-2 text-sm font-medium transition-all rounded-md ${selectedGenre === '' ? 'bg-black text-white' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            Tất cả
          </button>
          {genres.map(genre => (
            <button
              key={genre}
              // ✅ ĐÃ SỬA: Thêm scroll mượt lên top để không bị hụt hẫng khi kết quả lọc quá ít
              onClick={() => { setSelectedGenre(genre); setPage(1); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`text-left px-3 py-2 text-sm font-medium transition-all rounded-md ${selectedGenre === genre ? 'bg-black text-white' : 'text-stone-600 hover:bg-stone-50'}`}
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
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p className="text-[10px] tracking-[0.5em] uppercase text-stone-400 mb-2 font-bold">{isSaleFilter ? 'Ưu đãi đặc biệt' : 'Bộ sưu tập'}</p>
          <div className="flex items-end justify-between">
            <h1 className="text-4xl font-bold text-black tracking-tight uppercase">{getPageTitle()}</h1>
            {!isLoading && <p className="text-sm text-stone-400 font-medium">{filteredBooks.length} sản phẩm</p>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          <aside className="hidden md:block w-60 flex-shrink-0 border-r border-gray-50 pr-8">
            <div className="sticky top-28">{filterContent}</div>
          </aside>

          {/* ✅ ĐÃ SỬA: Thêm min-h-[60vh] để chống sập chiều cao web khi mảng rỗng hoặc ít sách */}
          <div className="flex-1 min-w-0 min-h-[60vh]">
            <div className="flex items-center justify-between mb-10 gap-4">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden flex items-center gap-2 text-xs font-bold border border-gray-200 px-4 py-2 uppercase tracking-widest hover:border-black transition-all">
                <FontAwesomeIcon icon={['fas', 'sliders']} /> Lọc
              </button>

              <div className="ml-auto flex items-center gap-4">
                {isSaleFilter && promotions.length > 0 && (
                  <select
                    value={selectedPromoId}
                    onChange={(e) => { setSelectedPromoId(e.target.value); setPage(1); }}
                    className="text-[11px] font-bold border-2 border-rose-100 px-4 py-2 bg-rose-50 text-rose-600 outline-none focus:border-rose-500 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <option value="">Tất cả ưu đãi</option>
                    {promotions.map(promo => (
                      <option key={promo._id} value={promo._id}>{promo.name}</option>
                    ))}
                  </select>
                )}

                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="text-[11px] font-bold border border-gray-200 px-4 py-2 bg-white text-stone-600 outline-none focus:border-black transition-all cursor-pointer uppercase tracking-wider"
                >
                  <option value="title">Tên A → Z</option>
                  <option value="sold">Bán chạy nhất</option>
                  <option value="priceHigh">Giá Cao → Thấp</option>
                  <option value="priceLow">Giá Thấp → Cao</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-10 h-10 border-4 border-stone-100 border-t-black rounded-full animate-spin mb-4" />
                <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400">Đang tải...</p>
              </div>
            ) : paginatedBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-12">
                {paginatedBooks.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 border border-dashed border-stone-100 rounded-lg">
                <FontAwesomeIcon icon={['far', 'folder-open']} className="text-5xl text-stone-100 mb-4" />
                <p className="text-stone-400 text-sm font-medium mb-4">Không tìm thấy kết quả phù hợp</p>
                <button onClick={() => { setSearchTitle(''); setSelectedGenre(''); setIsSaleFilter(false); setSelectedPromoId(''); setPage(1); navigate('/books'); }} className="text-[10px] font-bold uppercase tracking-widest text-black border-b-2 border-black pb-1 hover:text-stone-500 hover:border-stone-500 transition-all">Xoá bộ lọc</button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-20 border-t border-stone-50 pt-10">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-80 bg-white z-50 shadow-2xl flex flex-col md:hidden animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between px-8 py-6 border-b border-stone-50">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black">Bộ lọc</p>
              <button onClick={() => setSidebarOpen(false)} className="text-stone-400 hover:text-black"><FontAwesomeIcon icon={['fas', 'xmark']} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-8">{filterContent}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default BookList;