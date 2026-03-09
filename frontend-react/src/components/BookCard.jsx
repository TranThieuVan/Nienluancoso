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
        <div className="min-w-[160px]   md:w-[16.6667%] sm:w-[33.3333%] bg-white shadow-md rounded-2xl flex flex-col hover:shadow-lg transition-shadow min-h-[300px]">
            {/* Ảnh bìa sách */}
            <div className="overflow-hidden rounded-t-2xl shrink-0">
                <img
                    src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                    alt={book.title || "Book Cover"}
                    className="w-full h-48 object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
                    onClick={() => goToDetail(book._id)}
                />
            </div>

            {/* Thông tin sách */}
            <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                    <h2
                        className="font-bold text-sm text-left line-clamp-2 leading-tight cursor-pointer hover:text-blue-600"
                        title={book.title}
                        onClick={() => goToDetail(book._id)}
                    >
                        {book.title}
                    </h2>
                    <p className="text-xs text-gray-600 text-left mt-1 line-clamp-1">{book.author}</p>
                </div>

                {/* Giá tiền + Nút chức năng */}
                <div className="flex justify-between items-center mt-3 shrink-0">
                    <p className="text-green-600 text-sm font-semibold">
                        {book.price?.toLocaleString('vi-VN')}₫
                    </p>
                    <div className="flex items-center gap-2">
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