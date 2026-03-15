import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const FlashSaleSlider = ({ books }) => {
    const scrollContainer = useRef(null);
    const navigate = useNavigate();
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

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

    const scrollLeft = () => {
        if (scrollContainer.current)
            scrollContainer.current.scrollLeft -= scrollContainer.current.clientWidth * 0.7;
    };

    const scrollRight = () => {
        if (scrollContainer.current)
            scrollContainer.current.scrollLeft += scrollContainer.current.clientWidth * 0.7;
    };

    if (!books || books.length === 0) return null;

    return (
        <div className="relative group">

            {/* ── Scroll Buttons ── */}
            <button
                onClick={scrollLeft}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 w-8 h-8 flex items-center justify-center border border-gray-200 bg-white text-stone-600 hover:border-black hover:text-black transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm ${!canScrollLeft ? 'hidden' : ''}`}
            >
                <FontAwesomeIcon icon={['fas', 'angle-left']} className="text-xs" />
            </button>
            <button
                onClick={scrollRight}
                className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 w-8 h-8 flex items-center justify-center border border-gray-200 bg-white text-stone-600 hover:border-black hover:text-black transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm ${!canScrollRight ? 'hidden' : ''}`}
            >
                <FontAwesomeIcon icon={['fas', 'angle-right']} className="text-xs" />
            </button>

            {/* ── Book List ── */}
            <div
                ref={scrollContainer}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {books.map((book) => {
                    const discountPercent = Math.round(((book.price - book.discountedPrice) / book.price) * 100);

                    return (
                        <div
                            key={book._id}
                            onClick={() => navigate(`/books/${book._id}`)}
                            className="group/card flex-shrink-0 w-[170px] md:w-[200px] bg-white border border-gray-100 hover:border-stone-400 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col"
                        >
                            {/* Image */}
                            <div className="relative overflow-hidden bg-stone-50 aspect-[2/3]">
                                {book.image ? (
                                    <img
                                        src={book.image}
                                        alt={book.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">
                                        <FontAwesomeIcon icon={['fas', 'book']} />
                                    </div>
                                )}

                                {/* Discount Badge */}
                                <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-2.5 py-1 tracking-wide">
                                    -{discountPercent}%
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3 flex flex-col flex-1">
                                <h3 className="text-xs font-semibold text-black line-clamp-2 leading-snug mb-1">
                                    {book.title}
                                </h3>
                                <p className="text-[11px] text-stone-400 truncate mb-3">
                                    {book.author}
                                </p>

                                <div className="mt-auto">
                                    <p className="text-[11px] text-stone-400 line-through">
                                        {book.price?.toLocaleString('vi-VN')}₫
                                    </p>
                                    <p className="text-base font-bold text-black leading-tight">
                                        {book.discountedPrice?.toLocaleString('vi-VN')}₫
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FlashSaleSlider;