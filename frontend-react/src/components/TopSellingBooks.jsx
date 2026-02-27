import { Link } from 'react-router-dom';

const TopSellingBooks = ({ books = [] }) => {
  if (books.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-4xl mb-12 font-semibold text-center">🔥 Top 5 Sách Bán Chạy Nhất</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {books.map((book, index) => (
          <div key={book._id} className="group bigger-small">
            <Link to={`/books/${book._id}`} className="block">
              <div className="overflow-hidden aspect-[3/4]">
                <img
                  src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`}
                  alt={book.title}
                  className="w-full h-full rounded-3xl object-cover transition-all duration-300 border-transparent group-hover:border-black border-[4px]"
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
                    {Number(book.price).toLocaleString('vi-VN')}₫
                  </p>
                  <p className="text-sm text-red-800">Đã bán: {book.totalSold}</p>
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