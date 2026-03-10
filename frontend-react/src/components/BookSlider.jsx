import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFavorites } from '../composables/useFavorites';
import { useCart } from '../composables/useCart';
import BookCard from './BookCard';

const EMPTY_ARRAY = [];
const BookSlider = ({ books: initialBooks = EMPTY_ARRAY, genre, title = 'Danh Sách Sách' }) => {
    const navigate = useNavigate();
    const scrollContainer = useRef(null);
    const [books, setBooks] = useState([]);

    // Khởi tạo các Custom Hook
    const { isFavorite, toggleFavorite, } = useFavorites();
    const { addToCart } = useCart();

    // Xử lý nạp dữ liệu sách
    useEffect(() => {
        const loadBooks = async () => {
            // Nếu không có sách truyền vào qua props thì tự fetch
            if (!initialBooks) {
                try {
                    const res = await axios.get('/api/books');
                    if (genre) {
                        setBooks(res.data.filter(b => b.genre === genre));
                    } else {
                        setBooks(res.data);
                    }
                } catch (err) {
                    console.error('Lỗi tải danh sách sách cho slider:', err);
                }
            } else {
                setBooks(initialBooks);
            }

        };

        loadBooks();
    }, [initialBooks, genre]);

    // Điều kiện hiển thị thanh điều hướng (scroll + xem tất cả)
    const shouldShowSlider = books.length > 8;

    // Chuyển hướng sang trang Xem tất cả
    const goToViewAll = () => {
        localStorage.setItem('viewAllBooks', JSON.stringify(books));
        navigate(`/books/view-all?title=${encodeURIComponent(title)}`, {
            state: { books }
        });
    };

    // Cuộn trái
    const scrollLeft = () => {
        if (scrollContainer.current) {
            const width = scrollContainer.current.clientWidth;
            scrollContainer.current.scrollLeft -= width * 0.5;
        }
    };

    const scrollRight = () => {
        if (scrollContainer.current) {
            const width = scrollContainer.current.clientWidth;
            scrollContainer.current.scrollLeft += width * 0.5;
        }
    };
    // Chuyển hướng đến chi tiết sách
    const goToDetail = (id) => {
        navigate(`/books/${id}`);
    };

    return (
        <div className="p-6">
            {/* Tiêu đề + nút scroll + xem tất cả */}
            <div className="flex justify-between items-center mb-4 flex-nowrap overflow-hidden">
                {/* Tiêu đề */}
                <h1 className="text-xl font-bold truncate">{title}</h1>

                {/* Nút scroll trái/phải + Xem tất cả */}
                <div className="flex items-center gap-2 mr-4 shrink-0">
                    {shouldShowSlider && (
                        <>
                            <button
                                className="bg-white p-2 shadow rounded-full hover:bg-gray-100 transition-colors"
                                onClick={scrollLeft}
                                aria-label="Scroll left"
                            >
                                <FontAwesomeIcon icon={['fas', 'angle-left']} className="bigger" />
                            </button>
                            <button
                                className="bg-white p-2 shadow rounded-full hover:bg-gray-100 transition-colors"
                                onClick={scrollRight}
                                aria-label="Scroll right"
                            >
                                <FontAwesomeIcon icon={['fas', 'angle-right']} className="bigger" />
                            </button>
                            <button
                                onClick={goToViewAll}
                                className="text-blue-600 text-sm hover:underline ml-2"
                            >
                                Xem tất cả
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Danh sách sách dạng ngang */}
            <div
                ref={scrollContainer}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {books.map((book) => (
                    // Đã thêm key={book._id} vào thẻ bọc ngoài cùng
                    <div key={book._id} className="swiper-slide-custom">
                        <BookCard book={book} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookSlider;