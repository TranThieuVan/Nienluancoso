import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

// Import Component chuẩn của hệ thống
import BookCard from '../components/BookCard';
import Pagination from '../components/Pagination';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filteredBooks, setFilteredBooks] = useState([]);

  // State quản lý Phân trang (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 21; // Mỗi trang 18 cuốn (vừa vặn 3 hàng x 6 cột)

  useEffect(() => {
    const fetchAndFilterBooks = async () => {
      try {
        const res = await axios.get('/api/books');
        const allBooks = res.data;
        const q = query.trim().toLowerCase();

        const filtered = allBooks.filter(book =>
          book.title?.toLowerCase().includes(q) ||
          book.author?.toLowerCase().includes(q) ||
          book.genre?.toLowerCase().includes(q)
        );

        setFilteredBooks(filtered);
        setCurrentPage(1); // Trở về trang 1 khi người dùng tìm kiếm từ khóa mới
      } catch (err) {
        console.error('Lỗi khi tìm kiếm:', err);
      }
    };

    if (query) {
      fetchAndFilterBooks();
    } else {
      setFilteredBooks([]);
    }
  }, [query]);

  // Tính toán dữ liệu cắt trang
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * booksPerPage;
    return filteredBooks.slice(start, start + booksPerPage);
  }, [filteredBooks, currentPage]);

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Mượt mà cuộn lên đầu khi sang trang
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      <h1 className="text-2xl font-bold mb-6 border-b-2 pb-2 inline-block">
        Kết quả tìm kiếm cho '{query}'
      </h1>

      {filteredBooks.length > 0 ? (
        <>
          {/* Lưới hiển thị sách dùng chuẩn BookCard với gap-4 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {paginatedBooks.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>

          {/* Chỉ hiển thị thanh phân trang nếu có nhiều hơn 1 trang */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={changePage}
              className="mt-8"
            />
          )}
        </>
      ) : (
        <div className="text-gray-500 text-xl font-semibold mt-10 text-center">
          Không tìm thấy kết quả nào cho '{query}'.
        </div>
      )}
    </div>
  );
};

export default SearchResults;