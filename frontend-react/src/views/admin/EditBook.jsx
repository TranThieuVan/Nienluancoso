import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const EditBook = () => {
  const { id: bookId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/books/${bookId}`);
        setBook(res.data);
      } catch (err) {
        console.error("❌ Lỗi khi tải thông tin sách:", err);
      }
    };
    fetchBook();
  }, [bookId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBook((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const confirmEditBook = async (e) => {
    e.preventDefault();
    if (!book) return;

    const result = await Swal.fire({
      title: 'Xác nhận chỉnh sửa',
      text: 'Bạn có chắc muốn lưu thay đổi?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Lưu',
      cancelButtonText: 'Hủy',
      customClass: {
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 mr-2 rounded',
        cancelButton: 'bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded',
      },
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    try {
      const formData = new FormData();
      formData.append("title", book.title);
      formData.append("author", book.author);
      formData.append("genre", book.genre);
      formData.append("price", Number(book.price));
      formData.append("stock", Number(book.stock));
      formData.append("description", book.description);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      await axios.put(`http://localhost:5000/api/books/${bookId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      await Swal.fire({
        icon: 'success',
        title: 'Đã cập nhật!',
        text: 'Thông tin sách đã được lưu thành công.',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded',
        },
        buttonsStyling: false,
      });

      navigate("/admin/books");
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật sách:", error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi!',
        text: 'Cập nhật sách thất bại. Vui lòng thử lại.',
        confirmButtonText: 'Đóng',
        customClass: {
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded',
        },
        buttonsStyling: false,
      });
    }
  };

  const inputClasses = "w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl border border-gray-300 mt-4">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Chỉnh Sửa Sách</h1>

        {book ? (
          <form onSubmit={confirmEditBook} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Tiêu đề</label>
              <input name="title" value={book.title} onChange={handleInputChange} type="text" required className={inputClasses} />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Tác giả</label>
              <input name="author" value={book.author} onChange={handleInputChange} type="text" required className={inputClasses} />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Thể loại</label>
              <input name="genre" value={book.genre} onChange={handleInputChange} type="text" required className={inputClasses} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Giá (VNĐ)</label>
                <input name="price" value={book.price} onChange={handleInputChange} type="number" min="0" required className={inputClasses} />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Số lượng</label>
                <input name="stock" value={book.stock} onChange={handleInputChange} type="number" min="0" required className={inputClasses} />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Mô tả</label>
              <textarea name="description" value={book.description} onChange={handleInputChange} rows="4" className={inputClasses} placeholder="Nhập mô tả ngắn về sách"></textarea>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Chọn ảnh mới (nếu muốn đổi)</label>
              <input type="file" onChange={handleFileChange} accept="image/*" className={inputClasses} />
              {imageFile && (
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Ảnh mới được chọn:</span>
                  <img src={imagePreview} alt="Preview" className="w-32 mt-1 border rounded" />
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-2">
              <button type="submit" className="w-3/4 bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700 transition">
                Lưu Thay Đổi
              </button>
              <button type="button" onClick={() => navigate(-1)} className="w-1/4 bg-gray-400 text-white px-4 py-3 rounded font-semibold hover:bg-red-500 transition">
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center text-gray-500 mt-4">Đang tải dữ liệu...</div>
        )}
      </div>
    </div>
  );
};

export default EditBook;