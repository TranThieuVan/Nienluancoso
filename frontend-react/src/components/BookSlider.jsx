import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFavorites } from '../composables/useFavorites';
import { useCart } from '../composables/useCart';

const BookSlider = ({ books: initialBooks = [], genre, title = 'Danh Sách Sách' }) => {
    const navigate = useNavigate();
    const scrollContainer = useRef(null);
    const [books, setBooks] = useState([]);

    // Khởi tạo các Custom Hook
    const { isFavorite, toggleFavorite, fetchFavorites } = useFavorites();
    const { addToCart } = useCart();

    // Xử lý nạp dữ liệu sách
    useEffect(() => {
        const loadBooks = async () => {
            // Nếu không có sách truyền vào qua props thì tự fetch
            if (!initialBooks || initialBooks.length === 0) {
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

            await fetchFavorites();
        };

        loadBooks();
    }, [initialBooks, genre, fetchFavorites]);

    // Điều kiện hiển thị thanh điều hướng (scroll + xem tất cả)
    const shouldShowSlider = books.length > 6;

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
            scrollContainer.current.scrollLeft -= 900;
        }
    };

    // Cuộn phải
    const scrollRight = () => {
        if (scrollContainer.current) {
            scrollContainer.current.scrollLeft += 900;
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
                // Tailwind classes để ẩn scrollbar (ẩn trên Chrome/Safari/Firefox/IE)
                className="flex gap-4 overflow-x-auto scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {books.map((book) => (
                    <div
                        key={book._id}
                        className="min-w-[160px] w-40 md:w-[16.6667%] sm:w-[33.3333%] bg-white shadow-md rounded-2xl flex flex-col hover:shadow-lg transition-shadow min-h-[300px]"
                    >
                        <img
                            src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                            alt="Book Cover"
                            // Tailwind classes cho hiệu ứng hover phóng to ảnh giống file scoped css của Vue
                            className="w-full h-48 object-cover rounded-t-2xl cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
                            onClick={() => goToDetail(book._id)}
                        />
                        <div className="flex-1 p-3 flex flex-col justify-between h-full">
                            <div>
                                <h2 className="font-bold text-sm text-left line-clamp-2 leading-tight" title={book.title}>
                                    {book.title}
                                </h2>
                                <p className="text-xs text-gray-600 text-left mt-1 line-clamp-1">{book.author}</p>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <p className="text-green-600 text-sm font-semibold">
                                    {book.price.toLocaleString('vi-VN')}₫
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
                ))}
            </div>
        </div>
    );
};

export default BookSlider;