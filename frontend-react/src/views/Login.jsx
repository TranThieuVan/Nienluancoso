import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import ironImg from '../assets/image/iron1.jpg';
import logoImg from '../assets/image/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login); // Lấy hàm login từ Zustand
  const emailInputRef = useRef(null);

  useEffect(() => {
    // Focus vào ô email khi trang vừa tải (giống nextTick + onMounted)
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); // Thay thế cho @submit.prevent

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      const { token, user } = res.data;

      if (user.role === 'admin') {
        localStorage.setItem('adminToken', token);
        navigate('/admin');
      } else {
        loginAction(user, token); // Gọi hàm của Zustand
        navigate('/');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.msg || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Slider background */}
      <div className="hidden md:block md:w-3/5 xl:w-4/5 overflow-hidden relative">
        <img src={ironImg} className="h-screen w-screen object-cover" alt="Background" />
      </div>

      {/* Login form */}
      <div className="w-full md:w-2/5 xl:w-1/5 flex items-center justify-center bg-white">
        <div className="max-w-lg w-full p-8 rounded">
          <img src={logoImg} alt="Logo" className="mx-auto mb-8 w-60" />
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Đăng Nhập</h2>

          {errorMessage && (
            <p className="text-red-600 text-center mb-4">{errorMessage}</p>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="block font-medium text-lg">Email</label>
              <input
                ref={emailInputRef}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="mb-5 relative">
              <label className="block font-medium text-lg">Mật khẩu</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-9 text-gray-500"
              >
                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </button>
            </div>

            <button
              type="submit"
              className="w-full p-2 rounded hover-flip-btn text-lg font-semibold flex items-center justify-center"
              disabled={loading}
            >
              {loading && <span className="animate-spin mr-2"><i className="fas fa-spinner"></i></span>}
              Đăng Nhập
            </button>
          </form>

          <p className="text-center mt-5 text-lg">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;