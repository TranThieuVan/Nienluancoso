import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BookSlider from '../components/BookSlider';
import TopSellingBooks from '../components/TopSellingBooks';
import bannerImg from '../assets/image/banner.png';

const Home = () => {
  const [topBooks, setTopBooks] = useState([]);
  const navigate = useNavigate();

  const goToFilteredBooks = (filterType) => {
    // Chuyển hướng sang trang danh sách sách kèm query
    navigate(`/books?filter=${filterType}`);
  };

  const fetchTopSellingBooks = async () => {
    try {
      const res = await axios.get('/api/books/top-selling');
      setTopBooks(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy sách bán chạy:', err);
    }
  };

  useEffect(() => {
    fetchTopSellingBooks();
  }, []);

  return (
    <>
      <div className="flex justify-center items-center mx-auto w-fit p-6">
        <div className="flex w-full">
          {/* Cột trái */}
          <div className="w-[40%] flex flex-col justify-center bg-yellow-100 p-6 rounded-l-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Bạn đã mua được gì chưa?
            </h2>
            <button
              onClick={() => goToFilteredBooks('highest-rated')}
              className="hover-flip-btn px-4 py-2 border border-gray-800 w-max rounded"
            >
              Xem ngay
            </button>
          </div>

          {/* Cột phải */}
          <div className="w-[60%]">
            <img src={bannerImg} alt="Banner" className="h-full object-cover rounded-r-2xl" />
          </div>
        </div>
      </div>

      <div className="p-6 mb-20 mx-auto mt-10">
        <TopSellingBooks books={topBooks} />
      </div>

      <div className="p-6"><BookSlider genre="Comics" title="Bạn yêu thích truyện tranh (Comics)" /></div>
      <div className="p-6"><BookSlider genre="Viễn Tưởng" title="Sách Viễn Tưởng hay không tưởng" /></div>
      <div className="p-6"><BookSlider genre="Tiểu thuyết" title="Tuyển tập các tiểu thuyết lôi cuốn" /></div>
      <div className="p-6"><BookSlider genre="Lãng mạn" title="Bạn thích một chút lãng mạn?" /></div>
      <div className="p-6"><BookSlider genre="Khoa học" title="Nội dung khoa học cho bạn" /></div>
      <div className="p-6"><BookSlider genre="Tài chính" title="Bạn muốn có nền tảng cho việc kinh doanh?" /></div>
    </>
  );
};

export default Home;