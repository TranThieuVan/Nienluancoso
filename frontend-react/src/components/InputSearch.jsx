import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';

const InputSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  // Xử lý click ra ngoài để đóng popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý gọi API tìm kiếm (Có Debounce 300ms)
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

        // ✅ ĐÃ SỬA BUG: Trỏ đúng vào res.data.books thay vì res.data
        const foundBooks = res.data.books || [];
        setSuggestions(foundBooks.slice(0, 5)); // Lấy 5 cuốn đầu tiên
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

  // Chuyển hướng sang trang kết quả tìm kiếm đầy đủ
  const emitSearch = () => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') emitSearch();
  };

  // Click vào 1 sách gợi ý -> Bay thẳng vào chi tiết
  const handleSuggestionClick = (bookId) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/books/${bookId}`);
  };

  return (
    <div ref={wrapperRef} className="relative w-full md:w-72 z-50">

      {/* ── INPUT ── */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="Tìm tên sách, tác giả..."
          className="w-full pl-4 pr-10 py-2 text-sm bg-stone-50 border border-gray-200 focus:border-black focus:bg-white outline-none transition-all duration-200 placeholder:text-stone-400"
        />

        {isLoading ? (
          <div className="absolute right-3 w-4 h-4 border-[1.5px] border-black border-t-transparent rounded-full animate-spin" />
        ) : (
          <FontAwesomeIcon
            icon={['fas', 'magnifying-glass']}
            className="absolute right-3 text-stone-400 cursor-pointer hover:text-black transition-colors text-sm"
            onClick={emitSearch}
          />
        )}
      </div>

      {/* ── SUGGESTIONS DROPDOWN ── */}
      {showSuggestions && searchQuery.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-lg overflow-hidden z-50">
          {suggestions.length > 0 ? (
            <ul>
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
                    <p className="text-sm font-medium text-black truncate">{book.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{book.author}</p>
                  </div>

                  {/* ✅ TỐI ƯU UI: Hiển thị giá khuyến mãi nếu có */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    {book.discountedPrice && book.discountedPrice < book.price ? (
                      <>
                        <p className="text-xs font-bold text-rose-600">
                          {book.discountedPrice.toLocaleString('vi-VN')}₫
                        </p>
                        <p className="text-[10px] text-stone-400 line-through">
                          {book.price?.toLocaleString('vi-VN')}₫
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-bold text-black">
                        {book.price?.toLocaleString('vi-VN')}₫
                      </p>
                    )}
                  </div>
                </li>
              ))}

              <li
                className="px-4 py-3 text-center text-xs tracking-widest uppercase text-stone-500 hover:text-black hover:bg-stone-50 cursor-pointer transition-colors border-t border-gray-100 font-medium"
                onClick={emitSearch}
              >
                Xem tất cả kết quả cho "{searchQuery}"
              </li>
            </ul>
          ) : (
            <div className="px-4 py-5 text-center text-sm text-stone-400">
              Không tìm thấy sách nào phù hợp.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InputSearch;