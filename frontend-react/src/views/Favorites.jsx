import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../composables/useCart';
import { useFavorites } from '../composables/useFavorites';

const Favorites = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);

  const { addToCart } = useCart();
  const { fetchFavorites, toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    const loadFavorites = async () => {
      const favoriteBooks = await fetchFavorites();
      setBooks(favoriteBooks || []);
    };
    loadFavorites();
  }, [fetchFavorites]);

  const handleToggleFavorite = async (book) => {
    // Gọi hàm toggleFavorite và truyền callback để tự xoá khỏi màn hình hiện tại
    await toggleFavorite(book, (id) => {
      setBooks((prevBooks) => prevBooks.filter((b) => b._id !== id));
    });
  };

  return (
    <div className="p-4 min-h-screen max-w-7xl mx-auto">
      <h2 className="text-2xl font-semibold text-center mt-6">Sách Yêu Thích</h2>
      <p className="text-lg mb-10 text-center text-gray-700">
        Danh sách giá sách được tôi tuyển chọn để sắp xếp tất cả những cuốn sách yêu thích.
      </p>

      {books.length === 0 ? (
        <div className="text-gray-500 text-center text-xl mt-10">
          Chưa có sách nào được yêu thích.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {books.map((book) => (
            <div
              key={book._id}
              className="shadow-md rounded-lg flex flex-col justify-between relative overflow-hidden bg-white border"
            >
              {/* Ảnh */}
              <div className="relative group">
                <img
                  src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                  alt="Book"
                  className="w-full h-80 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                  onClick={() => navigate(`/books/${book._id}`)}
                />
                <button
                  onClick={() => handleToggleFavorite(book)}
                  className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-gray-100 transition shadow"
                  title="Bỏ khỏi yêu thích"
                >
                  <FontAwesomeIcon
                    icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                    className={isFavorite(book._id) ? 'text-red-500' : 'text-black'}
                  />
                </button>
              </div>

              {/* Thông tin */}
              <div className="p-4 flex flex-col flex-grow">
                <h2 className="font-bold text-sm mt-1 line-clamp-2 h-10">{book.title}</h2>
                <p className="text-green-600 text-sm font-semibold mt-2 mb-4">
                  {book.price.toLocaleString('vi-VN')}₫
                </p>

                {/* Nút thêm vào giỏ */}
                <button
                  onClick={() => addToCart(book)}
                  className="mt-auto w-full py-2 hover-flip-btn rounded"
                >
                  Thêm vào giỏ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;