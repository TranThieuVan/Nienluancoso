import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFavorites } from '../composables/useFavorites';
import { useCart } from '../composables/useCart';
import BookCard from './BookCard';

const EMPTY_ARRAY = [];

// ✨ Thêm prop isFlashSale để thay đổi UI nếu cần
const BookSlider = ({ books: initialBooks = EMPTY_ARRAY, genre, title = '', isFlashSale = false }) => {
    const navigate = useNavigate();
    const scrollContainer = useRef(null);
    const [books, setBooks] = useState([]);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const { isFavorite, toggleFavorite } = useFavorites();
    const { addToCart } = useCart();

    useEffect(() => {
        const loadBooks = async () => {
            if (!initialBooks || initialBooks.length === 0) {
                try {
                    const res = await axios.get('/api/books');
                    setBooks(genre ? res.data.filter(b => b.genre === genre) : res.data);
                } catch (err) {
                    console.error('Lỗi tải sách cho slider:', err);
                }
            } else {
                setBooks(initialBooks);
            }
        };
        loadBooks();
    }, [initialBooks, genre]);

    const updateScrollButtons = () => {
        const el = scrollContainer.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };

    useEffect(() => {
        const el = scrollContainer.current;
        if (!el) return;
        updateScrollButtons();
        el.addEventListener('scroll', updateScrollButtons);
        window.addEventListener('resize', updateScrollButtons);
        return () => {
            el.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, [books]);

    const shouldShowControls = books.length > 5;

    const goToViewAll = () => {
        if (isFlashSale) {
            navigate(`/books?filter=sale`);
        } else if (genre) {
            navigate(`/books/view-all?genre=${encodeURIComponent(genre)}`);
        } else {
            navigate('/books/view-all', { state: { books } });
        }
    };

    const scrollLeft = () => {
        if (scrollContainer.current) {
            scrollContainer.current.scrollLeft -= scrollContainer.current.clientWidth * 0.6;
        }
    };

    const scrollRight = () => {
        if (scrollContainer.current) {
            scrollContainer.current.scrollLeft += scrollContainer.current.clientWidth * 0.6;
        }
    };

    if (books.length === 0) return null;

    return (
        <div className="relative group">
            {/* ── Header ── */}
            {/* Ẩn header mặc định nếu là Flash Sale (vì Flash Sale đã có header xịn ở Home.jsx rồi) */}
            {!isFlashSale && (title || shouldShowControls) && (
                <div className="flex items-center justify-between mb-6">
                    {title && (
                        <h2 className="text-lg font-bold text-black truncate pr-4">{title}</h2>
                    )}

                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        {shouldShowControls && (
                            <>
                                <button
                                    onClick={scrollLeft}
                                    disabled={!canScrollLeft}
                                    className={`w-8 h-8 flex items-center justify-center border transition-all duration-200 ${canScrollLeft ? 'border-stone-300 text-stone-600 hover:border-black hover:text-black' : 'border-stone-100 text-stone-200 cursor-not-allowed'}`}
                                    aria-label="Scroll left"
                                >
                                    <FontAwesomeIcon icon={['fas', 'angle-left']} className="text-xs" />
                                </button>
                                <button
                                    onClick={scrollRight}
                                    disabled={!canScrollRight}
                                    className={`w-8 h-8 flex items-center justify-center border transition-all duration-200 ${canScrollRight ? 'border-stone-300 text-stone-600 hover:border-black hover:text-black' : 'border-stone-100 text-stone-200 cursor-not-allowed'}`}
                                    aria-label="Scroll right"
                                >
                                    <FontAwesomeIcon icon={['fas', 'angle-right']} className="text-xs" />
                                </button>
                                <button
                                    onClick={goToViewAll}
                                    className="ml-1 text-xs tracking-widest uppercase text-stone-400 hover:text-black transition-colors border-b border-transparent hover:border-stone-400 pb-0.5"
                                >
                                    Xem tất cả
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ✨ Thêm nút cuộn nổi bên trên cho chế độ Flash Sale */}
            {isFlashSale && shouldShowControls && (
                <>
                    <button
                        onClick={scrollLeft}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 ${!canScrollLeft && 'hidden'}`}
                    >
                        <FontAwesomeIcon icon={['fas', 'angle-left']} />
                    </button>
                    <button
                        onClick={scrollRight}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 ${!canScrollRight && 'hidden'}`}
                    >
                        <FontAwesomeIcon icon={['fas', 'angle-right']} />
                    </button>
                </>
            )}

            {/* ── Book List ── */}
            <div
                ref={scrollContainer}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {books.map((book) => (
                    <div
                        key={book._id}
                        className="flex-shrink-0 w-[160px] sm:w-[180px] transition-transform duration-300 hover:-translate-y-1"
                    >
                        {/* Bọc BookCard trong div có theme tối nếu là Flash Sale để phù hợp viền Electric */}
                        <div className={isFlashSale ? "bg-white/5 rounded-xl overflow-hidden shadow-lg border border-white/10" : ""}>
                            <BookCard book={book} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookSlider;