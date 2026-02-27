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
  const navigate = useNavigate();

  // Thay thế computed bằng các biến tính toán trực tiếp
  const passwordMismatch = Boolean(
    form.password && form.confirmPassword && form.password !== form.confirmPassword
  );
  const passwordTooShort = Boolean(
    form.password.length > 0 && form.password.length < 6
  );

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (passwordMismatch) {
      setErrorMessage('⚠️ Mật khẩu không khớp');
      return;
    }

    if (passwordTooShort) {
      setErrorMessage('⚠️ Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/auth/register', form);
      alert('Đăng ký thành công!');
      navigate('/login');
    } catch (error) {
      setErrorMessage(error.response?.data?.msg || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      {/* Slider background */}
      <div className="hidden md:block md:w-3/5 xl:w-4/5 overflow-hidden relative">
        <img src={ironImg} className="h-screen w-screen object-cover" alt="Background" />
      </div>

      {/* Register form */}
      <div className="w-full md:w-2/5 xl:w-1/5 flex items-center justify-center bg-white">
        <div className="max-w-lg w-full p-6 sm:p-8 rounded">
          <img src={logoImg} alt="Logo" className="mx-auto mb-10 w-48 sm:w-60" />
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-gray-800">Đăng Ký</h2>

          {errorMessage && (
            <p className="text-red-600 text-center mb-4">{errorMessage}</p>
          )}

          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block font-medium text-base sm:text-lg">Tên người dùng</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text"
                required
                className="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium text-base sm:text-lg">Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                required
                className="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium text-base sm:text-lg">Mật khẩu</label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type="password"
                required
                className="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {passwordTooShort && (
                <p className="text-red-500 text-sm mt-1">⚠️ Mật khẩu phải có ít nhất 6 ký tự</p>
              )}
            </div>

            <div className="mb-5">
              <label className="block font-medium text-base sm:text-lg">Nhập lại mật khẩu</label>
              <input
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                type="password"
                required
                className="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {passwordMismatch && (
                <p className="text-red-500 text-sm mt-1">⚠️ Mật khẩu không khớp</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full p-2 rounded hover-flip-btn text-lg font-semibold"
              disabled={passwordMismatch || passwordTooShort}
            >
              Đăng Ký
            </button>
          </form>

          <p className="text-center mt-5 text-base sm:text-lg">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;