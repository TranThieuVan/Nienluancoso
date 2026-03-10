import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFavorites } from '../composables/useFavorites';
import { useCart } from '../composables/useCart';

const BookCard = ({ book }) => {
    const navigate = useNavigate();
    const { isFavorite, toggleFavorite } = useFavorites();
    const { addToCart } = useCart();

    const goToDetail = (id) => {
        navigate(`/books/${id}`);
        window.scrollTo(0, 0);
    };

    if (!book) return null;

    return (
        <div className="min-w-[160px] md:w-[16.6667%] sm:w-[33.3333%] bg-white shadow-md rounded-2xl flex flex-col hover:shadow-lg transition-shadow min-h-[300px">
            {/* Ảnh bìa sách */}
            <div className="overflow-hidden rounded-t-2xl shrink-0 relative">
                <img
                    src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                    alt={book.title || "Book Cover"}
                    className="w-full h-48 object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
                    onClick={() => goToDetail(book._id)}
                />

                {book.discountedPrice && book.discountedPrice < book.price && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                        -{Math.round((1 - book.discountedPrice / book.price) * 100)}%
                    </div>
                )}
            </div>

            {/* Thông tin sách */}
            <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden">

                {/* Khối tiêu đề + tác giả */}
                <div className="flex flex-col" style={{ minHeight: 'calc(0.875rem * 1.25 * 2 + 1rem + 4px)' }}>
                    <h2
                        className="font-bold text-sm text-left leading-tight cursor-pointer hover:text-blue-600 w-full"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                        title={book.title}
                        onClick={() => goToDetail(book._id)}
                    >
                        {book.title}
                    </h2>
                    <p className="text-xs text-gray-600 text-left line-clamp-1 mt-1">{book.author}</p>
                </div>
                {/* Giá tiền + Nút chức năng */}
                <div className="flex justify-between items-end shrink-0 ">

                    {/* Khu vực giá */}
                    <div className="flex flex-col text-left">
                        {book.discountedPrice && book.discountedPrice < book.price ? (
                            <>
                                <span className="text-red-500 text-xs line-through mb-0.5 font-medium">
                                    {book.price?.toLocaleString('vi-VN')}₫
                                </span>
                                <span className="text-green-600 text-base font-bold">
                                    {book.discountedPrice?.toLocaleString('vi-VN')}₫
                                </span>
                            </>
                        ) : (
                            <span className="text-green-600 text-base font-bold">
                                {book.price?.toLocaleString('vi-VN')}₫
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mb-0.5">
                        <button onClick={() => toggleFavorite(book)}>
                            <FontAwesomeIcon
                                icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                                className={`hover:text-red-600 bigger transition-colors ${isFavorite(book._id) ? 'text-red-500' : 'text-gray-500'}`}
                            />
                        </button>
                        <button onClick={() => addToCart(book)} className="text-gray-800 hover:text-green-600 bigger transition-colors">
                            <FontAwesomeIcon icon={['fas', 'bag-shopping']} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookCard;