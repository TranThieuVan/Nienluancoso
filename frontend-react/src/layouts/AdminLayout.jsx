import React from 'react';
import { Outlet } from 'react-router-dom';
// Đảm bảo bạn đã chuyển component AdminNavbar sang React (.jsx)
import AdminNavbar from '@/components/AdminNavbar';

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar hoặc Navbar của Admin */}
      <AdminNavbar />

      {/* Khu vực nội dung chính */}
      <main className="ml-64 flex-1 bg-gray-100 p-6 overflow-auto min-h-screen">
        {/* Outlet đóng vai trò giống như <router-view /> trong Vue.
          Nó là nơi các trang con như Dashboard, BookList... sẽ hiển thị.
        */}
        <Outlet />
      </main>
    </div>
  );
};

// Bắt buộc phải có dòng này để tránh lỗi "does not provide an export named 'default'"
export default AdminLayout;