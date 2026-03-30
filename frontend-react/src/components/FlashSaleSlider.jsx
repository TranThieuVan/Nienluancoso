import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/* ─────────────────────────────────────────────
   HELPER: Resolve which books belong to a promotion
───────────────────────────────────────────────*/
const resolveSaleBooks = (promotion, allBooks) => {
    if (!promotion || !allBooks?.length) return [];

    if (promotion.targetType === 'all') {
        return allBooks.filter(b => b.discountedPrice != null && b.discountedPrice < b.price);
    }

    if (promotion.targetType === 'genre') {
        return allBooks.filter(
            b => b.genre === promotion.targetValue &&
                b.discountedPrice != null &&
                b.discountedPrice < b.price
        );
    }

    if (promotion.targetType === 'book') {
        try {
            const configs = JSON.parse(promotion.targetValue);
            const ids = new Set(configs.map(c => c.bookId));
            return allBooks.filter(
                b => ids.has(String(b._id)) &&
                    b.discountedPrice != null &&
                    b.discountedPrice < b.price
            );
        } catch {
            return [];
        }
    }

    return [];
};

/* ─────────────────────────────────────────────
   HELPER: Countdown to endDate
───────────────────────────────────────────────*/
const useCountdown = (endDate) => {
    const calc = useCallback(() => {
        const diff = new Date(endDate) - Date.now();
        if (diff <= 0) return { h: '00', m: '00', s: '00', expired: true };
        const totalSec = Math.floor(diff / 1000);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return { h, m, s, expired: false };
    }, [endDate]);

    const [time, setTime] = useState(calc);

    useEffect(() => {
        setTime(calc());
        const id = setInterval(() => setTime(calc()), 1000);
        return () => clearInterval(id);
    }, [calc]);

    return time;
};

/* ─────────────────────────────────────────────
   SUB-COMPONENT: Countdown display
───────────────────────────────────────────────*/
const Countdown = ({ endDate }) => {
    const { h, m, s, expired } = useCountdown(endDate);

    if (expired) return (
        <span className="text-xs text-stone-400 tracking-wide">Đã kết thúc</span>
    );

    return (
        <div className="flex items-center gap-1">
            {[h, m, s].map((unit, i) => (
                <React.Fragment key={i}>
                    <div className="bg-black text-white text-xs font-bold font-mono w-7 h-7 flex items-center justify-center tabular-nums">
                        {unit}
                    </div>
                    {i < 2 && <span className="text-black font-bold text-xs leading-none mb-0.5">:</span>}
                </React.Fragment>
            ))}
        </div>
    );
};

/* ─────────────────────────────────────────────
   SUB-COMPONENT: Single book card
───────────────────────────────────────────────*/
const SaleBookCard = ({ book }) => {
    const navigate = useNavigate();
    const discountPercent = Math.round(
        ((book.price - book.discountedPrice) / book.price) * 100
    );

    return (
        <div
            onClick={() => navigate(`/books/${book._id}`)}
            className="group/card flex-shrink-0 w-[158px] md:w-[185px] bg-white border border-gray-100 hover:border-stone-400 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col"
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

                {/* Discount badge */}
                <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-2.5 py-1 tracking-widest">
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
                    <p className="text-[11px] text-stone-400 line-through tabular-nums">
                        {book.price?.toLocaleString('vi-VN')}₫
                    </p>
                    <p className="text-base font-bold text-black leading-tight tabular-nums">
                        {book.discountedPrice?.toLocaleString('vi-VN')}₫
                    </p>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN: FlashSaleSlider
   Props:
     promotions  – array of Promotion docs from /api/promotions
     allBooks    – array of all Book docs (already fetched in Home)
───────────────────────────────────────────────*/
const FlashSaleSlider = ({ promotions = [], allBooks = [] }) => {
    const navigate = useNavigate();
    const scrollContainer = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    // Pick only currently-active, non-expired promotions
    const livePromotions = promotions.filter(p => {
        if (!p.isActive) return false;
        const now = Date.now();
        return new Date(p.startDate) <= now && new Date(p.endDate) >= now;
    });

    const promotion = livePromotions[activeIndex] ?? null;
    const saleBooks = resolveSaleBooks(promotion, allBooks);

    /* ── Scroll state ── */
    const updateScrollButtons = useCallback(() => {
        const el = scrollContainer.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    }, []);

    useEffect(() => {
        const el = scrollContainer.current;
        if (!el) return;
        el.scrollLeft = 0;
        updateScrollButtons();
        el.addEventListener('scroll', updateScrollButtons);
        window.addEventListener('resize', updateScrollButtons);
        return () => {
            el.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, [saleBooks, updateScrollButtons]);

    const scrollLeft = () => {
        if (scrollContainer.current)
            scrollContainer.current.scrollLeft -= scrollContainer.current.clientWidth * 0.7;
    };
    const scrollRight = () => {
        if (scrollContainer.current)
            scrollContainer.current.scrollLeft += scrollContainer.current.clientWidth * 0.7;
    };

    if (!livePromotions.length || !saleBooks.length) return null;

    return (
        <section className="max-w-7xl mx-auto px-6 py-14 border-b border-gray-100">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">

                <div className="flex flex-col gap-2">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400">
                        Ưu đãi có hạn
                    </p>

                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold text-black leading-tight">
                            {promotion.name}
                        </h2>

                        {/* Live pill */}
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-white bg-black px-2.5 py-1 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Live
                        </span>
                    </div>

                    {promotion.description && (
                        <p className="text-xs text-stone-400 max-w-md leading-relaxed">
                            {promotion.description}
                        </p>
                    )}
                </div>

                {/* Right: countdown + CTA */}
                <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-stone-500">
                            Kết thúc sau
                        </span>
                        <Countdown endDate={promotion.endDate} />
                    </div>

                    <button
                        onClick={() => navigate('/books?filter=sale')}
                        className="text-[11px] font-semibold tracking-wider uppercase text-black border-b border-black pb-0.5 hover:text-stone-500 hover:border-stone-500 transition-colors duration-200 w-fit"
                    >
                        Xem tất cả →
                    </button>
                </div>
            </div>

            {/* ── Promotion tabs (if multiple live promotions) ── */}
            {livePromotions.length > 1 && (
                <div className="flex gap-2 mb-5 flex-wrap">
                    {livePromotions.map((p, i) => (
                        <button
                            key={p._id}
                            onClick={() => setActiveIndex(i)}
                            className={`text-[11px] font-semibold px-3 py-1.5 border transition-all duration-200 ${i === activeIndex
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-stone-500 border-gray-200 hover:border-stone-400 hover:text-black'
                                }`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Slider ── */}
            <div className="relative group">

                <button
                    onClick={scrollLeft}
                    aria-label="Cuộn trái"
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 w-8 h-8 flex items-center justify-center border border-gray-200 bg-white text-stone-600 hover:border-black hover:text-black transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm ${!canScrollLeft ? 'pointer-events-none !opacity-0' : ''}`}
                >
                    <FontAwesomeIcon icon={['fas', 'angle-left']} className="text-xs" />
                </button>

                <button
                    onClick={scrollRight}
                    aria-label="Cuộn phải"
                    className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 w-8 h-8 flex items-center justify-center border border-gray-200 bg-white text-stone-600 hover:border-black hover:text-black transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm ${!canScrollRight ? 'pointer-events-none !opacity-0' : ''}`}
                >
                    <FontAwesomeIcon icon={['fas', 'angle-right']} className="text-xs" />
                </button>

                <div
                    ref={scrollContainer}
                    className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {saleBooks.map(book => (
                        <SaleBookCard key={book._id} book={book} />
                    ))}
                </div>
            </div>

            {/* ── Book count ── */}
            <p className="mt-2 text-[10px] text-stone-400 tracking-wide">
                {saleBooks.length} tựa sách đang được ưu đãi trong chiến dịch này
            </p>
        </section>
    );
};

export default FlashSaleSlider;