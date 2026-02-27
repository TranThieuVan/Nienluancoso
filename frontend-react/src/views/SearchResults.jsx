import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import BookSlider from '../components/BookSlider';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filteredBooks, setFilteredBooks] = useState([]);

  useEffect(() => {
    const fetchAndFilterBooks = async () => {
      try {
        const res = await axios.get('/api/books');
        const allBooks = res.data;
        const q = query.trim().toLowerCase();

        const filtered = allBooks.filter(book =>
          book.title.toLowerCase().includes(q) ||
          book.author?.toLowerCase().includes(q) ||
          book.genre?.toLowerCase().includes(q)
        );
        setFilteredBooks(filtered);
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

  return (
    <div className="p-6 min-h-screen">
      {filteredBooks.length > 0 ? (
        <BookSlider books={filteredBooks} title={`Kết quả tìm kiếm cho '${query}'`} />
      ) : (
        <div className="text-gray-500 text-xl font-semibold mt-10 text-center">
          Không tìm thấy kết quả nào cho '{query}'.
        </div>
      )}
    </div>
  );
};

export default SearchResults;