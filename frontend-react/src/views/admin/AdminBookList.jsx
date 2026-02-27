import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaEdit, FaTrash } from 'react-icons/fa';

import InputSearchAdmin from '@/components/InputSearchAdmin'; // Đảm bảo đã chuyển component này sang React
import Pagination from '@/components/Pagination'; // Đảm bảo đã chuyển component này sang React

const AdminBookList = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genres, setGenres] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 20;

  const fetchBooks = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/books');
      setBooks(res.data);
      const uniqueGenres = [...new Set(res.data.map(b => b.genre))];
      setGenres(uniqueGenres);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách sách:', err);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Reset page khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGenre]);

  const filteredBooks = useMemo(() => {
    return books.filter(book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedGenre === '' || book.genre === selectedGenre)
    );
  }, [books, searchQuery, selectedGenre]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * booksPerPage;
    return filteredBooks.slice(start, start + booksPerPage);
  }, [filteredBooks, currentPage]);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);

  const deleteBook = async (id) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa sách này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      customClass: {
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 mr-2 rounded',
        cancelButton: 'bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded'
      },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchBooks();
        Swal.fire('Đã xóa!', 'Cuốn sách đã được xóa.', 'success');
      } catch (err) {
        Swal.fire('Lỗi!', 'Xóa không thành công.', 'error');
      }
    }
  };

  return (
    <div className="flex flex-col p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Quản lý sách</h1>
          <p className="text-gray-500">Quản lý toàn bộ cơ sở dữ liệu sách, bao gồm hình ảnh, tên, giá bán, số lượng, ...</p>
        </div>
      </div>

      <div className="flex justify-between mb-4 items-center">
        <div className="flex gap-3 items-center">
          <InputSearchAdmin
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm sách theo tiêu đề"
          />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="p-2 border rounded shadow-sm"
          >
            <option value="">Thể loại</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => navigate('/admin/add-book')}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Thêm sách
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded shadow-md">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 border-b">No.</th>
              <th className="p-3 border-b">Image</th>
              <th className="p-3 border-b">Name</th>
              <th className="p-3 border-b">Price</th>
              <th className="p-3 border-b">Stock</th>
              <th className="p-3 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBooks.map((book, index) => (
              <tr key={book._id} className="hover:bg-gray-50">
                <td className="p-3 border-b align-middle">{(currentPage - 1) * booksPerPage + index + 1}</td>
                <td className="p-3 border-b align-middle">
                  <img src={`http://localhost:5000${book.image}`} alt="Book" className="h-12 w-12 object-cover rounded" />
                </td>
                <td className="p-3 border-b align-middle">{book.title}</td>
                <td className="p-3 border-b text-green-700 font-semibold align-middle">{formatPrice(book.price)}</td>
                <td className="p-3 border-b align-middle">
                  <span className={book.stock === 0 ? 'text-red-500 font-bold' : ''}>
                    {book.stock === 0 ? 'Out of stock' : book.stock}
                  </span>
                </td>
                <td className="p-3 border-b text-center align-middle">
                  <button
                    onClick={() => navigate(`/admin/edit-book/${book._id}`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-2 inline-flex items-center justify-center"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => deleteBook(book._id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded inline-flex items-center justify-center"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={changePage}
        />
      )}
    </div>
  );
};

export default AdminBookList;