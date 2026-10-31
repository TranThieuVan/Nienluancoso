import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import autosize from 'autosize';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCart } from '../composables/useCart';
import { useFavorites } from '../composables/useFavorites';
import { useAuthStore } from '../stores/auth';
import { imageUrl as getImageUrl } from '../config/api';
import BookCard from '../components/BookCard';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite, fetchFavorites } = useFavorites();
  const { user, token } = useAuthStore();
  const isLoggedIn = !!token;

  const [book, setBook] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  // Review states (comment + rating merged)
  const [hasPurchased, setHasPurchased] = useState(false);
  const [myComment, setMyComment] = useState(null); // đánh giá của chính user

  const [newReviewRating, setNewReviewRating] = useState(0);   // sao khi viết mới
  const [newReviewHover, setNewReviewHover] = useState(0);
  const [editReviewRating, setEditReviewRating] = useState(0); // sao khi chỉnh sửa
  const [editReviewHover, setEditReviewHover] = useState(0);

  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
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

  const [recentBooks, setRecentBooks] = useState([]);

  const isCommentOwner = (cmtUserId) => {
    const currentUserId = user?._id || user?.id;
    const commentUserId = typeof cmtUserId === 'object' ? cmtUserId._id : cmtUserId;
    return currentUserId && commentUserId && currentUserId === commentUserId;
  };

  const fetchComments = async (pageNum = 1, isAppend = false) => {
    try {
      setIsLoadingComments(true);
      const res = await axios.get(`/api/comments/${id}/comments?page=${pageNum}&limit=5`);
      if (isAppend) {
        setComments(prev => [...prev, ...res.data.comments]);
      } else {
        setComments(res.data.comments);
      }
      setHasMoreComments(res.data.hasMore);
      setCommentPage(pageNum);
    } catch (err) {
      console.error('Lỗi khi tải bình luận', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const fetchMyComment = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await axios.get(`/api/comments/${id}/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyComment(res.data);
    } catch (err) {
      console.error('Lỗi lấy đánh giá cá nhân', err);
    }
  };

  const refreshRatingSummary = async (bookId) => {
    const res = await axios.get(`/api/rating/${bookId}/rating`);
    setAverageRating(res.data.average);
    setTotalRatings(res.data.total);
  };

  const handleCollapseComments = () => {
    setComments(prev => prev.slice(0, 5));
    setCommentPage(1);
    setHasMoreComments(true);
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
          // Kiểm tra đã mua và nhận hàng chưa
          try {
            const purchaseRes = await axios.get(`/api/orders/check-purchased/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setHasPurchased(purchaseRes.data.hasPurchased);
          } catch (err) {
            console.error('Lỗi kiểm tra trạng thái mua hàng', err);
          }

          // Lấy đánh giá cá nhân (nếu có)
          await fetchMyComment();
        }
      } catch (err) { console.error('Lỗi tải dữ liệu chi tiết sách', err); }

      try {
        const recommendRes = await axios.get(`/api/books/${id}/recommend?page=1&limit=6`);
        setRecommendedBooks(recommendRes.data.books);
        setHasMore(recommendRes.data.hasMore);
        setPage(1);
      } catch (err) { console.error('Lỗi khi lấy sách đề xuất:', err); }
    };

    loadData();
    window.scrollTo(0, 0);
  }, [id, isLoggedIn, token, fetchFavorites]);

  useEffect(() => {
    if (taRef.current) autosize(taRef.current);
  }, [book]);

  useEffect(() => {
    if (book) {
      try {
        const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        setRecentBooks(stored.filter(b => b._id !== book._id));

        const lightBook = {
          _id: book._id, title: book.title, image: book.image,
          price: book.price, author: book.author, stock: book.stock
        };
        const updated = stored.filter(b => b._id !== book._id);
        updated.unshift(lightBook);
        if (updated.length > 10) updated.pop();
        localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      } catch (error) { console.error('Lỗi localStorage', error); }
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
    } catch (err) { console.error('Lỗi load more:', err); }
    finally { setIsLoadingMore(false); }
  };

  const handleMsgChange = (e) => {
    setMsg(e.target.value);
    if (taRef.current) autosize.update(taRef.current);
  };

  // Gửi đánh giá mới (comment + rating cùng lúc)
  const submitReview = async () => {
    if (!msg.trim()) {
      return Swal.fire('Thiếu nội dung', 'Vui lòng nhập nhận xét của bạn.', 'warning');
    }
    if (newReviewRating === 0) {
      return Swal.fire('Thiếu số sao', 'Vui lòng chọn số sao đánh giá.', 'warning');
    }
    try {
      await axios.post('/api/comments', { bookId: book._id, content: msg }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await axios.post('/api/rating', { bookId: book._id, value: newReviewRating }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMsg('');
      setNewReviewRating(0);
      if (taRef.current) autosize.update(taRef.current);

      await fetchMyComment();
      await refreshRatingSummary(book._id);
      await fetchComments(1, false);
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi gửi đánh giá', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const startEdit = (comment) => {
    setEditId(comment._id);
    setEditContent(comment.content);
    setEditReviewRating(comment.userRating || 0);
    setEditReviewHover(0);
    setMenuOpenId(null);
  };

  // Lưu chỉnh sửa (comment + rating cùng lúc)
  const saveEdit = async (cmtId) => {
    if (!editContent.trim()) {
      return Swal.fire('Lỗi', 'Nội dung không được để trống', 'error');
    }
    try {
      await axios.put(`/api/comments/${cmtId}`, { content: editContent }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (editReviewRating > 0) {
        await axios.post('/api/rating', { bookId: book._id, value: editReviewRating }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setEditId(null);
      setEditContent('');
      setEditReviewRating(0);

      await fetchMyComment();
      await refreshRatingSummary(book._id);
      await fetchComments(1, false);

      Swal.fire('Thành công', 'Đã cập nhật đánh giá', 'success');
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể cập nhật', 'error');
    }
  };

  const deleteComment = async (cmtId) => {
    const confirm = await Swal.fire({
      title: 'Xác nhận xoá?',
      text: 'Bạn có chắc muốn xoá đánh giá này?',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Xoá', cancelButtonText: 'Huỷ'
    });
    if (confirm.isConfirmed) {
      await axios.delete(`/api/comments/${cmtId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyComment(null);
      await refreshRatingSummary(book._id);
      await fetchComments(1, false);
      Swal.fire('Đã xoá', '', 'success');
    }
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      Swal.fire({ icon: 'warning', title: 'Vui lòng đăng nhập để thanh toán!', confirmButtonColor: '#000' });
      return;
    }
    try {
      const res = await axios.get('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
      const items = res.data.items || [];
      const exists = items.find(item => item.book._id === book._id);
      if (!exists) await addToCart(book, quantity);
      localStorage.setItem('preselectItem', book._id);
      navigate('/cart');
    } catch (error) { console.error('Lỗi khi mua ngay:', error); }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar || avatar.includes('default-user.png')) {
      return getImageUrl('/uploads/avatars/default-user.png');
    }
    return getImageUrl(avatar.startsWith('/') ? avatar : `/${avatar}`);
  };

  // renderStars nhận callbacks tuỳ chỉnh để dùng chung cho display / write / edit
  const renderStars = (displayValue, { interactive = false, onSet, onHover, onLeave } = {}) => {
    return [...Array(5)].map((_, index) => {
      const starVal = index + 1;
      const filled = interactive ? displayValue >= starVal : displayValue >= starVal;
      const half = !interactive && displayValue >= starVal - 0.5 && displayValue < starVal;

      let icon;
      if (interactive) icon = filled ? ['fas', 'star'] : ['far', 'star'];
      else if (filled) icon = ['fas', 'star'];
      else if (half) icon = ['fas', 'star-half-alt'];
      else icon = ['far', 'star'];

      return (
        <FontAwesomeIcon
          key={index} icon={icon}
          className={`text-[#C9A96E] transition-transform duration-100 ${interactive ? 'cursor-pointer hover:scale-110' : ''}`}
          onClick={interactive && onSet ? () => onSet(starVal) : undefined}
          onMouseEnter={interactive && onHover ? () => onHover(starVal) : undefined}
          onMouseLeave={interactive && onLeave ? onLeave : undefined}
        />
      );
    });
  };

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm tracking-widest uppercase text-stone-400">Đang tải...</p>
      </div>
    );
  }

  const imgSrc = getImageUrl(book.image);
  // Danh sách đánh giá của người khác (bỏ đánh giá của chính mình để không hiện 2 lần)
  const otherComments = comments.filter(cmt => !isCommentOwner(cmt.userId));

  return (
    <div className="min-h-screen bg-white">
      {/* ── BOOK DETAIL SECTION ── */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-12">

          {/* ── LEFT COLUMN ── */}
          <div className="contents md:flex md:w-[52%] flex-col gap-10">

            {/* Cover Image */}
            <div className="order-1 md:order-none mb-10 md:mb-0 bg-stone-50 overflow-hidden aspect-[3/4] max-w-sm mx-auto w-full shadow-md select-none">
              <img src={imgSrc} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>

            {/* Book Details */}
            <div className="order-3 md:order-none mb-10 md:mb-0 border border-gray-100 p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-4 pb-3 border-b border-gray-100">
                Chi tiết sản phẩm
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Nhà xuất bản', value: book.publisher || 'Đang cập nhật' },
                  { label: 'Thể loại', value: book.genre },
                  { label: 'Tác giả', value: book.author },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-6">
                    <span className="text-sm text-stone-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm font-medium text-black">{value}</span>
                  </div>
                ))}
              </div>

              {book.description && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-3">Mô tả</h3>
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{book.description}</p>
                </div>
              )}
            </div>

            {/* ── REVIEWS SECTION (rating + comment gộp lại) ── */}
            <div className="order-4 md:order-none mb-10 md:mb-0">

              {/* Header + điểm trung bình */}
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">
                  Đánh giá & Bình luận
                </h2>
                {totalRatings > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 text-sm">
                      {renderStars(averageRating)}
                    </div>
                    <span className="text-sm font-bold text-black">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-stone-400">({totalRatings})</span>
                  </div>
                )}
              </div>

              {/* Form viết đánh giá mới */}
              {isLoggedIn && hasPurchased && !myComment && (
                <div className="mb-6 p-4 border border-gray-100 bg-stone-50/40">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
                    Viết đánh giá của bạn
                  </p>
                  {/* Chọn số sao */}
                  <div className="flex items-center gap-1.5 text-xl mb-3">
                    {renderStars(newReviewHover || newReviewRating, {
                      interactive: true,
                      onSet: setNewReviewRating,
                      onHover: setNewReviewHover,
                      onLeave: () => setNewReviewHover(0)
                    })}
                    {newReviewRating > 0 && (
                      <span className="text-xs text-stone-400 ml-2">
                        {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][newReviewRating]}
                      </span>
                    )}
                  </div>
                  {/* Nhập nhận xét */}
                  <div className="flex items-start border border-gray-200 focus-within:border-black transition-colors bg-white">
                    <textarea
                      ref={taRef}
                      value={msg}
                      onChange={handleMsgChange}
                      className="flex-1 resize-none overflow-hidden p-3 bg-transparent outline-none text-sm"
                      rows="2"
                      placeholder="Chia sẻ cảm nhận của bạn về cuốn sách này..."
                    />
                    <button
                      onClick={submitReview}
                      disabled={!msg.trim() || newReviewRating === 0}
                      className="p-3 text-stone-400 hover:text-black disabled:opacity-30 transition-colors"
                      title="Gửi đánh giá"
                    >
                      <FontAwesomeIcon icon={['fas', 'paper-plane']} />
                    </button>
                  </div>
                  {newReviewRating === 0 && (
                    <p className="text-xs text-stone-400 mt-1.5">* Vui lòng chọn số sao để gửi đánh giá</p>
                  )}
                </div>
              )}

              {/* Chưa mua sách */}
              {isLoggedIn && !hasPurchased && !myComment && (
                <div className="text-sm text-stone-400 italic mb-6 p-4 bg-stone-50 border border-gray-100">
                  Bạn cần <span className="text-black font-medium not-italic">mua và nhận sách</span> để có thể đánh giá.
                </div>
              )}

              {/* Chưa đăng nhập */}
              {!isLoggedIn && (
                <div className="text-sm text-stone-400 italic mb-6 p-4 bg-stone-50 border border-gray-100">
                  Vui lòng{' '}
                  <span
                    className="text-black underline cursor-pointer"
                    onClick={() => navigate('/login')}
                  >
                    đăng nhập
                  </span>{' '}
                  để đánh giá.
                </div>
              )}

              {/* Đánh giá của chính mình (ghim lên đầu) */}
              {myComment && (
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Đánh giá của bạn</p>
                  <div className="flex gap-3 pb-5 border-b border-gray-100 bg-stone-50/40 p-3 -mx-1">
                    <img
                      src={getAvatarUrl(myComment.userId?.avatar)}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-100"
                      onError={(e) => { e.target.src = getImageUrl('/uploads/avatars/default-user.png'); }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-black">{myComment.userId?.name}</p>
                          <span className="text-sm font-medium text-stone-500">• {formatDate(myComment.createdAt)}</span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === myComment._id ? null : myComment._id)}
                            className="text-stone-300 hover:text-stone-600 px-2 transition-colors"
                          >
                            <FontAwesomeIcon icon={['fas', 'ellipsis']} />
                          </button>
                          {menuOpenId === myComment._id && (
                            <div className="absolute right-0 top-6 bg-white border border-gray-100 shadow-lg z-10 min-w-[120px] py-1">
                              <button
                                onClick={() => startEdit(myComment)}
                                className="flex items-center gap-2.5 px-4 py-2 hover:bg-stone-50 w-full text-left text-sm text-stone-600"
                              >
                                <FontAwesomeIcon icon={['fas', 'pen']} className="text-sm" />Chỉnh sửa
                              </button>
                              <button
                                onClick={() => deleteComment(myComment._id)}
                                className="flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 w-full text-left text-sm text-red-500"
                              >
                                <FontAwesomeIcon icon={['fas', 'trash']} className="text-sm" />Xoá
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Số sao */}
                      {editId !== myComment._id && (
                        <div className="flex gap-0.5 text-sm mb-1">
                          {renderStars(myComment.userRating || 0)}
                        </div>
                      )}

                      {/* Chế độ xem / chỉnh sửa */}
                      {editId !== myComment._id ? (
                        <p className="text-sm text-stone-600 mt-1 leading-relaxed">{myComment.content}</p>
                      ) : (
                        <div className="mt-2">
                          {/* Chọn lại số sao khi sửa */}
                          <div className="flex items-center gap-1.5 text-lg mb-2">
                            {renderStars(editReviewHover || editReviewRating, {
                              interactive: true,
                              onSet: setEditReviewRating,
                              onHover: setEditReviewHover,
                              onLeave: () => setEditReviewHover(0)
                            })}
                            {editReviewRating > 0 && (
                              <span className="text-xs text-stone-400 ml-1">
                                {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][editReviewRating]}
                              </span>
                            )}
                          </div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows="2"
                            className="w-full p-2.5 border border-gray-200 focus:border-black outline-none text-sm resize-none transition-colors"
                          />
                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={() => saveEdit(myComment._id)}
                              className="text-sm font-semibold text-black hover:underline"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => { setEditId(null); setEditContent(''); setEditReviewRating(0); }}
                              className="text-sm text-stone-400 hover:underline"
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Danh sách đánh giá của người khác */}
              {otherComments.length === 0 && !myComment ? (
                <p className="text-stone-400 text-sm py-6 text-center">Chưa có đánh giá nào.</p>
              ) : otherComments.length > 0 ? (
                <div className="space-y-5">
                  {otherComments.map((cmt) => (
                    <div key={cmt._id} className="flex gap-3 pb-5 border-b border-gray-100 last:border-0">
                      <img
                        src={getAvatarUrl(cmt.userId?.avatar)}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-100"
                        onError={(e) => { e.target.src = getImageUrl('/uploads/avatars/default-user.png'); }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-black">{cmt.userId?.name}</p>
                          <span className="text-sm font-medium text-stone-500">• {formatDate(cmt.createdAt)}</span>
                        </div>
                        {/* Số sao của người review */}
                        {cmt.userRating > 0 && (
                          <div className="flex gap-0.5 text-sm mb-1">
                            {renderStars(cmt.userRating)}
                          </div>
                        )}
                        {cmt.isHidden ? (
                          <p className="text-sm text-red-400 italic mt-1">Bình luận đã bị ẩn: {cmt.hiddenReason}</p>
                        ) : (
                          <p className="text-sm text-stone-600 mt-1 leading-relaxed">{cmt.content}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {(hasMoreComments || commentPage > 1) && (
                    <div className="flex justify-center items-center gap-6 mt-6 pt-2">
                      {commentPage > 1 && (
                        <button
                          onClick={handleCollapseComments}
                          className="text-sm font-bold uppercase tracking-widest text-stone-500 hover:text-black transition-colors"
                        >
                          Ẩn bớt
                        </button>
                      )}
                      {hasMoreComments && (
                        <button
                          onClick={() => fetchComments(commentPage + 1, true)}
                          disabled={isLoadingComments}
                          className="text-sm font-bold uppercase tracking-widest text-stone-500 hover:text-black transition-colors disabled:opacity-50"
                        >
                          {isLoadingComments ? 'Đang tải...' : 'Xem thêm đánh giá'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            {/* ── END REVIEWS SECTION ── */}

          </div>

          {/* ── RIGHT COLUMN (sticky) ── */}
          <div className="contents md:block md:w-[48%]">

            {/* Khối chức năng Mua hàng */}
            <div className="order-2 md:order-none mb-10 md:mb-0 md:sticky md:top-24">
              {/* Genre Tag */}
              <span className="inline-block text-[10px] tracking-[0.3em] uppercase border border-stone-200 text-stone-400 px-3 py-1 mb-4">
                {book.genre}
              </span>

              {/* Title */}
              <h1 className="text-3xl font-bold text-black leading-tight mb-2">
                {book.title}
              </h1>

              {/* Author */}
              <p className="text-stone-500 text-sm mb-4">{book.author}</p>

              {/* Rating Preview */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex gap-0.5 text-sm">
                  {renderStars(averageRating)}
                </div>
                <span className="text-sm text-stone-400">({totalRatings} đánh giá)</span>
              </div>

              {/* Giá Sale và Giá gốc */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                {book.discountedPrice && book.discountedPrice < book.price ? (
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold text-rose-600 tracking-tight">
                      {book.discountedPrice.toLocaleString('vi-VN')}₫
                    </p>
                    <p className="text-lg text-stone-400 line-through mb-1">
                      {book.price.toLocaleString('vi-VN')}₫
                    </p>
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 tracking-widest mb-1.5 shadow-sm">
                      Giảm {(book.price - book.discountedPrice).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-black tracking-tight">
                    {book.price.toLocaleString('vi-VN')}₫
                  </p>
                )}
              </div>

              {/* Stock Status */}
              {book.stock > 0 ? (
                <p className="text-sm text-stone-500 flex items-center gap-2 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-500 inline-block" />
                  Còn hàng · {book.stock} sản phẩm
                </p>
              ) : (
                <p className="text-sm text-red-500 flex items-center gap-2 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  Hết hàng
                </p>
              )}

              {/* Quantity */}
              {book.stock > 0 && (
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex border border-gray-200">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-600"
                    >
                      <FontAwesomeIcon icon={['fas', 'minus']} className="text-sm" />
                    </button>
                    <div className="w-12 h-10 flex items-center justify-center font-semibold text-sm border-x border-gray-200">
                      {quantity}
                    </div>
                    <button
                      onClick={() => setQuantity(q => Math.min(book.stock, q + 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-600"
                    >
                      <FontAwesomeIcon icon={['fas', 'plus']} className="text-sm" />
                    </button>
                  </div>
                  <span className="text-sm text-stone-400">Tối đa {book.stock} sản phẩm</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => addToCart(book, quantity)}
                    disabled={book.stock === 0}
                    className="flex-1 py-3.5 hover-flip-btn"
                  >
                    Thêm vào giỏ
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={book.stock === 0}
                    className="flex-1 py-3.5 hover-flip-btn"
                  >
                    Mua ngay
                  </button>
                </div>

                <button
                  onClick={() => toggleFavorite(book)}
                  className="flex items-center justify-center gap-2 py-3 border border-gray-100 hover:border-gray-300 text-stone-500 hover:text-black transition-all duration-200 text-sm"
                >
                  <FontAwesomeIcon
                    icon={[isFavorite(book._id) ? 'fas' : 'far', 'heart']}
                    className={isFavorite(book._id) ? 'text-red-500' : ''}
                  />
                  {isFavorite(book._id) ? 'Đã thêm vào yêu thích' : 'Thêm vào yêu thích'}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="border border-gray-100 p-4 space-y-3">
                {[
                  { icon: 'truck', text: 'Vận chuyển nhanh chóng' },
                  { icon: 'rotate-left', text: 'Đổi trả trong 7 ngày nếu sản phẩm lỗi' },
                  { icon: 'shield-halved', text: 'Cam kết sách chính hãng, chất lượng' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-stone-500">
                    <FontAwesomeIcon icon={['fas', icon]} className="text-stone-300 w-4 flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RELATED BOOKS ── */}
        {recommendedBooks.length > 0 && (
          <section className="mt-20 pt-12 border-t border-gray-100">
            <div className="text-center mb-10">
              <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-2">Gợi ý cho bạn</p>
              <h2 className="text-2xl font-bold text-black">Sản phẩm liên quan</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {recommendedBooks.map((recBook) => (
                <BookCard key={recBook._id} book={recBook} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={loadMoreRecommendations}
                  disabled={isLoadingMore}
                  className="px-10 py-3 hover-flip-btn"
                >
                  {isLoadingMore ? 'Đang tải...' : 'Xem thêm'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── RECENTLY VIEWED ── */}
        {recentBooks.length > 0 && (
          <section className="mt-20 pt-12 border-t border-gray-100">
            <div className="text-center mb-10">
              <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-2">Lịch sử duyệt</p>
              <h2 className="text-2xl font-bold text-black">Sách Bạn Vừa Xem</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {recentBooks.slice(0, 6).map((recentBook) => (
                <BookCard key={recentBook._id} book={recentBook} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BookDetail;