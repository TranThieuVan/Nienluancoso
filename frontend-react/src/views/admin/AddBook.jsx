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
        <div className="grid grid-cols-1 gap-4">
          <input
            name="title" value={form.title} onChange={handleInputChange}
            type="text" placeholder="Tiêu đề" className={inputClasses} required
          />
          <input
            name="author" value={form.author} onChange={handleInputChange}
            type="text" placeholder="Tác giả" className={inputClasses}
          />
          <input
            name="genre" value={form.genre} onChange={handleInputChange}
            type="text" placeholder="Thể loại" className={inputClasses}
          />

          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-amber-900 font-medium mb-1">Giá (VNĐ)</label>
              <input
                name="price" value={form.price} onChange={handleInputChange}
                type="number" className={inputClasses} required
              />
            </div>

            <div className="w-1/2">
              <label className="block text-amber-900 font-medium mb-1">Số lượng</label>
              <input
                name="stock" value={form.stock} onChange={handleInputChange}
                type="number" min="0" className={inputClasses} required
              />
            </div>
          </div>

          <textarea
            name="description" value={form.description} onChange={handleInputChange}
            placeholder="Mô tả" className={inputClasses} rows="3"
          ></textarea>

          <input
            type="file" onChange={handleFileChange} accept="image/*" className={inputClasses}
          />

          <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 mt-2">
            ➕ Thêm sách
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBook;