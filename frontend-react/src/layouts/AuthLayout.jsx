import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Nơi hiển thị trang Login hoặc Register */}
      <Outlet />
    </div>
  );
};

export default AuthLayout;