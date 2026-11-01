import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';
import BookCard from '../components/BookCard';
import { apiUrl } from '../config/api';
import { genreLabel } from '../config/labels';

const BookList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const filterParam = queryParams.get('filter');
  const genreParam = queryParams.get('genre');
  const promoParam = queryParams.get('promo') || '';
  const searchParam = queryParams.get('search') || '';

  const [books, setBooks] = useState([]);
  const [totalBooksCount, setTotalBooksCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [genres, setGenres] = useState([]);
  const [promotions, setPromotions] = useState([]);

  // ✅ THÊM STATE CHO NHÀ XUẤT BẢN
  const [publishers, setPublishers] = useState([]);
  const [selectedPublisher, setSelectedPublisher] = useState('');

  const [searchTitle, setSearchTitle] = useState(searchParam);
  const [selectedGenre, setSelectedGenre] = useState(genreParam || '');
  const [selectedPromoId, setSelectedPromoId] = useState(promoParam);
  const [isSaleFilter, setIsSaleFilter] = useState(filterParam === 'sale');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);

  const [sortBy, setSortBy] = useState('title');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const perPage = 20;

  useEffect(() => {
    let active = true;
    const loadFilters = async () => {
      const results = await Promise.allSettled([
        axios.get(apiUrl('/api/books/genres')),
        axios.get(apiUrl('/api/books/publishers')),
        axios.get(apiUrl('/api/promotions')),
      ]);

      if (!active) return;
      if (results[0].status === 'fulfilled') setGenres(results[0].value.data);
      if (results[1].status === 'fulfilled') setPublishers(results[1].value.data);
      else setPublishers([
        'NXB Trẻ', 'NXB Kim Đồng', 'NXB Giáo Dục Việt Nam',
        'NXB Tổng Hợp TPHCM', 'NXB Thế Giới'
      ]);
      if (results[2].status === 'fulfilled') {
        const now = Date.now();
        setPromotions((results[2].value.data || []).filter(p =>
          p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now
        ));
      }
    };

    loadFilters();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTitle.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchTitle]);

  useEffect(() => {
    setIsSaleFilter(filterParam === 'sale');
    setSelectedGenre(genreParam || '');
    setSelectedPromoId(promoParam);
    setSearchTitle(searchParam);
    setDebouncedSearch(searchParam);
    setPage(1);
  }, [filterParam, genreParam, promoParam, searchParam]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedGenre) params.set('genre', selectedGenre);
    if (selectedPublisher) params.set('publisher', selectedPublisher);
    if (isSaleFilter) params.set('filter', 'sale');
    if (isSaleFilter && selectedPromoId) params.set('promo', selectedPromoId);
    params.set('sort', sortBy === 'priceHigh' ? 'price_desc' : sortBy === 'priceLow' ? 'price_asc' : 'title_asc');

    setIsLoading(true);
    axios.get(apiUrl(`/api/books?${params}`), { signal: controller.signal })
      .then(({ data }) => {
        setBooks(data.books || []);
        setTotalBooksCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          console.error('Lỗi khi tải sách:', error);
          setBooks([]);
          setTotalBooksCount(0);
          setTotalPages(1);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [page, debouncedSearch, selectedGenre, selectedPublisher, isSaleFilter, selectedPromoId, sortBy]);

  const getPageTitle = () => {
    if (isSaleFilter) {
      if (selectedPromoId) {
        const pName = promotions.find(p => p._id === selectedPromoId)?.name;
        return pName ? pName.toUpperCase() : 'SPECIAL OFFERS';
      }
      return selectedGenre ? `${genreLabel(selectedGenre).toUpperCase()} ON SALE` : 'ALL SALE BOOKS';
    }
    return selectedGenre ? genreLabel(selectedGenre) : 'All Books';
  };

  const filterContent = (
    <div className="flex flex-col gap-8">
      {/* Search */}
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3 font-bold">Search</p>
        <div className="relative select-none">
          <input
            value={searchTitle}
            onChange={(e) => { setSearchTitle(e.target.value); setPage(1); }}
            type="text"
            placeholder="Search books or authors..."
            className="w-full pl-4 pr-9 py-2.5 text-sm border border-gray-200 focus:border-black outline-none transition-colors bg-white placeholder:text-stone-300"
          />
          <FontAwesomeIcon icon={['fas', 'magnifying-glass']} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 text-xs" />
        </div>
      </div>

      {/* Khuyến mãi Checkbox */}
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3 font-bold">Availability</p>
        <label className="flex items-center select-none gap-3 cursor-pointer group">
          <div className={`w-5 h-5 border flex items-center justify-center transition-all ${isSaleFilter ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300 bg-white group-hover:border-rose-400'}`}>
            {isSaleFilter && <FontAwesomeIcon icon={['fas', 'check']} className="text-xs" />}
          </div>
          <span className={`text-sm transition-colors ${isSaleFilter ? 'text-rose-500 font-bold' : 'text-stone-600 group-hover:text-black'}`}>On sale</span>
          <input type="checkbox" className="hidden" checked={isSaleFilter} onChange={(e) => { setIsSaleFilter(e.target.checked); if (!e.target.checked) setSelectedPromoId(''); setPage(1); if (!e.target.checked && filterParam === 'sale') navigate('/books'); }} />
        </label>
      </div>

      {/* Thể loại */}
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3 font-bold">Genre</p>
        <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
          <button
            onClick={() => { setSelectedGenre(''); setPage(1); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`text-left px-3 py-2 text-sm font-medium transition-all rounded-md ${selectedGenre === '' ? 'bg-black text-white' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            All genres
          </button>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => { setSelectedGenre(genre); setPage(1); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`text-left px-3 py-2 text-sm font-medium transition-all rounded-md ${selectedGenre === genre ? 'bg-black text-white' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              {genreLabel(genre)}
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
          <p className="text-[10px] tracking-[0.5em] uppercase text-stone-400 mb-2 font-bold">{isSaleFilter ? 'Special offers' : 'Collection'}</p>
          <div className="flex items-end justify-between">
            <h1 className="text-4xl font-bold text-black tracking-tight uppercase">{getPageTitle()}</h1>
            {!isLoading && <p className="text-sm text-stone-400 font-medium">{totalBooksCount} books</p>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          <aside className="hidden md:block w-60 flex-shrink-0 border-r border-gray-50 pr-8">
            <div className="sticky top-28">{filterContent}</div>
          </aside>

          <div className="flex-1 min-w-0 min-h-[60vh]">
            <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden flex items-center gap-2 text-xs font-bold border border-gray-200 px-4 py-2 uppercase tracking-widest hover:border-black transition-all">
                <FontAwesomeIcon icon={['fas', 'sliders']} /> Filters
              </button>

              {/* ✅ VÙNG CÁC DROPDOWN LỌC TRÊN TOP RIGHT */}
              <div className="ml-auto flex items-center gap-4 flex-wrap justify-end">

                {isSaleFilter && promotions.length > 0 && (
                  <select
                    value={selectedPromoId}
                    onChange={(e) => { setSelectedPromoId(e.target.value); setPage(1); }}
                    className="text-[11px] font-bold border-2 border-rose-100 px-4 py-2 bg-rose-50 text-rose-600 outline-none focus:border-rose-500 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <option value="">All offers</option>
                    {promotions.map(promo => (
                      <option key={promo._id} value={promo._id}>{promo.name}</option>
                    ))}
                  </select>
                )}

                {/* ✅ BỘ LỌC NHÀ XUẤT BẢN ĐƯỢC CHUYỂN LÊN ĐÂY */}
                <select
                  value={selectedPublisher}
                  onChange={(e) => { setSelectedPublisher(e.target.value); setPage(1); }}
                  className="text-[11px] font-bold border border-gray-200 px-4 py-2 bg-white text-stone-600 outline-none focus:border-black transition-all cursor-pointer uppercase tracking-wider"
                >
                  <option value="">All publishers</option>
                  {publishers.map(pub => (
                    <option key={pub} value={pub}>{pub}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="text-[11px] font-bold border border-gray-200 px-4 py-2 bg-white text-stone-600 outline-none focus:border-black transition-all cursor-pointer uppercase tracking-wider"
                >
                  <option value="title">Title A–Z</option>
                  <option value="priceHigh">Price: high to low</option>
                  <option value="priceLow">Price: low to high</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-10 h-10 border-4 border-stone-100 border-t-black rounded-full animate-spin mb-4" />
                <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400">Loading books...</p>
              </div>
            ) : books.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-12">
                {books.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 border border-dashed border-stone-100 rounded-lg">
                <FontAwesomeIcon icon={['far', 'folder-open']} className="text-5xl text-stone-100 mb-4" />
                <p className="text-stone-400 text-sm font-medium mb-4">No matching books found.</p>
                <button onClick={() => { setSearchTitle(''); setSelectedGenre(''); setSelectedPublisher(''); setIsSaleFilter(false); setSelectedPromoId(''); setPage(1); navigate('/books'); }} className="text-[10px] font-bold uppercase tracking-widest text-black border-b-2 border-black pb-1 hover:text-stone-500 hover:border-stone-500 transition-all">Clear filters</button>
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
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black">Filters</p>
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