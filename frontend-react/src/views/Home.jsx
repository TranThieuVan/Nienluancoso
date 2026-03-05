import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BookSlider from '../components/BookSlider';
import TopSellingBooks from '../components/TopSellingBooks';
import bannerImg from '../assets/image/banner.png';

const Home = () => {
  const [topBooks, setTopBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]); // State chứa toàn bộ sách
  const [isLoading, setIsLoading] = useState(true); // Trạng thái loading
  const navigate = useNavigate();

  const goToFilteredBooks = (filterType) => {
    navigate(`/books?filter=${filterType}`);
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setIsLoading(true);
        // Dùng Promise.all để gọi 2 API cùng một lúc, tiết kiệm tối đa thời gian chờ
        const [topRes, allRes] = await Promise.all([
          axios.get('/api/books/top-selling'),
          axios.get('/api/books')
        ]);

        setTopBooks(topRes.data);
        setAllBooks(allRes.data);
      } catch (err) {
        console.error('Lỗi khi lấy dữ liệu trang chủ:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // Hàm helper để lọc sách theo thể loại, giúp code ở dưới gọn gàng hơn
  const getBooksByGenre = (genre) => {
    return allBooks.filter(book => book.genre === genre);
  };

  // Hiển thị màn hình chờ trong lúc gọi API (tránh việc Slider bị render khi chưa có data)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

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

      {/* Truyền mảng sách đã lọc vào từng Component */}
      <div className="p-6">
        <BookSlider books={getBooksByGenre("Comics")} genre="Comics" title="Bạn yêu thích truyện tranh (Comics)" />
      </div>
      <div className="p-6">
        <BookSlider books={getBooksByGenre("Viễn Tưởng")} genre="Viễn Tưởng" title="Sách Viễn Tưởng hay không tưởng" />
      </div>
      <div className="p-6">
        <BookSlider books={getBooksByGenre("Tiểu thuyết")} genre="Tiểu thuyết" title="Tuyển tập các tiểu thuyết lôi cuốn" />
      </div>
      <div className="p-6">
        <BookSlider books={getBooksByGenre("Lãng mạn")} genre="Lãng mạn" title="Bạn thích một chút lãng mạn?" />
      </div>
      <div className="p-6">
        <BookSlider books={getBooksByGenre("Khoa học")} genre="Khoa học" title="Nội dung khoa học cho bạn" />
      </div>
      <div className="p-6">
        <BookSlider books={getBooksByGenre("Tài chính")} genre="Tài chính" title="Bạn muốn có nền tảng cho việc kinh doanh?" />
      </div>
    </>
  );
};

export default Home;