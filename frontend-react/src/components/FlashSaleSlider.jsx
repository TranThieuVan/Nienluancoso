import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { imageUrl as getImageUrl } from '../config/api';

/* ─────────────────────────────────────────────
   HELPER: Lọc sách
───────────────────────────────────────────────*/
const resolveSaleBooks = (promotion, allBooks) => {
    if (!promotion || !allBooks?.length) return [];
    if (promotion.targetType === 'all') return allBooks.filter(b => b.discountedPrice != null && b.discountedPrice < b.price);
    if (promotion.targetType === 'genre') return allBooks.filter(b => b.genre === promotion.targetValue && b.discountedPrice != null && b.discountedPrice < b.price);
    if (promotion.targetType === 'book') {
        try {
            const configs = JSON.parse(promotion.targetValue);
            const ids = new Set(configs.map(c => c.bookId));
            return allBooks.filter(b => ids.has(String(b._id)) && b.discountedPrice != null && b.discountedPrice < b.price);
        } catch { return []; }
    }
    return [];
};

/* ─────────────────────────────────────────────
   HELPER: Countdown
───────────────────────────────────────────────*/
const useCountdown = (endDate) => {
    const calc = React.useCallback(() => {
        const diff = new Date(endDate) - Date.now();
        if (diff <= 0) return { h: '00', m: '00', s: '00', expired: true };
        const totalSec = Math.floor(diff / 1000);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return { h, m, s, expired: false };
    }, [endDate]);

    const [time, setTime] = useState(calc);
    React.useEffect(() => {
        setTime(calc());
        const id = setInterval(() => setTime(calc()), 1000);
        return () => clearInterval(id);
    }, [calc]);
    return time;
};

const Countdown = ({ endDate }) => {
    const { h, m, s, expired } = useCountdown(endDate);
    if (expired) return <span className="text-xs text-stone-500 tracking-wide">Đã kết thúc</span>;
    return (
        <div className="flex items-center gap-1.5">
            {[h, m, s].map((unit, i) => (
                <React.Fragment key={i}>
                    <div className="bg-white border border-gray-200 text-black text-xs font-bold font-mono w-8 h-8 flex items-center justify-center tabular-nums rounded shadow-sm">
                        {unit}
                    </div>
                    {i < 2 && <span className="text-stone-400 font-bold text-xs leading-none mb-0.5">:</span>}
                </React.Fragment>
            ))}
        </div>
    );
};

/* ─────────────────────────────────────────────
   SUB-COMPONENT: SaleBookCard
───────────────────────────────────────────────*/
const SaleBookCard = ({ book }) => {
    const navigate = useNavigate();
    const imgUrl = getImageUrl(book.image);
    // ✅ GÁN CỨNG: Luôn tính toán và hiển thị số tiền giảm VNĐ
    const diff = (book.price || 0) - (book.discountedPrice || 0);
    const discountLabel = diff > 0 ? `Giảm ${diff.toLocaleString('vi-VN')}₫` : null;

    return (
        <div
            onClick={() => navigate(`/books/${book._id}`)}
            className="group/card w-full bg-white border border-gray-100 hover:border-black hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-2 flex flex-col overflow-hidden"
        >
            <div className="relative bg-stone-50 aspect-[2/3] overflow-hidden flex items-center justify-center p-2">
                <img
                    src={imgUrl}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105 mix-blend-multiply"
                />
                {/* ✅ GIỮ NGUYÊN Ô MÀU ĐỎ ROSE TRUYỀN THỐNG */}
                {discountLabel && (
                    <div className="absolute top-2 left-2 bg-rose-500 text-white text-[15px] font-black px-2 py-1 tracking-tighter z-10 shadow-sm uppercase">
                        {discountLabel}
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-1 border-t border-gray-50">
                <h3 className="text-lg font-bold text-black line-clamp-2 leading-snug mb-1 group-hover/card:text-rose-600 transition-colors">{book.title}</h3>
                <p className="text-[15px] text-stone-500 truncate mb-4">{book.author}</p>
                <div className="mt-auto">
                    <p className="text-[14px] text-stone-400 line-through tabular-nums">{book.price?.toLocaleString('vi-VN')}₫</p>
                    <p className="text-lg font-black text-rose-600 leading-tight tabular-nums mt-0.5">{book.discountedPrice?.toLocaleString('vi-VN')}₫</p>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN: FlashSaleSlider
───────────────────────────────────────────────*/
const FlashSaleSlider = ({ promotions = [], allBooks = [] }) => {
    const navigate = useNavigate();

    const livePromotions = promotions.filter(p => {
        if (!p.isActive) return false;
        const now = Date.now();
        return new Date(p.startDate) <= now && new Date(p.endDate) >= now;
    });

    if (!livePromotions.length) return null;

    return (
        <section className="w-full bg-stone-50 border-y border-gray-200 py-16 flex flex-col">
            <div className="max-w-7xl mx-auto px-6 w-full flex-1 flex flex-col gap-16">

                {livePromotions.map((promotion) => {
                    const saleBooks = resolveSaleBooks(promotion, allBooks);
                    if (!saleBooks.length) return null;

                    const displayBooks = saleBooks.slice(0, 5);

                    return (
                        <div key={promotion._id} className="flex flex-col">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                                <div className="flex flex-col gap-2">
                                    <p className="text-[13px] tracking-[0.3em] uppercase font-bold text-gray-500 flex items-center gap-2">
                                        <FontAwesomeIcon icon={['fas', 'bolt']} className="text-black" /> Ưu đãi giới hạn
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-black uppercase">
                                            {promotion.name}
                                        </h2>
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-white bg-black px-2.5 py-1 uppercase">
                                            <span className="w-1.5 h-1.5 bg-white animate-pulse" /> Live
                                        </span>
                                    </div>
                                    {promotion.description && (
                                        <p className="text-sm mt-3 max-w-xl leading-relaxed text-gray-500">
                                            {promotion.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:items-end gap-5 shrink-0">
                                    <div className="flex items-center gap-3 bg-white px-5 py-3 border border-black">
                                        <span className="text-[12px] tracking-[0.2em] uppercase font-bold text-black">
                                            Kết thúc sau
                                        </span>
                                        <Countdown endDate={promotion.endDate} />
                                    </div>

                                    <button
                                        onClick={() => navigate(`/books?filter=sale&promo=${promotion._id}`)}
                                        className="text-[12px] tracking-[0.2em] uppercase font-bold text-black border-b-2 border-black pb-0.5 hover:text-gray-500 hover:border-gray-500 transition-colors"
                                    >
                                        Xem tất cả {saleBooks.length} sách
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                                {displayBooks.map(book => (
                                    <SaleBookCard
                                        key={book._id}
                                        book={book}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default FlashSaleSlider;