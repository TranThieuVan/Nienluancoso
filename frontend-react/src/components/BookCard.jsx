import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFavorites } from '../composables/useFavorites';
import { useCart } from '../composables/useCart';

const BookCard = ({ book }) => {
    const navigate = useNavigate();
    const { isFavorite, toggleFavorite } = useFavorites();
    const { addToCart } = useCart();
    const [hovered, setHovered] = useState(false);

    const goToDetail = (id) => {
        navigate(`/books/${id}`);
        window.scrollTo(0, 0);
    };

    if (!book) return null;

    const imgSrc = book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`;
    const hasDiscount = book.discountedPrice && book.discountedPrice < book.price;
    const discountPct = hasDiscount ? Math.round((1 - book.discountedPrice / book.price) * 100) : 0;

    return (
        <div
            // Đổi thành group/card để không bị xung đột với group của Slider
            className="group/card bg-white flex flex-col w-full transition-all duration-300"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => goToDetail(book._id)}
        >
            {/* ── Image ── */}
            <div className="relative overflow-hidden bg-stone-50 aspect-[2/3]">
                <img
                    src={imgSrc}
                    alt={book.title || 'Book Cover'}
                    // Sử dụng group-hover/card để chỉ nhận diện hover từ div cha gần nhất này
                    className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover/card:scale-105"
                    onClick={() => goToDetail(book._id)}
                />

                {/* Discount Badge */}
                {hasDiscount && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[12px] font-bold px-2 py-0.5 tracking-wide">
                        -{discountPct}%
                    </span>
                )}

                {/* Hover Action Overlay */}
                <div className={`absolute inset-0 bg-black/35 flex items-end justify-center pb-4 gap-3 transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
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

            {/* ── Info ── */}
            {/* ✅ 1. Thêm min-w-0 vào đây để các thẻ truncate bên trong được hoạt động */}
            <div className="py-3 flex flex-col flex-grow cursor-pointer min-w-0">

                {/* ✅ 2. Bỏ line-clamp-2 và thay bằng truncate */}
                <h2
                    className="text-[15px] font-semibold text-black truncate"
                    title={book.title}
                >
                    {book.title}
                </h2>

                {/* Tác giả đã có sẵn truncate */}
                <p className="text-[14px] text-stone-400 mt-1 truncate">
                    {book.author}
                </p>

                {/* ✅ 3. Thêm truncate vào cả khung giá tiền để không bao giờ bị rớt dòng */}
                <div className="mt-2 flex items-baseline gap-2 truncate">
                    {hasDiscount ? (
                        <>
                            <span className="text-lg font-bold text-black truncate">
                                {book.discountedPrice?.toLocaleString('vi-VN')}₫
                            </span>
                            <span className="text-[13px] text-stone-400 line-through truncate">
                                {book.price?.toLocaleString('vi-VN')}₫
                            </span>
                        </>
                    ) : (
                        <span className="text-lg font-bold text-black truncate">
                            {book.price?.toLocaleString('vi-VN')}₫
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookCard;