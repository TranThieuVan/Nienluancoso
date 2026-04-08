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
  const [promotions, setPromotions] = useState([]);
  // ✅ STATE MỚI: Theo dõi xem ảnh banner đã tải xong chưa
  const [isBannerLoaded, setIsBannerLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      // ── Fetch sách + khuyến mãi song song ──
      const [topRes, allRes, promoRes] = await Promise.allSettled([
        axios.get('/api/books/top-selling'),
        axios.get('/api/books?limit=1000'),
        axios.get('/api/promotions'),
      ]);

      if (topRes.status === 'fulfilled') setTopBooks(topRes.value.data);
      if (allRes.status === 'fulfilled') setAllBooks(allRes.value.data.books || []);
      if (promoRes.status === 'fulfilled') setPromotions(promoRes.value.data || []);
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
      {/* Đổi h-screen thành style để trừ đi chiều cao navbar (khoảng 64px) */}
      <section
        className="relative w-full overflow-hidden text-white bg-white"
        style={{ height: 'calc(100vh - 64px)' }}
      >
        {/* Background Image */}
        <img
          src={bannerImg}
          alt="Banner"
          loading="eager"
          fetchpriority="high"
          decoding="sync"
          onLoad={() => setIsBannerLoaded(true)} // ✅ Khi ảnh tải xong 100%, trigger mở rèm
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* LOGO CHÍNH GIỮA - Chỉ render và chạy animation khi rèm bắt đầu mở */}
        {isBannerLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-4">
            <SplitText
              text="BOOKNEST"
              className="text-[60px] md:text-[120px] lg:text-[180px] font-bold tracking-widest text-white/30 drop-shadow-2xl whitespace-nowrap"
              delay={100}
              duration={1}
              ease="none" // linear
              splitType="chars"
              from={{ opacity: 0, y: 100 }}
              to={{ opacity: 1, y: 0, delay: 0.25 }} // Đợi rèm mở 0.25s rồi mới chạy
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
            />
          </div>
        )}

        {/* KHỐI XỬ LÝ ANIMATION (MÀNG CHE MÀU TRẮNG) */}
        {/* Khi isBannerLoaded = false (chưa load xong), rèm che kín màn hình để giấu khoảng đen */}
        <div
          className={`origin-left absolute inset-y-0 left-0 w-1/2 bg-white z-50 pointer-events-none transition-transform duration-1000 ease-linear ${isBannerLoaded ? 'scale-x-0' : 'scale-x-100'}`}
        ></div>
        <div
          className={`origin-right absolute inset-y-0 right-0 w-1/2 bg-white z-50 pointer-events-none transition-transform duration-1000 ease-linear ${isBannerLoaded ? 'scale-x-0' : 'scale-x-100'}`}
        ></div>
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
      {promotions.length > 0 && allBooks.length > 0 && (
        /* Bọc bằng div chuẩn để đảm bảo có ID trong DOM */
        <div id="flash-sale" className="scroll-mt-24">
          <FlashSaleSlider promotions={promotions} allBooks={allBooks} />
        </div>
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