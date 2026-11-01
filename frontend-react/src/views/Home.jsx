import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import bannerImg from '../assets/image/banner3.jpg';
import FlashSaleSlider from '../components/FlashSaleSlider';
import SplitText from '../components/SplitText';
import { apiUrl } from '../config/api';
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
  const [saleBooks, setSaleBooks] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [isBannerLoaded, setIsBannerLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      const [topRes, allRes, promoRes] = await Promise.allSettled([
        axios.get(apiUrl('/api/books/top-selling')),
        axios.get(apiUrl('/api/books?filter=sale&limit=100')),
        axios.get(apiUrl('/api/promotions')),
      ]);

      if (topRes.status === 'fulfilled') setTopBooks(topRes.value.data);
      if (allRes.status === 'fulfilled') setSaleBooks(allRes.value.data.books || []);
      if (promoRes.status === 'fulfilled') setPromotions(promoRes.value.data || []);
    };

    fetchAll();
  }, []);

  // ✅ ĐÃ SỬA: Biến "genre" phải khớp chính xác 100% với validGenres trong Backend
  const genreSections = [
    { genre: 'Comics', title: 'Comics', sub: 'Featured graphic novels and comics' },
    { genre: 'Viễn tưởng', title: 'Science Fiction', sub: 'Explore extraordinary worlds' },
    { genre: 'Bí ẩn/Trinh thám', title: 'Mystery', sub: 'Clues, suspense, and unexpected turns' },
    { genre: 'Tình cảm/Lãng mạn', title: 'Romance', sub: 'Stories about love and connection' },
    { genre: 'Self-help', title: 'Personal Growth', sub: 'Ideas and tools for everyday life' },
    { genre: 'Kinh doanh/Tài chính', title: 'Business & Finance', sub: 'Build your knowledge and make informed decisions' },
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
          /* w-full và flex justify-center để căn giữa hoàn hảo */
          /* top-0 để đưa lên sát mép trên cùng của banner */
          <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-10">
            <SplitText
              text="BOOKNEST"
              /* QUAN TRỌNG: 
                 - Xóa sạch margin âm (-mt-16)
                 - Thêm 'leading-none' để triệt tiêu khoảng cách thừa phía trên của font chữ 
              */
              className="text-[60px] md:text-[120px] lg:text-[180px] font-bold tracking-[0.2em] text-black/20 drop-shadow-2xl whitespace-nowrap leading-none"
              delay={100}
              duration={1}
              ease="none"
              splitType="chars"
              /* Chỉnh y: 0 ở 'to' để khi xong hiệu ứng nó nằm đúng vị trí top-0 */
              from={{ opacity: 0, y: 50 }}
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
      {promotions.length > 0 && saleBooks.length > 0 && (
        <div id="flash-sale" className="scroll-mt-24">
          <FlashSaleSlider promotions={promotions} allBooks={saleBooks} />
        </div>
      )}

      {/* ── TOP SELLING ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-6">Best Sellers</h2>
        <Suspense fallback={<Skeleton />}>
          <TopSellingBooks books={topBooks} />
        </Suspense>
      </section>

      {/* ── GENRE SECTIONS ── */}
      <div className="max-w-7xl mx-auto px-6">
        {genreSections.map((section, index) => (
          <section
            key={section.genre}
            className={`py-6 ${index < genreSections.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <p className="text-[17px] text-stone-400 mb-2">{section.sub}</p>
            <Suspense fallback={<Skeleton />}>
              <BookSlider
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