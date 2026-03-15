import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BookSlider from '../components/BookSlider';
import TopSellingBooks from '../components/TopSellingBooks';
import bannerImg from '../assets/image/banner.png';
import ElectricBorder from '../components/ElectricBorder';
import FlashSaleSlider from '../components/FlashSaleSlider';

/* ── Countdown hook ── */
const useCountdown = (targetDate) => {
  const calc = () => {
    const diff = Math.max(0, targetDate - Date.now());
    return {
      hours: Math.floor(diff / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return time;
};

/* ── TimeBox UI ── */
const TimeBox = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="text-white text-2xl font-bold tabular-nums w-12 text-center leading-none bg-black/40 rounded-lg py-2 px-1 shadow-inner">
      {String(value).padStart(2, '0')}
    </span>
    <span className="text-[9px] tracking-widest uppercase text-white/60 mt-1 font-medium">{label}</span>
  </div>
);

const Home = () => {
  const [topBooks, setTopBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [flashSaleBooks, setFlashSaleBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  /* ✨ Đếm ngược tới 23:59:59 của ngày hôm nay (Chuẩn logic Flash Sale hàng ngày) */
  const flashSaleEnd = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })[0];

  const countdown = useCountdown(flashSaleEnd);

  const goToFilteredBooks = (filterType) => {
    navigate(`/books?filter=${filterType}`);
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setIsLoading(true);
        const [topRes, allRes] = await Promise.all([
          axios.get('/api/books/top-selling'),
          axios.get('/api/books')
        ]);

        setTopBooks(topRes.data);
        setAllBooks(allRes.data);

        // ✨ Lọc ngay những sách đang được Admin giảm giá (có discountedPrice)
        const saleBooks = allRes.data.filter(book => book.discountedPrice && book.discountedPrice < book.price);
        setFlashSaleBooks(saleBooks);

      } catch (err) {
        console.error('Lỗi khi lấy dữ liệu trang chủ:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  const getBooksByGenre = (genre) => allBooks.filter(book => book.genre === genre);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs tracking-widest uppercase text-stone-400">Đang tải...</p>
      </div>
    );
  }

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
      <section className="relative overflow-hidden bg-black text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[400px]">
          <div className="md:w-5/12 flex flex-col justify-center px-10 md:px-16 py-16 z-10">
            <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-4">
              BookNest · Bộ sưu tập
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-white">
              Bạn đã mua được gì chưa?
            </h1>
            <p className="text-stone-400 text-sm mb-8 leading-relaxed">
              Khám phá hàng ngàn tựa sách được tuyển chọn kỹ lưỡng, từ best-seller đến những viên ngọc ẩn.
            </p>
            <button
              onClick={() => goToFilteredBooks('highest-rated')}
              className="px-8 py-3 hover-flip-btn w-fit"
            >
              Khám phá ngay
            </button>
          </div>

          <div className="md:w-7/12 relative overflow-hidden">
            <img
              src={bannerImg}
              alt="Banner"
              className="w-full h-full object-cover object-center opacity-70 transition-transform duration-700 hover:scale-105"
              style={{ minHeight: '320px' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── QUICK STATS ── */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-3 md:grid-cols-3 gap-4 text-center">
          {[
            { icon: 'book', label: 'Tựa sách', value: `${allBooks.length}+` },
            { icon: 'truck', label: 'Giao hàng toàn quốc', value: 'Vận chuyển' },
            { icon: 'star', label: 'Đánh giá trung bình', value: '4.8 / 5' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1 py-2">
              <p className="text-xl font-bold text-black">{item.value}</p>
              <p className="text-xs text-stone-500 tracking-wide">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FLASH SALE ── */}
      {flashSaleBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-12">
          <ElectricBorder
            color="#000"
            speed={1.4}
            chaos={0.14}
            borderRadius={20}
            className="w-full"
          >
            <div className="bg-black rounded-[20px] px-6 py-8 md:py-10 md:px-10 overflow-hidden">

              {/* Header row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-3">Ưu đãi giới hạn</p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                      Flash Sale
                    </h2>
                  </div>
                  <p className="text-stone-400 text-sm mt-2">Số lượng có hạn. Chốt đơn ngay!</p>
                </div>

                {/* Countdown */}
                <div className="flex items-center gap-4 border border-stone-700 px-5 py-3">
                  <span className="text-stone-500 text-xs font-medium tracking-widest uppercase hidden md:block">Kết thúc trong</span>
                  <div className="flex items-center gap-2">
                    <TimeBox value={countdown.hours} label="Giờ" />
                    <span className="text-stone-600 text-xl font-light pb-4">:</span>
                    <TimeBox value={countdown.minutes} label="Phút" />
                    <span className="text-stone-600 text-xl font-light pb-4">:</span>
                    <TimeBox value={countdown.seconds} label="Giây" />
                  </div>
                </div>
              </div>

              {/* Slider */}
              <div className="-mx-2">
                <FlashSaleSlider books={flashSaleBooks} />
              </div>

              {/* CTA */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => goToFilteredBooks('sale')}
                  className="px-8 py-3 hover-flip-btn text-sm tracking-widest uppercase"
                >
                  Khám phá tất cả ưu đãi
                </button>
              </div>
            </div>
          </ElectricBorder>
        </section>
      )}

      {/* ── TOP SELLING ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-stone-400 mb-2">Bán chạy nhất</p>
            <h2 className="text-3xl font-bold text-black">Top Sách Nổi Bật</h2>
          </div>
          <button
            onClick={() => navigate('/books')}
            className="text-xs tracking-widest uppercase text-stone-500 hover:text-black transition-colors border-b border-stone-300 hover:border-black pb-0.5"
          >
            Xem tất cả
          </button>
        </div>
        <TopSellingBooks books={topBooks} />
      </section>

      {/* ── DIVIDER ── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="border-t border-gray-100" />
      </div>

      {/* ── GENRE SECTIONS ── */}
      <div className="max-w-7xl mx-auto px-6">
        {genreSections.map((section, index) => (
          <section
            key={section.genre}
            className={`py-14 ${index < genreSections.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <p className="text-[10px] tracking-[0.35em] uppercase text-stone-400 mb-1 mt-0">{section.sub}</p>
            <BookSlider
              books={getBooksByGenre(section.genre)}
              genre={section.genre}
              title={section.title}
            />
          </section>
        ))}
      </div>
    </div>
  );
};

export default Home;