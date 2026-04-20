import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import ironImg from '../assets/image/iron1.jpg';
import logoImg from '../assets/image/logo.png';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const navigate = useNavigate();

  // Logic kiểm tra mật khẩu
  const passwordMismatch = form.password !== form.confirmPassword;
  const passwordTooShort = form.password.length > 0 && form.password.length < 8;
  const missingUppercase = form.password.length > 0 && !/[A-Z]/.test(form.password);

  // Gom tất cả lỗi vào 1 mảng để hiển thị tập trung
  const validationErrors = [];
  if (hasSubmitted) {
    if (passwordTooShort) validationErrors.push('Mật khẩu phải có ít nhất 8 ký tự.');
    if (!passwordTooShort && missingUppercase) validationErrors.push('Mật khẩu phải có ít nhất 1 chữ cái viết hoa.');
    if (passwordMismatch) validationErrors.push('Mật khẩu không khớp.');
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);

    if (passwordMismatch || passwordTooShort || missingUppercase) return;

    setLoading(true);
    setErrorMessage('');
    try {
      await axios.post('http://localhost:5000/api/auth/register', form);
      alert('Đăng ký thành công! Hãy đăng nhập nhé.');
      navigate('/login');
    } catch (error) {
      setErrorMessage(error.response?.data?.msg || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full select-none">
      <div className="hidden md:block md:w-3/5 xl:w-4/5 overflow-hidden relative">
        <img src={ironImg} className="h-screen w-screen object-cover" alt="Background" />
      </div>

      <div className="w-full md:w-2/5 xl:w-1/5 flex items-center justify-center bg-white select-none">
        <div className="max-w-lg w-full p-6 sm:p-8 rounded">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-gray-800">Đăng Ký</h2>

          {/* ✅ KHUNG CẢNH BÁO TẬP TRUNG (Chỉ hiện khi có lỗi) */}
          <div className="min-h-[64px] mb-4 w-full">
            {(validationErrors.length > 0 || errorMessage) && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm font-medium flex flex-col gap-1 shadow-sm">
                {validationErrors.map((err, index) => (
                  <p key={index} className="flex items-start gap-2">
                    <i className="fas fa-exclamation-circle mt-0.5"></i> {err}
                  </p>
                ))}
                {errorMessage && (
                  <p className="flex items-start gap-2">
                    <i className="fas fa-exclamation-circle mt-0.5"></i> {errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleRegister}>
            {/* Các ô input xếp sát nhau siêu gọn */}
            <div className="mb-4">
              <label className="block font-medium text-base sm:text-lg mb-1">Tên người dùng</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text"
                required
                className="w-full p-2.5 border-2 border-gray-300 rounded focus:outline-none focus:border-stone-800 transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium text-base sm:text-lg mb-1">Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                required
                className="w-full p-2.5 border-2 border-gray-300 rounded focus:outline-none focus:border-stone-800 transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium text-base sm:text-lg mb-1">Mật khẩu</label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type="password"
                required
                className="w-full p-2.5 border-2 border-gray-300 rounded focus:outline-none focus:border-stone-800 transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="block font-medium text-base sm:text-lg mb-1">Nhập lại mật khẩu</label>
              <input
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                type="password"
                required
                className="w-full p-2.5 border-2 border-gray-300 rounded focus:outline-none focus:border-stone-800 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded hover-flip-btn text-lg font-bold flex items-center justify-center relative"
              disabled={loading}
            >
              {loading && <span className="absolute left-1/2 -translate-x-16 animate-spin"><i className="fas fa-spinner"></i></span>}
              <span>Đăng Ký</span>
            </button>
          </form>

          <p className="text-center mt-6 text-base text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 font-bold hover:underline transition-all">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;