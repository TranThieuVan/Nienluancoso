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

  // 1. Tự động đóng bảng gợi ý khi click ra ngoài thanh tìm kiếm
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Logic gọi API tìm kiếm với "Debounce" (Chờ 300ms sau khi ngừng gõ mới gọi)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        // Gọi API backend với từ khoá search
        const res = await axios.get(`/api/books?search=${encodeURIComponent(searchQuery.trim())}`);
        // Cắt lấy tối đa 5 cuốn sách giống nhất để hiển thị cho gọn
        setSuggestions(res.data.slice(0, 5));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Lỗi khi gợi ý sách:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const emitSearch = () => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      emitSearch();
    }
  };

  // 3. Hàm xử lý khi user click thẳng vào 1 cuốn sách trong bảng gợi ý
  const handleSuggestionClick = (bookId) => {
    setShowSuggestions(false);
    setSearchQuery(''); // Xoá thanh search sau khi click (Tuỳ chọn)
    navigate(`/books/${bookId}`); // Đổi thành /book/ nếu route của bạn ko có 's'
  };

  return (
    // Thêm ref vào div bọc ngoài cùng
    <div ref={wrapperRef} className="relative w-full md:w-80 z-50">

      {/* THANH INPUT */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder="Tìm tên sách, tác giả"
          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        {/* Hiện icon xoay xoay nếu đang tải, hiện kính lúp nếu bình thường */}
        {isLoading ? (
          <div className="absolute right-3 top-2.5 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <FontAwesomeIcon
            icon={['fas', 'magnifying-glass']}
            className="absolute right-3 top-2.5 text-gray-500 cursor-pointer hover:text-blue-500 transition"
            onClick={emitSearch}
          />
        )}
      </div>

      {/* BẢNG GỢI Ý DROP-DOWN */}
      {showSuggestions && searchQuery.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-fade-in-down">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((book) => (
                <li
                  key={book._id}
                  onClick={() => handleSuggestionClick(book._id)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition border-b border-gray-100 last:border-b-0"
                >
                  <img
                    src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                    alt={book.title}
                    className="w-10 h-14 object-cover rounded shadow-sm"
                  />
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-semibold text-gray-800 truncate">{book.title}</h4>
                    <p className="text-xs text-green-600 font-bold mt-1">
                      {book.price?.toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                </li>
              ))}
              {/* Nút Xem tất cả kết quả */}
              <li
                className="p-3 text-center text-sm text-blue-600 font-semibold hover:bg-blue-50 cursor-pointer transition"
                onClick={emitSearch}
              >
                Xem tất cả kết quả cho "{searchQuery}"
              </li>
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm italic">
              Không tìm thấy sách nào phù hợp.
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default InputSearch;