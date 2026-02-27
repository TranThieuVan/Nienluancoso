import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import autosize from 'autosize';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../composables/useCart';
import { useFavorites } from '../composables/useFavorites';
import { useAuthStore } from '../stores/auth';

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

  const taRef = useRef(null);

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
    };
    loadData();
  }, [id, isLoggedIn, token, fetchFavorites]);

  useEffect(() => {
    if (taRef.current) {
      autosize(taRef.current);
    }
  }, [book]);

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
    // ✅ KIỂM TRA ĐĂNG NHẬP Ở ĐÂY
    if (!isLoggedIn) {
      Swal.fire({
        icon: 'warning',
        title: 'Vui lòng đăng nhập để thanh toán!',
        confirmButtonColor: '#8B4513',
      });
      return;
    }

    try {
      const res = await axios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const items = res.data.items || [];
      const exists = items.find(item => item.book._id === book._id);
      if (!exists) await addToCart(book);

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

  if (!book) return <div className="text-center text-gray-500 mt-10">Đang tải sách...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto mt-10">
      <div className="flex flex-col md:flex-row gap-6">
        {/* PHẦN TRÁI */}
        <div className="md:w-3/5 space-y-6">
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
          <div className="text-gray-700">⭐ <strong>{averageRating}/5</strong> ({totalRatings} lượt đánh giá)</div>

          {/* Bình luận */}
          <div>
            <h2 className="text-xl font-semibold mb-2 mt-6">Bình luận</h2>
            {isLoggedIn ? (
              <div className="mb-4 flex items-center gap-3">
                <img src={getAvatarUrl(user?.avatar)} className="w-10 h-10 rounded-full object-cover" onError={(e) => e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'} />
                <div className="flex-1 flex items-center border rounded-md px-2">
                  <textarea
                    ref={taRef}
                    value={msg}
                    onChange={handleMsgChange}
                    className="flex-1 resize-none overflow-hidden p-2"
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
                  <div key={cmt._id} className="relative flex items-start gap-3 border-b pb-3">
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
        <div className="md:w-2/5 space-y-4 border p-6 shadow-md h-fit sticky top-[80px]">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-gray-600 text-sm">{book.author}</p>
          <hr />
          <div className="text-yellow-500 text-lg">⭐ {averageRating}/5 ({totalRatings} đánh giá)</div>
          <p className="text-2xl font-bold">{book.price.toLocaleString('vi-VN')}₫</p>
          <div className="mt-2 flex items-center gap-2 text-red-500 cursor-pointer" onClick={() => toggleFavorite(book)}>
            <FontAwesomeIcon icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']} className="text-xl bigger" />
          </div>
          <div className="flex gap-1 mt-4">
            <button onClick={() => addToCart(book)} className="hover-flip-btn py-2 w-52">Thêm vào giỏ hàng</button>
            <button onClick={handleBuyNow} className="hover-flip-btn py-2 w-48">Thanh toán</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;