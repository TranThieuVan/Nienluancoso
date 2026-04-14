import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';

const InputSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  // Xử lý click ra ngoài để đóng cả thanh search và popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý gọi API tìm kiếm
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/books?search=${encodeURIComponent(searchQuery.trim())}`);
        const foundBooks = res.data.books || [];
        setSuggestions(foundBooks.slice(0, 5));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Lỗi khi gợi ý sách:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const emitSearch = () => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    setIsSearchOpen(false);
    navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') emitSearch();
  };

  const handleSuggestionClick = (bookId) => {
    setShowSuggestions(false);
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/books/${bookId}`);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      {/* ── NÚT KÍNH LÚP (ICON TỐI GIẢN) ── */}
      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-50 transition-colors text-stone-600 hover:text-black focus:outline-none"
      >
        <FontAwesomeIcon icon={['fas', 'magnifying-glass']} className="text-[20px]" />
      </button>

      {/* ── KHUNG SEARCH TRƯỢT XUỐNG (Responsive Tuyệt Đối) ── */}
      <div
        className={`
          fixed left-4 right-4 top-[84px] w-auto 
          lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-4 lg:w-[320px] 
          bg-white shadow-2xl border border-gray-100 origin-top transition-all duration-300 z-50 
          ${isSearchOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'}
        `}
      >
        <div className="p-2 relative border-b border-gray-50">
          <input
            type="text"
            autoFocus={isSearchOpen}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder="Tìm tên sách, tác giả..."
            className="w-full pl-4 pr-10 py-3 text-sm bg-stone-50 focus:bg-white outline-none transition-colors placeholder:text-stone-400"
          />
          {isLoading ? (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 border-[1.5px] border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <FontAwesomeIcon
              icon={['fas', 'magnifying-glass']}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-black transition-colors"
              onClick={emitSearch}
            />
          )}
        </div>

        {/* ── SUGGESTIONS ── */}
        {showSuggestions && searchQuery.trim() && (
          <div>
            {suggestions.length > 0 ? (
              <ul className="max-h-[60vh] overflow-y-auto">
                {suggestions.map((book) => (
                  <li
                    key={book._id}
                    onClick={() => handleSuggestionClick(book._id)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                  >
                    <img
                      src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                      alt={book.title}
                      className="w-8 h-12 object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-black truncate">{book.title}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5 truncate">{book.author}</p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 pl-2">
                      {book.discountedPrice && book.discountedPrice < book.price ? (
                        <>
                          <p className="text-xs font-bold text-rose-600">{book.discountedPrice.toLocaleString('vi-VN')}₫</p>
                          <p className="text-[10px] text-stone-400 line-through">{book.price?.toLocaleString('vi-VN')}₫</p>
                        </>
                      ) : (
                        <p className="text-xs font-bold text-black">{book.price?.toLocaleString('vi-VN')}₫</p>
                      )}
                    </div>
                  </li>
                ))}
                <li
                  className="px-4 py-3 text-center text-xs tracking-widest uppercase text-stone-400 hover:text-black cursor-pointer transition-colors"
                  onClick={emitSearch}
                >
                  Xem tất cả kết quả
                </li>
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-stone-400">
                Không tìm thấy sách nào phù hợp.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputSearch;