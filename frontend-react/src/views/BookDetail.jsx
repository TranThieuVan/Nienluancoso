import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import autosize from 'autosize';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../composables/useCart';
import { useFavorites } from '../composables/useFavorites';
import { useAuthStore } from '../stores/auth';

import BookSlider from '../components/BookSlider';
import BookCard from '../components/BookCard';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite, fetchFavorites } = useFavorites();
  const { user, token } = useAuthStore();
  const isLoggedIn = !!token;

  const [book, setBook] = useState(null);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [comments, setComments] = useState([]);
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  const [quantity, setQuantity] = useState(1);

  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const taRef = useRef(null);

  // ✅ Thêm State Quản lý danh sách "Sách bạn vừa xem"
  const [recentBooks, setRecentBooks] = useState([]);

  const isCommentOwner = (cmtUserId) => {
    const currentUserId = user?._id || user?.id;
    const commentUserId = typeof cmtUserId === 'object' ? cmtUserId._id : cmtUserId;
    return currentUserId && commentUserId && currentUserId === commentUserId;
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`/api/comments/${id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error('Lỗi khi tải bình luận', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchFavorites();

      try {
        const res = await axios.get(`/api/books/${id}`);
        setBook(res.data);
        setQuantity(1);

        const ratingRes = await axios.get(`/api/rating/${id}/rating`);
        setAverageRating(ratingRes.data.average);
        setTotalRatings(ratingRes.data.total);

        await fetchComments();

        if (isLoggedIn) {
          const myRatingRes = await axios.get(`/api/rating/${id}/my`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRating(myRatingRes.data.value || 0);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu chi tiết sách', err);
      }

      try {
        const recommendRes = await axios.get(`/api/books/${id}/recommend?page=1&limit=6`);
        setRecommendedBooks(recommendRes.data.books);
        setHasMore(recommendRes.data.hasMore);
        setPage(1);
      } catch (err) {
        console.error('Lỗi khi lấy sách đề xuất:', err);
      }
    };

    loadData();
    window.scrollTo(0, 0);
  }, [id, isLoggedIn, token, fetchFavorites]);

  useEffect(() => {
    if (taRef.current) {
      autosize(taRef.current);
    }
  }, [book]);

  // ✅ LOGIC: Lưu và Lấy sách vừa xem từ LocalStorage
  useEffect(() => {
    if (book) {
      try {
        const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

        // Hiển thị danh sách cũ (loại bỏ cuốn đang xem hiện tại để khỏi trùng)
        setRecentBooks(stored.filter(b => b._id !== book._id));

        // Lưu cuốn hiện tại vào LocalStorage (Tạo bản nhẹ để đỡ nặng máy)
        const lightBook = {
          _id: book._id,
          title: book.title,
          image: book.image,
          price: book.price,
          author: book.author,
          stock: book.stock
        };

        const updated = stored.filter(b => b._id !== book._id); // Xóa cuốn cũ nếu đã tồn tại
        updated.unshift(lightBook); // Đẩy lên đầu danh sách
        if (updated.length > 10) updated.pop(); // Chỉ giữ tối đa 10 cuốn

        localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      } catch (error) {
        console.error('Lỗi localStorage', error);
      }
    }
  }, [book]);

  const loadMoreRecommendations = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const res = await axios.get(`/api/books/${id}/recommend?page=${nextPage}&limit=6`);
      setRecommendedBooks(prev => [...prev, ...res.data.books]);
      setHasMore(res.data.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error('Lỗi load more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMsgChange = (e) => {
    setMsg(e.target.value);
    if (taRef.current) autosize.update(taRef.current);
  };

  const handleSetRating = async (value) => {
    if (!isLoggedIn) return alert('Vui lòng đăng nhập để đánh giá!');
    setRating(value);
    try {
      await axios.post('/api/rating', { bookId: book._id, value }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const res = await axios.get(`/api/rating/${book._id}/rating`);
      setAverageRating(res.data.average);
      setTotalRatings(res.data.total);
    } catch {
      alert('Lỗi khi gửi đánh giá');
    }
  };

  const submitComment = async () => {
    if (!msg.trim()) return;
    try {
      await axios.post('/api/comments', { bookId: book._id, content: msg }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('');
      await fetchComments();
      if (taRef.current) autosize.update(taRef.current);
    } catch {
      alert('Lỗi khi gửi bình luận');
    }
  };

  const startEdit = (comment) => {
    setEditId(comment._id);
    setEditContent(comment.content);
    setMenuOpenId(null);
  };

  const saveEdit = async (cmtId) => {
    try {
      await axios.put(`/api/comments/${cmtId}`, { content: editContent }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditId(null);
      setEditContent('');
      await fetchComments();
      Swal.fire('Thành công', 'Đã cập nhật bình luận', 'success');
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể cập nhật', 'error');
    }
  };

  const deleteComment = async (cmtId) => {
    const confirm = await Swal.fire({
      title: 'Xác nhận xoá?',
      text: 'Bạn có chắc muốn xoá bình luận này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Huỷ'
    });

    if (confirm.isConfirmed) {
      await axios.delete(`/api/comments/${cmtId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchComments();
      Swal.fire('Đã xoá', '', 'success');
    }
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      Swal.fire({
        icon: 'warning',
        title: 'Vui lòng đăng nhập để thanh toán!',
        confirmButtonColor: '#000',
      });
      return;
    }

    try {
      const res = await axios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const items = res.data.items || [];
      const exists = items.find(item => item.book._id === book._id);

      if (!exists) {
        await addToCart(book, quantity);
      }

      localStorage.setItem('preselectItem', book._id);
      navigate('/cart');
    } catch (error) {
      console.error('Lỗi khi mua ngay:', error);
    }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar || avatar.includes('default-user.png')) return 'http://localhost:5000/uploads/avatars/default-user.png';
    return `http://localhost:5000/${avatar}`;
  };

  const renderStars = (avg) => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      if (avg >= starValue) {
        return <FontAwesomeIcon key={index} icon={['fas', 'star']} className="text-[#FFD700]" />;
      } else if (avg >= starValue - 0.5) {
        return <FontAwesomeIcon key={index} icon={['fas', 'star-half-alt']} className="text-[#FFD700]" />;
      } else {
        return <FontAwesomeIcon key={index} icon={['far', 'star']} className="text-[#FFD700]" />;
      }
    });
  };

  if (!book) return <div className="text-center text-gray-500 mt-10">Đang tải sách...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto mt-10">
      <div className="flex flex-col md:flex-row gap-8">
        {/* PHẦN TRÁI */}
        <div className="md:w-[55%] space-y-6">
          <div className="shadow-[0_0_10px_rgba(0,0,0,0.15)] bg-white overflow-hidden">
            <img src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`} alt="Cover" className="w-full h-full object-cover" />
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">Chi tiết sản phẩm</h2>
              <p><strong>Thể loại:</strong> {book.genre}</p>
              <p><strong>Tác giả:</strong> {book.author}</p>
              <div className="mt-4">
                <h2 className="text-xl font-semibold mb-2">Mô tả</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">{book.description}</p>
              </div>
            </div>
          </div>

          <div className="p-4 shadow bg-white flex justify-between">
            <h2 className="text-xl font-semibold mb-2">Đánh giá sách</h2>
            <div className="flex gap-1 text-yellow-500 text-xl">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className="cursor-pointer" onClick={() => handleSetRating(star)}>
                  <FontAwesomeIcon icon={[rating >= star ? 'fas' : 'far', 'star']} className="bigger" />
                </span>
              ))}
            </div>
          </div>
          <div className="text-gray-700">⭐ <strong>{averageRating.toFixed(1)}/5</strong> ({totalRatings} lượt đánh giá)</div>

          {/* Bình luận */}
          <div>
            <h2 className="text-xl font-semibold mb-2 mt-6">Bình luận</h2>
            {isLoggedIn ? (
              <div className="mb-4 flex items-center gap-3">
                <img src={getAvatarUrl(user?.avatar)} className="w-10 h-10 rounded-full object-cover" onError={(e) => e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'} />
                <div className="flex-1 flex items-center border rounded-md px-2 bg-white">
                  <textarea
                    ref={taRef}
                    value={msg}
                    onChange={handleMsgChange}
                    className="flex-1 resize-none overflow-hidden p-2 bg-transparent outline-none"
                    rows="1"
                    placeholder="Nhập nội dung..."
                  />
                </div>
                <button onClick={submitComment} className="text-[#8B4513] hover:text-[#6B3510] text-2xl">
                  <FontAwesomeIcon icon={['fas', 'paper-plane']} className="bigger" />
                </button>
              </div>
            ) : (
              <div className="text-gray-500 italic mb-4">Vui lòng đăng nhập để bình luận.</div>
            )}

            {comments.length === 0 ? (
              <div className="text-gray-500">Chưa có bình luận nào.</div>
            ) : (
              <div className="space-y-4">
                {comments.map(cmt => (
                  <div key={cmt._id} className="relative flex items-start gap-3 border-b pb-3 border-gray-300">
                    <img src={getAvatarUrl(cmt.userId.avatar)} className="w-10 h-10 rounded-full object-cover" onError={(e) => e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'} />
                    <div className="flex-1">
                      <p className="font-semibold">{cmt.userId.name}</p>
                      {cmt.isHidden ? (
                        <p className="text-sm italic text-red-500">Bình luận đã bị ẩn vì lý do: {cmt.hiddenReason}.</p>
                      ) : editId !== cmt._id ? (
                        <p className="text-sm text-gray-700">{cmt.content}</p>
                      ) : (
                        <div className="mt-1">
                          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows="2" className="w-full p-2 border rounded text-sm resize-none"></textarea>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => saveEdit(cmt._id)} className="text-green-600 hover:underline text-sm">Lưu</button>
                            <button onClick={() => { setEditId(null); setEditContent(''); }} className="text-gray-500 hover:underline text-sm">Huỷ</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {isLoggedIn && isCommentOwner(cmt.userId) && (
                      <div className="relative">
                        <button onClick={() => setMenuOpenId(menuOpenId === cmt._id ? null : cmt._id)} className="text-gray-500 hover:text-gray-800 px-2 text-xl transition-colors">
                          <FontAwesomeIcon icon={['fas', 'ellipsis-v']} />
                        </button>
                        {menuOpenId === cmt._id && (
                          <div className="absolute left-10 bottom-0 bg-white border rounded-xl shadow-lg z-10 min-w-[120px] overflow-hidden">
                            <button onClick={() => startEdit(cmt)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm text-gray-700">
                              <FontAwesomeIcon icon={['fas', 'pen']} /> Sửa
                            </button>
                            <button onClick={() => deleteComment(cmt._id)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm text-red-600">
                              <FontAwesomeIcon icon={['fas', 'trash']} /> Xoá
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PHẦN PHẢI */}
        <div className="md:w-[45%] h-fit sticky top-[80px]">
          <h1 className="text-[26px] font-black uppercase text-black leading-tight mb-2">
            {book.title}
          </h1>

          <div className="flex items-center gap-2 mt-1 mb-4">
            <div className="flex gap-[2px] text-sm">
              {renderStars(averageRating)}
            </div>
            <span className="text-gray-500 text-sm">({totalRatings} đánh giá)</span>
          </div>

          <p className="text-3xl font-bold text-black mb-6">
            {book.price.toLocaleString('vi-VN')}₫
          </p>

          <hr className="border-t border-dashed border-gray-300 mb-6" />

          <div className="flex items-center gap-4 mb-8">
            <div className="flex border border-gray-200">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-black font-bold transition-colors"
              >
                -
              </button>
              <input
                type="text"
                value={quantity}
                readOnly
                className="w-12 h-10 text-center font-bold text-black outline-none bg-transparent border-x border-gray-200"
              />
              <button
                onClick={() => setQuantity(q => Math.min(book.stock, q + 1))}
                className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-black font-bold transition-colors"
              >
                +
              </button>
            </div>
            <span className="text-sm text-gray-500">{book.stock} sản phẩm có sẵn</span>
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => addToCart(book, quantity)}
              className="flex-1 bg-black text-white font-bold py-3.5 uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors"
            >
              THÊM VÀO GIỎ
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 bg-black text-white font-bold py-3.5 uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors"
            >
              MUA NGAY
            </button>
          </div>

          <div
            className="inline-flex items-center gap-2 cursor-pointer text-gray-600 hover:text-red-500 transition-colors mt-2"
            onClick={() => toggleFavorite(book)}
          >
            <FontAwesomeIcon icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']} className={`text-xl ${isFavorite(book._id) ? 'text-red-500' : ''}`} />
            <span className="text-sm font-semibold">{isFavorite(book._id) ? 'Đã yêu thích' : 'Thêm vào yêu thích'}</span>
          </div>

          <hr className="border-t border-dashed border-gray-300 mt-6" />
        </div>
      </div>

      {/* SÁCH ĐỀ XUẤT */}
      {recommendedBooks.length > 0 && (
        <div className="mt-16 mb-10">
          <h2 className="text-2xl font-bold mb-10 border-b-2 border-black pb-2 w-fit mx-auto text-center uppercase tracking-widest">
            Sản phẩm liên quan
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recommendedBooks.map((recBook) => (
              <BookCard key={recBook._id} book={recBook} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={loadMoreRecommendations}
                disabled={isLoadingMore}
                className="hover-flip-btn px-10 py-2 rounded-[5px]"
              >
                {isLoadingMore ? 'Đang tải...' : 'Xem thêm'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ SÁCH BẠN VỪA XEM */}
      {recentBooks.length > 0 && (
        <div className="mt-16 mb-10 border-t border-gray-200 pt-16">
          <h2 className="text-2xl font-bold mb-10 border-b-2 border-black pb-2 w-fit mx-auto text-center uppercase tracking-widest">
            Sách Bạn Vừa Xem
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Chỉ lấy tối đa 6 cuốn để hiển thị cho đẹp giao diện */}
            {recentBooks.slice(0, 6).map((recentBook) => (
              <BookCard key={recentBook._id} book={recentBook} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default BookDetail;