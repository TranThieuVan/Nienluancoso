import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import bannerImg from '../assets/image/banner.png';
import FlashSaleSlider from '../components/FlashSaleSlider';
import SplitText from '../components/SplitText';
// Lazy load heavy components
const BookSlider = lazy(() => import('../components/BookSlider'));
const TopSellingBooks = lazy(() => import('../components/TopSellingBooks'));

/* ── Skeleton ── */
const Skeleton = () => (
  <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-40 bg-gray-200 rounded-lg" />
    ))}
  </div>
);

const Home = () => {
  const [topBooks, setTopBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [promotions, setPromotions] = useState([]); // ✅ LƯU TOÀN BỘ DANH SÁCH PROMOTIONS
  const navigate = useNavigate();

  const goToFilteredBooks = (filterType) => navigate(`/books?filter=${filterType}`);

  useEffect(() => {
    const fetchAll = async () => {
      // ── Fetch sách + khuyến mãi song song ──
      const [topRes, allRes, promoRes] = await Promise.allSettled([
        axios.get('/api/books/top-selling'),
        axios.get('/api/books?limit=1000'),
        axios.get('/api/admin/promotions'), // API lấy danh sách khuyến mãi
      ]);

      // Sách bán chạy
      if (topRes.status === 'fulfilled') setTopBooks(topRes.value.data);

      // Tất cả sách
      if (allRes.status === 'fulfilled') setAllBooks(allRes.value.data.books || []);

      // Khuyến mãi
      if (promoRes.status === 'fulfilled') setPromotions(promoRes.value.data || []);
      // ❌ ĐÃ XÓA LOGIC LỌC SÁCH Ở ĐÂY VÌ FLASHSALESLIDER ĐÃ TỰ LÀM RỒI
    };

    fetchAll();
  }, []);

  const getBooksByGenre = (genre) =>
    allBooks.filter(book => book.genre === genre);

  const genreSections = [
    { genre: 'Comics', title: 'Truyện Tranh', sub: 'Những bộ truyện tranh nổi bật nhất' },
    { genre: 'Viễn Tưởng', title: 'Viễn Tưởng', sub: 'Bay bổng cùng những thế giới kỳ diệu' },
    { genre: 'Tiểu thuyết', title: 'Tiểu Thuyết', sub: 'Tuyển tập các tiểu thuyết lôi cuốn' },
    { genre: 'Lãng mạn', title: 'Lãng Mạn', sub: 'Những câu chuyện tình yêu đẹp nhất' },
    { genre: 'Khoa học', title: 'Khoa Học', sub: 'Khám phá thế giới qua lăng kính khoa học' },
    { genre: 'Tài chính', title: 'Tài Chính', sub: 'Nền tảng vững chắc cho sự thành công' },
  ];

  return (
    <div className="bg-white">

      {/* ── HERO BANNER ── */}
      <section className="relative h-screen w-full overflow-hidden text-white bg-black">
        {/* Background Image */}
        <img
          src={bannerImg}
          alt="Banner"
          loading="eager"
          fetchpriority="high"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* LOGO TRỒI LÊN TỪ DƯỚI - Đã đổi thành -top-10 */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-10 px-4 pb-4">
          <SplitText
            text="BOOKNEST"
            className="text-[60px] md:text-[120px] lg:text-[180px] font-bold tracking-widest text-white/30 drop-shadow-2xl whitespace-nowrap"
            delay={100}
            duration={1.25}
            ease="none" // linear
            splitType="chars"
            from={{ opacity: 0, y: 100 }}
            to={{ opacity: 1, y: 0, delay: 0.25 }} // Đợi rèm mở 0.25s rồi mới chạy
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
          />
        </div>

        {/* CONTENT */}
        <div className="content-anim relative z-20 max-w-7xl mx-auto h-full flex items-center px-10 md:px-16 opacity-0 pointer-events-none">
          <div className="max-w-xl pointer-events-auto">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/70 mb-4">
              BookNest · Bộ sưu tập
            </p>

            <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-4 text-white">
              Bạn đã mua được gì chưa?
            </h2>

            <p className="text-white/80 text-sm md:text-base mb-8 leading-relaxed">
              Khám phá hàng ngàn tựa sách được tuyển chọn kỹ lưỡng.
            </p>

            <button
              onClick={() => goToFilteredBooks('highest-rated')}
              className="px-8 py-3 bg-white text-black font-semibold hover:opacity-90 transition shadow-lg"
            >
              Khám phá ngay
            </button>
          </div>
        </div>

        {/* KHỐI XỬ LÝ ANIMATION (MÀNG CHE) */}
        <div className="curtain-anim origin-left absolute inset-y-0 left-0 w-1/2 bg-white z-50 pointer-events-none"></div>
        <div className="curtain-anim origin-right absolute inset-y-0 right-0 w-1/2 bg-white z-50 pointer-events-none"></div>

        <style jsx>{`
    .curtain-anim {
      will-change: transform;
      /* Giảm thời gian mở rèm còn 1.25s linear */
      animation: revealCurtain 1.25s linear forwards;
    }

    .content-anim {
      will-change: opacity, transform;
      transform: translateY(20px);
      /* Chữ hiển thị sớm hơn (đợi 0.8s thay vì 1s) để khớp với rèm nhanh */
      animation: fadeUp 1s ease-out 0.8s forwards;
    }

    @keyframes revealCurtain {
      0% {
        transform: scaleX(1);
      }
      100% {
        transform: scaleX(0);
      }
    }

    @keyframes fadeUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `}</style>
      </section>
      {/* ── QUICK STATS ── */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">{allBooks.length || '...'}</p>
            <p className="text-xs text-stone-500">Tựa sách</p>
          </div>
          <div>
            <p className="text-xl font-bold">Vận chuyển</p>
            <p className="text-xs text-stone-500">Toàn quốc</p>
          </div>
          <div>
            <p className="text-xl font-bold">4.8 / 5</p>
            <p className="text-xs text-stone-500">Đánh giá</p>
          </div>
        </div>
      </section>

      {/* ── FLASH SALE ── */}
      {/* ✅ TRUYỀN ĐÚNG TÊN PROPS MÀ FLASHSALESLIDER ĐANG CHỜ NHẬN */}
      {promotions.length > 0 && allBooks.length > 0 && (
        <FlashSaleSlider promotions={promotions} allBooks={allBooks} />
      )}

      {/* ── TOP SELLING ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-6">Top Sách Nổi Bật</h2>
        <Suspense fallback={<Skeleton />}>
          <TopSellingBooks books={topBooks} />
        </Suspense>
      </section>

      {/* ── GENRE SECTIONS ── */}
      <div className="max-w-7xl mx-auto px-6">
        {genreSections.map((section, index) => (
          <section
            key={section.genre}
            className={`py-14 ${index < genreSections.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <p className="text-xs text-stone-400 mb-2">{section.sub}</p>
            <Suspense fallback={<Skeleton />}>
              <BookSlider
                books={getBooksByGenre(section.genre)}
                genre={section.genre}
                title={section.title}
              />
            </Suspense>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Home;