import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const AddBook = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    author: "",
    genre: "",
    price: 0,
    stock: 0,
    description: "",
  });

  const [imageFile, setImageFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  // Hàm xử lý gõ số Tiền
  const handleCurrencyChange = (field, value) => {
    if (value === "") {
      setForm(prev => ({ ...prev, [field]: "" }));
      return;
    }
    const rawValue = value.replace(/\D/g, "");
    setForm(prev => ({ ...prev, [field]: rawValue !== "" ? parseInt(rawValue, 10) : "" }));
  };

  // Hàm xử lý phím mũi tên Lên/Xuống (+/- 1000đ)
  const handleCurrencyKeyDown = (e, field) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setForm(prev => ({ ...prev, [field]: (Number(prev[field]) || 0) + 1000 }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setForm(prev => ({ ...prev, [field]: Math.max(0, (Number(prev[field]) || 0) - 1000) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === "price" || key === "stock") {
          formData.append(key, Number(val));
        } else {
          formData.append(key, val);
        }
      });

      if (imageFile) {
        formData.append("image", imageFile);
      }

      await axios.post("http://localhost:5000/api/books", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      Swal.fire("Thành công", "Đã thêm sách", "success");
      navigate("/admin/books");
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.msg || "Không thể thêm sách";
      Swal.fire("Lỗi", message, "error");
    }
  };

  const inputClasses = "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-400";

  return (
    <div className="max-w-2xl mx-auto p-6 relative">
      <button
        onClick={() => navigate('/admin/books')}
        className="absolute top-4 left-4 text-gray-600 hover:text-black flex items-center"
      >
        <FaArrowLeft className="text-xl" />
      </button>

      <h2 className="text-2xl font-bold mb-4 text-center">Thêm Sách Mới</h2>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Hàng 1: Tiêu đề (Full chiều ngang) */}
          <div className="md:col-span-2">
            <input
              name="title" value={form.title} onChange={handleInputChange}
              type="text" placeholder="Tiêu đề sách" className={inputClasses} required
            />
          </div>

          {/* ✅ Hàng 2: Tác giả - Thể loại (Chung 1 dòng) */}
          <div>
            <input
              name="author" value={form.author} onChange={handleInputChange}
              type="text" placeholder="Tác giả" className={inputClasses}
            />
          </div>
          <div>
            <input
              name="genre" value={form.genre} onChange={handleInputChange}
              type="text" placeholder="Thể loại" className={inputClasses}
            />
          </div>

          {/* Hàng 3: Giá gốc - Số lượng */}
          <div>
            <label className="block text-amber-900 font-medium mb-1">Giá bán (VNĐ)</label>
            <div className="relative">
              <input
                type="text" required
                value={form.price !== "" ? Number(form.price).toLocaleString('vi-VN') : ""}
                onChange={(e) => handleCurrencyChange('price', e.target.value)}
                onKeyDown={(e) => handleCurrencyKeyDown(e, 'price')}
                className={`${inputClasses} pr-8 font-semibold`}
                placeholder="0"
              />
              <span className="absolute right-3 top-2 text-gray-500 font-bold">₫</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 italic">* Phím Lên/Xuống để ±1.000đ</p>
          </div>

          <div>
            <label className="block text-amber-900 font-medium mb-1">Số lượng tồn kho</label>
            <input
              name="stock" value={form.stock} onChange={handleInputChange}
              type="number" min="0" className={inputClasses} required
            />
          </div>

          {/* Hàng 4: Mô tả */}
          <div className="md:col-span-2 mt-2">
            <textarea
              name="description" value={form.description} onChange={handleInputChange}
              placeholder="Mô tả nội dung sách..." className={inputClasses} rows="4"
            ></textarea>
          </div>

          {/* Hàng 5: Upload Ảnh */}
          <div className="md:col-span-2">
            <label className="block text-amber-900 font-medium mb-1">Ảnh bìa sách</label>
            <input
              type="file" onChange={handleFileChange} accept="image/*" className={inputClasses}
            />
          </div>

          {/* Nút Submit */}
          <div className="md:col-span-2">
            <button type="submit" className="w-full bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 mt-2 font-bold transition-colors">
              ➕ XÁC NHẬN THÊM SÁCH
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBook;