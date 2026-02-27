import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';
import { useFavoritesStore } from '../stores/useFavoritesStore';
import { useCartStore } from '../stores/useCartStore';

const ViewAllBooks = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const genreFromUrl = searchParams.get('genre') || '';

  const [allBooks, setAllBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [title, setTitle] = useState('Tất cả sách');
  const booksPerPage = 21;

  // Lấy hàm từ Store (Zustand thay cho Composables của Vue)
  const { isFavorite, toggleFavorite, fetchFavorites } = useFavoritesStore();
  const { addToCart } = useCartStore();

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        if (genreFromUrl) {
          const { data } = await axios.get(`http://localhost:5000/api/books?genre=${genreFromUrl}`);
          setAllBooks(data);
          setTitle(`Thể loại: ${genreFromUrl}`);
        } else {
          // Lấy tất cả sách
          const { data } = await axios.get(`http://localhost:5000/api/books`);
          setAllBooks(data);
          setTitle('Tất cả sách');
        }
      } catch (error) {
        console.error('Lỗi khi tải sách:', error);
      }
    };
    fetchBooks();
    setCurrentPage(1); // Reset page khi đổi thể loại
  }, [genreFromUrl]);

  // Tính toán Pagination
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
    <div className="p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
        {paginatedBooks.map(book => (
          <div key={book._id} className="bg-white rounded-2xl shadow p-3 flex flex-col hover:shadow-lg transition-shadow min-h-[300px]">
            <img
              src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
              alt={book.title}
              className="w-full h-48 object-cover rounded-t-2xl cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => navigate(`/books/${book._id}`)}
            />
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <h2 className="font-bold text-sm text-left line-clamp-2 leading-tight mt-2">{book.title}</h2>
                <p className="text-xs text-gray-600 text-left mt-1">{book.author}</p>
              </div>
              <div className="flex justify-between items-center mt-3">
                <p className="text-green-600 text-sm font-semibold">{book.price.toLocaleString()}₫</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleFavorite(book)}>
                    <FontAwesomeIcon
                      icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                      className={isFavorite(book._id) ? 'text-red-500' : 'text-gray-500'}
                    />
                  </button>
                  <button onClick={() => addToCart(book)} className="text-black hover:text-green-600">
                    <FontAwesomeIcon icon={['fas', 'bag-shopping']} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} className="mt-8" />
    </div>
  );
};

export default ViewAllBooks;