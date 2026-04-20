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
  const loginAction = useAuthStore((state) => state.login);
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      const { token, user } = res.data;

      if (user.role === 'admin' || user.role === 'employee') {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('userRole', user.role);

        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/admin/orders');
        }
      } else {
        loginAction(user, token);
        navigate('/');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.msg || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden md:block md:w-3/5 xl:w-4/5 overflow-hidden relative">
        <img src={ironImg} className="h-screen w-screen object-cover" alt="Background" />
      </div>

      <div className="w-full md:w-2/5 xl:w-1/5 flex items-center justify-center bg-white select-none">
        <div className="max-w-lg w-full p-8 rounded">
          <img src={logoImg} alt="Logo" className="mx-auto mb-8 w-60" />
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Đăng Nhập</h2>

          {/* ✅ KHUNG CẢNH BÁO TẬP TRUNG */}
          <div className="min-h-[56px] mb-4 w-full">
            {errorMessage && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm font-medium flex items-start gap-2 shadow-sm">
                <i className="fas fa-exclamation-circle mt-0.5 text-lg"></i>
                <div className="leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-5 select-none">
              <label className="block font-medium text-lg mb-2">Email</label>
              <input
                ref={emailInputRef}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full p-2.5 border-2 border-gray-300 rounded focus:outline-none focus:border-stone-800 transition-colors"
              />
            </div>

            <div className="mb-6 relative select-none">
              <label className="block font-medium text-lg mb-2">Mật khẩu</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full p-2.5 border-2 border-gray-300 rounded focus:outline-none focus:border-stone-800 pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-11 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded hover-flip-btn text-lg font-bold flex items-center justify-center relative"
              disabled={loading}
            >
              {loading && <span className="absolute left-1/2 -translate-x-16 animate-spin"><i className="fas fa-spinner"></i></span>}
              <span>Đăng Nhập</span>
            </button>
          </form>

          <p className="text-center mt-6 text-base text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-blue-600 font-bold hover:underline transition-all">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;