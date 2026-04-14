import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';
import { useFavorites } from '../composables/useFavorites';
import BookCard from '../components/BookCard'; // ✅ 1. Import BookCard vào

const ViewAllBooks = () => {
  const [searchParams] = useSearchParams();
  const genreFromUrl = searchParams.get('genre') || '';

  const [books, setBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooksCount, setTotalBooksCount] = useState(0);

  const [title, setTitle] = useState('Tất cả sách');
  const [isLoading, setIsLoading] = useState(true);
  const booksPerPage = 21;

  // ✅ 2. Xóa useNavigate, useCart, isFavorite... Chỉ giữ lại fetchFavorites
  const { fetchFavorites } = useFavorites();

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Gọi API mỗi khi trang hiện tại hoặc thể loại thay đổi
  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      try {
        let apiUrl = `http://localhost:5000/api/books?page=${currentPage}&limit=${booksPerPage}`;
        if (genreFromUrl) {
          apiUrl += `&genre=${genreFromUrl}`;
          setTitle(genreFromUrl);
        } else {
          setTitle('Tất cả sách');
        }

        const { data } = await axios.get(apiUrl);

        setBooks(data.books);
        setTotalPages(data.totalPages);
        setTotalBooksCount(data.totalBooks);

      } catch (error) {
        console.error('Lỗi khi tải sách:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooks();
  }, [genreFromUrl, currentPage]);

  // Reset về trang 1 nếu đổi thể loại
  useEffect(() => {
    setCurrentPage(1);
  }, [genreFromUrl]);

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── PAGE HEADER ── */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-2">
            {genreFromUrl ? 'Thể loại' : 'Thư viện'}
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl font-bold text-black">{title}</h1>
            {!isLoading && (
              <p className="text-sm text-stone-400 pb-1">{totalBooksCount} đầu sách</p>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-xs tracking-widest uppercase text-stone-400">Đang tải...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-24">
            <FontAwesomeIcon icon={['far', 'folder-open']} className="text-4xl text-stone-200 mb-4" />
            <p className="text-stone-400 text-sm">Không có sách nào trong thể loại này.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-5">
              {/* ✅ 3. Xóa BookGridCard cồng kềnh, chỉ cần gọi BookCard và truyền đúng data book */}
              {books.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>

            <div className="mt-14">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewAllBooks;