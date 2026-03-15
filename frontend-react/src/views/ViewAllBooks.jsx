import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';
import { useFavorites } from '../composables/useFavorites';
import { useCart } from '../composables/useCart';

const ViewAllBooks = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const genreFromUrl = searchParams.get('genre') || '';

  const [allBooks, setAllBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [title, setTitle] = useState('Tất cả sách');
  const [isLoading, setIsLoading] = useState(true);
  const booksPerPage = 21;

  const { isFavorite, toggleFavorite, fetchFavorites } = useFavorites();
  const { addToCart } = useCart();

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      try {
        if (genreFromUrl) {
          const { data } = await axios.get(`http://localhost:5000/api/books?genre=${genreFromUrl}`);
          setAllBooks(data);
          setTitle(genreFromUrl);
        } else {
          const { data } = await axios.get(`http://localhost:5000/api/books`);
          setAllBooks(data);
          setTitle('Tất cả sách');
        }
      } catch (error) {
        console.error('Lỗi khi tải sách:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooks();
    setCurrentPage(1);
  }, [genreFromUrl]);

  const totalPages = Math.ceil(allBooks.length / booksPerPage);
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * booksPerPage;
    return allBooks.slice(start, start + booksPerPage);
  }, [allBooks, currentPage]);

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
              <p className="text-sm text-stone-400 pb-1">{allBooks.length} đầu sách</p>
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
        ) : paginatedBooks.length === 0 ? (
          <div className="text-center py-24">
            <FontAwesomeIcon icon={['far', 'folder-open']} className="text-4xl text-stone-200 mb-4" />
            <p className="text-stone-400 text-sm">Không có sách nào trong thể loại này.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-5">
              {paginatedBooks.map((book, i) => (
                <BookGridCard
                  key={book._id}
                  book={book}
                  isFavorite={isFavorite}
                  toggleFavorite={toggleFavorite}
                  addToCart={addToCart}
                  navigate={navigate}
                  index={i}
                />
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

/* ── Extracted Book Card Component ── */
const BookGridCard = ({ book, isFavorite, toggleFavorite, addToCart, navigate, index }) => {
  const [hovered, setHovered] = useState(false);
  const imgSrc = book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`;

  return (
    <div
      className="group bg-white flex flex-col transition-all duration-300"
      style={{ animationDelay: `${index * 30}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-stone-50 aspect-[2/3]">
        <img
          src={imgSrc}
          alt={book.title}
          className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
          onClick={() => navigate(`/books/${book._id}`)}
        />

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-end justify-center pb-4 gap-3 transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(book); }}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors shadow-sm"
            title={isFavorite(book._id) ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <FontAwesomeIcon
              icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
              className={isFavorite(book._id) ? 'text-red-500 text-sm' : 'text-stone-600 text-sm'}
            />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); addToCart(book); }}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors shadow-sm"
            title="Thêm vào giỏ"
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
        <h3 className="text-xs font-semibold text-black line-clamp-2 leading-snug">{book.title}</h3>
        <p className="text-[11px] text-stone-400 mt-1 truncate">{book.author}</p>
        <p className="text-sm font-bold text-black mt-2">{book.price.toLocaleString('vi-VN')}₫</p>
      </div>
    </div>
  );
};

export default ViewAllBooks;