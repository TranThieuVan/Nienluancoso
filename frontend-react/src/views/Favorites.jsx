import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../composables/useCart';
import { useFavorites } from '../composables/useFavorites';

const Favorites = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { addToCart } = useCart();
  const { fetchFavorites, toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      const favoriteBooks = await fetchFavorites();
      setBooks(favoriteBooks || []);
      setIsLoading(false);
    };
    loadFavorites();
  }, [fetchFavorites]);

  const handleToggleFavorite = async (book) => {
    await toggleFavorite(book, (id) => {
      setBooks((prev) => prev.filter((b) => b._id !== id));
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── PAGE HEADER ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-2">Của tôi</p>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl font-bold text-black">Sách Yêu Thích</h1>
            {!isLoading && books.length > 0 && (
              <p className="text-sm text-stone-400 pb-1">{books.length} cuốn sách</p>
            )}
          </div>
          <p className="text-sm text-stone-500 mt-2 max-w-xl">
            Danh sách những cuốn sách được tôi tuyển chọn và yêu thích.
          </p>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-xs tracking-widest uppercase text-stone-400">Đang tải...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center">
              <FontAwesomeIcon icon={['far', 'heart']} className="text-2xl text-stone-300" />
            </div>
            <div className="text-center">
              <p className="text-black font-semibold mb-1">Chưa có sách yêu thích</p>
              <p className="text-stone-400 text-sm">Hãy khám phá và thêm những cuốn sách bạn yêu thích.</p>
            </div>
            <button
              onClick={() => navigate('/books')}
              className="mt-2 px-8 py-3 hover-flip-btn"
            >
              Khám phá sách
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book) => {
              const imgSrc = book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`;
              return (
                <div
                  key={book._id}
                  className="group bg-white flex flex-col transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden bg-stone-50 aspect-[2/3]">
                    <img
                      src={imgSrc}
                      alt={book.title}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                      onClick={() => navigate(`/books/${book._id}`)}
                    />

                    {/* Remove from favorites button */}
                    <button
                      onClick={() => handleToggleFavorite(book)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
                      title="Bỏ yêu thích"
                    >
                      <FontAwesomeIcon
                        icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                        className={isFavorite(book._id) ? 'text-red-500 text-sm' : 'text-stone-400 text-sm'}
                      />
                    </button>

                    {/* Always visible heart on mobile */}
                    <button
                      onClick={() => handleToggleFavorite(book)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm md:hidden"
                    >
                      <FontAwesomeIcon
                        icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                        className={isFavorite(book._id) ? 'text-red-500 text-sm' : 'text-stone-400 text-sm'}
                      />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="py-3 flex flex-col flex-grow">
                    <h3
                      className="text-xs font-semibold text-black line-clamp-2 leading-snug cursor-pointer hover:underline underline-offset-2"
                      onClick={() => navigate(`/books/${book._id}`)}
                    >
                      {book.title}
                    </h3>
                    <p className="text-[11px] text-stone-400 mt-1">{book.author}</p>
                    <p className="text-sm font-bold text-black mt-2 mb-3">
                      {book.price.toLocaleString('vi-VN')}₫
                    </p>

                    <button
                      onClick={() => addToCart(book)}
                      className="mt-auto w-full py-2 hover-flip-btn text-sm"
                    >
                      Thêm vào giỏ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;