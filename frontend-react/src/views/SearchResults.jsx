import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import BookCard from '../components/BookCard';
import Pagination from '../components/Pagination';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchAndFilterBooks = async () => {
      if (!query) {
        setFilteredBooks([]);
        return;
      }

      setIsLoading(true);
      try {
        // Đã sửa biến q thành biến query
        const res = await axios.get(`/api/books?search=${query}&page=${currentPage}`);
        setFilteredBooks(res.data.books || []);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        console.error('Lỗi khi tìm kiếm:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndFilterBooks();
  }, [query, currentPage]);

  // Reset về trang 1 khi đổi từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── PAGE HEADER ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-1">Tìm kiếm</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="text-3xl font-bold text-black">
              "{query}"
            </h1>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-xs tracking-widest uppercase text-stone-400">Đang tìm kiếm...</p>
          </div>
        ) : filteredBooks.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-5">
              {filteredBooks.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={changePage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-16 h-16 bg-stone-50 border border-gray-100 flex items-center justify-center">
              <FontAwesomeIcon icon={['fas', 'magnifying-glass']} className="text-xl text-stone-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-black mb-1">Không tìm thấy kết quả</p>
              <p className="text-sm text-stone-400">
                Không có sách nào phù hợp với từ khoá <span className="text-black font-medium">"{query}"</span>
              </p>
            </div>
            <div className="text-xs text-stone-400 mt-2 space-y-1 text-center">
              <p>Thử kiểm tra lại chính tả</p>
              <p>Hoặc tìm với từ khoá ngắn hơn</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;