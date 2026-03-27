import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import bannerImg from '../assets/image/banner.png';
// import FlashSaleSlider from '../components/FlashSaleSlider';
// Lazy load component nặng
const BookSlider = lazy(() => import('../components/BookSlider'));
const TopSellingBooks = lazy(() => import('../components/TopSellingBooks'));

/* ── Skeleton đơn giản ── */
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
  const navigate = useNavigate();

  const goToFilteredBooks = (filterType) => {
    navigate(`/books?filter=${filterType}`);
  };

  useEffect(() => {
    // ❗ Không block UI nữa
    axios.get('/api/books/top-selling')
      .then(res => setTopBooks(res.data))
      .catch(err => console.error(err));

    axios.get('/api/books')
      .then(res => setAllBooks(res.data))
      .catch(err => console.error(err));
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

      {/* ── HERO BANNER (LCP CHÍNH) ── */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[400px]">

          {/* Text */}
          <div className="md:w-5/12 flex flex-col justify-center px-10 md:px-16 py-16 z-10">
            <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-4">
              BookNest · Bộ sưu tập
            </p>

            {/* 👉 Đây là LCP candidate */}
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-white">
              Bạn đã mua được gì chưa?
            </h1>

            <p className="text-stone-400 text-sm mb-8 leading-relaxed">
              Khám phá hàng ngàn tựa sách được tuyển chọn kỹ lưỡng.
            </p>

            <button
              onClick={() => goToFilteredBooks('highest-rated')}
              className="px-8 py-3 hover-flip-btn w-fit"
            >
              Khám phá ngay
            </button>
          </div>

          {/* Image */}
          <div className="md:w-7/12 relative overflow-hidden">
            <img
              src={bannerImg}
              alt="Banner"
              loading="eager"
              fetchpriority="high"
              className="w-full h-full object-cover object-center opacity-70"
              style={{ minHeight: '320px' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent" />
          </div>
        </div>
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

      {/* <FlashSaleSlider></FlashSaleSlider> */}

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