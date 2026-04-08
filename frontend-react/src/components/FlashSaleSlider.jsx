import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
        <div className="flex items-center gap-1">
            {[h, m, s].map((unit, i) => (
                <React.Fragment key={i}>
                    {/* Thiết kế đồng hồ màu trắng trên nền đen */}
                    <div className="bg-white text-black text-xs font-bold font-mono w-7 h-7 flex items-center justify-center tabular-nums rounded-sm">
                        {unit}
                    </div>
                    {i < 2 && <span className="text-white font-bold text-xs leading-none mb-0.5">:</span>}
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
    const discountPercent = Math.round(((book.price - book.discountedPrice) / book.price) * 100);
    const imgUrl = book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`;

    return (
        <div
            onClick={() => navigate(`/books/${book._id}`)}
            // Thêm viền xám tối mờ để tách biệt sách với nền đen
            className="group/card w-full bg-stone-900 border border-stone-800 hover:border-red-500 cursor-pointer transition-all duration-300 hover:-translate-y-2 flex flex-col overflow-hidden"
        >
            <div className="relative bg-stone-800 aspect-[2/3] overflow-hidden">
                <img src={imgUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105 opacity-90 group-hover/card:opacity-100" />
                <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 tracking-widest z-10">
                    -{discountPercent}%
                </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1">{book.title}</h3>
                <p className="text-[11px] text-stone-400 truncate mb-4">{book.author}</p>
                <div className="mt-auto">
                    <p className="text-[11px] text-stone-500 line-through tabular-nums">{book.price?.toLocaleString('vi-VN')}₫</p>
                    <p className="text-base font-bold text-red-500 leading-tight tabular-nums mt-0.5">{book.discountedPrice?.toLocaleString('vi-VN')}₫</p>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN: FlashSaleSlider (1 Div Đen Toàn Màn Hình)
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
        // Bọc toàn bộ trong 1 thẻ div đen, min-h-screen, co giãn theo nội dung
        <section className="w-full bg-black text-white min-h-screen py-20 lg:py-28 flex flex-col">
            <div className="max-w-7xl mx-auto px-6 w-full flex-1 flex flex-col gap-24">

                {livePromotions.map((promotion) => {
                    const saleBooks = resolveSaleBooks(promotion, allBooks);
                    if (!saleBooks.length) return null;

                    const displayBooks = saleBooks.slice(0, 5);

                    return (
                        <div key={promotion._id} className="flex flex-col">

                            {/* Tiêu đề & Đồng hồ đếm ngược */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                                <div className="flex flex-col gap-2">
                                    <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-stone-400">
                                        Sự kiện đặc biệt
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                                            {promotion.name}
                                        </h2>
                                        <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest text-white bg-red-600 px-2 py-1 uppercase rounded-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                                        </span>
                                    </div>
                                    {promotion.description && (
                                        <p className="text-sm mt-3 max-w-xl leading-relaxed text-stone-400">
                                            {promotion.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:items-end gap-4 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-stone-400">
                                            Kết thúc sau
                                        </span>
                                        <Countdown endDate={promotion.endDate} />
                                    </div>
                                    <button
                                        // Gắn param filter=sale và promo=id để trang ViewAllBook tự mở bộ lọc
                                        onClick={() => navigate(`/books?filter=sale&promo=${promotion._id}`)}
                                        className="text-xs font-semibold tracking-widest uppercase border-b border-stone-500 pb-1 transition-colors text-stone-300 hover:text-white hover:border-white"
                                    >
                                        Xem tất cả {saleBooks.length} sách →
                                    </button>
                                </div>
                            </div>

                            {/* Lưới 5 sách */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                                {displayBooks.map(book => (
                                    <SaleBookCard key={book._id} book={book} />
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