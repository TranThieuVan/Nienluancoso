import { Link } from 'react-router-dom';

const TopSellingBooks = ({ books = [] }) => {
  // ✅ 1. Hứng mảng an toàn (Đề phòng API trả về object { books: [...] })
  const safeBooks = Array.isArray(books) ? books : (books?.books || books?.data || []);

  // Thay vì return null làm trắng trang, hãy hiển thị câu thông báo để dễ Debug
  if (safeBooks.length === 0) return (
    <div className="mt-10 py-10 text-center text-gray-500 font-medium border-2 border-dashed border-gray-200 rounded-lg">
      Chưa có dữ liệu sách bán chạy.
    </div>
  );

  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {safeBooks.map((book, index) => (
          <div key={book._id} className="group bigger-small">
            <Link to={`/books/${book._id}`} className="block">
              <div className="overflow-hidden aspect-[3/4]">
                <img
                  src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                  alt={book.title}
                  className="w-full h-full object-cover transition-all duration-300 border-transparent group-hover:border-black border-[4px]"
                />
              </div>

              <div className="flex gap-4 items-center px-3 mt-2">
                <div className="text-black text-6xl font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium line-clamp-2 break-words">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">Tác giả: {book.author}</p>
                  <p className="text-xs font-semibold text-gray-500">
                    {Number(book.price || 0).toLocaleString('vi-VN')}₫
                  </p>
                  {/* ✅ 2. Xử lý an toàn: Có thể API trả về totalSold hoặc sold */}
                  <p className="text-sm text-red-800">Đã bán: {book.totalSold ?? book.sold ?? 0}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopSellingBooks;