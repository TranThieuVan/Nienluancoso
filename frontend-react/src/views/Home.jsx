import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import bannerImg from '../assets/image/banner3.jpg';
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
  const [isBannerLoaded, setIsBannerLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
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

  // ✅ ĐÃ SỬA: Biến "genre" phải khớp chính xác 100% với validGenres trong Backend
  const genreSections = [
    { genre: 'Comics', title: 'Truyện Tranh', sub: 'Những bộ truyện tranh nổi bật nhất' },
    { genre: 'Viễn tưởng', title: 'Viễn Tưởng', sub: 'Bay bổng cùng những thế giới kỳ diệu' },
    { genre: 'Bí ẩn/Trinh thám', title: 'Trinh Thám', sub: 'Hồi hộp và gay cấn từng trang' },
    { genre: 'Tình cảm/Lãng mạn', title: 'Lãng Mạn', sub: 'Những câu chuyện tình yêu đẹp nhất' },
    { genre: 'Self-help', title: 'Phát Triển Bản Thân', sub: 'Nâng cấp tư duy và kỹ năng' },
    { genre: 'Kinh doanh/Tài chính', title: 'Tài Chính', sub: 'Nền tảng vững chắc cho sự thành công' },
  ];

  return (
    <div className="bg-white">

      {/* ── HERO BANNER ── */}
      <section
        className="relative w-full overflow-hidden text-white bg-white"
        style={{ height: 'calc(100vh - 64px)' }}
      >
        <img
          src={bannerImg}
          alt="Banner"
          loading="eager"
          fetchpriority="high"
          decoding="sync"
          onLoad={() => setIsBannerLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {isBannerLoaded && (
          <div className="absolute top-0 pointer-events-none z-10">
            <SplitText
              text="BOOKNEST"
              className="text-[60px] md:text-[120px] lg:text-[180px] font-bold tracking-widest text-black/30 drop-shadow-2xl whitespace-nowrap -mt-16"
              delay={100}
              duration={1}
              ease="none"
              splitType="chars"
              from={{ opacity: 0, y: 100 }}
              to={{ opacity: 1, y: 0, delay: 0.25 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
            />
          </div>
        )}

        <div className={`origin-left absolute inset-y-0 left-0 w-1/2 bg-white z-50 pointer-events-none transition-transform duration-1000 ease-linear ${isBannerLoaded ? 'scale-x-0' : 'scale-x-100'}`}></div>
        <div className={`origin-right absolute inset-y-0 right-0 w-1/2 bg-white z-50 pointer-events-none transition-transform duration-1000 ease-linear ${isBannerLoaded ? 'scale-x-0' : 'scale-x-100'}`}></div>
      </section>



      {/* ── FLASH SALE ── */}
      {promotions.length > 0 && allBooks.length > 0 && (
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