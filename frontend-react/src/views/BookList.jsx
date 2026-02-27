import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../components/Pagination';

// Import 2 Custom Hooks chúng ta đã tạo
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
  const perPage = 20;

  // Lấy các hàm xử lý từ Custom Hooks
  const { toggleFavorite, isFavorite, fetchFavorites } = useFavorites();
  const { addToCart } = useCart();

  const fetchBooks = async () => {
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
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchBooks();
      const genreRes = await axios.get('/api/books/genres');
      setGenres(genreRes.data);
      await fetchFavorites(); // Lấy danh sách ID sách yêu thích
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
        case 'title':
          result.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'priceHigh':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'priceLow':
          result.sort((a, b) => a.price - b.price);
          break;
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

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="mx-auto flex flex-col md:flex-row gap-6">

        {/* Bộ lọc bên trái */}
        <div className="md:w-1/4 bg-white p-4 rounded-xl shadow h-fit">
          <label className="block text-lg font-medium text-gray-700 mb-1">Tìm theo tên sách</label>
          <input
            value={searchTitle}
            onChange={(e) => { setSearchTitle(e.target.value); setPage(1); }}
            type="text"
            placeholder="Nhập tên sách..."
            className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring focus:border-blue-300"
          />

          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">Thể loại</label>
            <div className="space-y-2">
              {genres.map(genre => (
                <div key={genre} className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedGenre(genre); setPage(1); }}>
                  <input type="radio" checked={selectedGenre === genre} readOnly className="accent-red-500" />
                  <span className="text-lg">{genre}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 cursor-pointer mt-2" onClick={() => { setSelectedGenre(''); setPage(1); }}>
                <input type="radio" checked={selectedGenre === ''} readOnly className="accent-red-500" />
                <span className="text-lg font-medium">Tất cả</span>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách sách bên phải */}
        <div className="md:w-3/4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {selectedGenre ? `Thể loại: ${selectedGenre}` : 'Tất cả sách'}
            </h2>
            <div className="w-48">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border shadow-sm focus:outline-none focus:ring focus:border-blue-300"
              >
                <option value="title">Tên A → Z</option>
                <option value="sold">Mua nhiều nhất</option>
                <option value="priceHigh">Giá cao nhất</option>
                <option value="priceLow">Giá thấp nhất</option>
              </select>
            </div>
          </div>

          {paginatedBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginatedBooks.map(book => (
                <div key={book._id} className="bg-white rounded-2xl shadow p-3 flex flex-col hover:shadow-lg transition-shadow min-h-[300px]">
                  <img
                    src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                    alt="Book Cover"
                    className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300 rounded-t-2xl"
                    onClick={() => navigate(`/books/${book._id}`)}
                  />
                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div>
                      <h2 className="font-bold text-sm text-left line-clamp-2 leading-tight mt-3" title={book.title}>
                        {book.title}
                      </h2>
                      <p className="text-xs text-gray-500 text-left mt-1 line-clamp-1">{book.author}</p>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-green-600 text-sm font-bold">{book.price.toLocaleString()}₫</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleFavorite(book)}
                          className="transition-transform hover:scale-110"
                        >
                          <FontAwesomeIcon
                            icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                            className={`text-lg ${isFavorite(book._id) ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                          />
                        </button>
                        <button
                          onClick={() => addToCart(book)}
                          className="text-gray-700 hover:text-green-600 transition-transform hover:scale-110"
                        >
                          <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-lg" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500 text-lg bg-white rounded-xl shadow">
              Không tìm thấy cuốn sách nào phù hợp.
            </div>
          )}

          {totalPages > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-8 flex justify-center"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BookList;