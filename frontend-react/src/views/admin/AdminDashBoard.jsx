import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUser, FaBook, FaFileInvoiceDollar } from 'react-icons/fa';

const AdminDashBoard = () => {
  const [stats, setStats] = useState({
    userCount: 0,
    bookCount: 0,
    orderCount: 0,
  });
  const [topSellingBooks, setTopSellingBooks] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockBooks, setLowStockBooks] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      // Đã fix lỗi thiếu biến lowStockRes ở file Vue cũ
      const [userRes, bookRes, orderRes, topBooksRes, lowStockRes] = await Promise.all([
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/books'),
        axios.get('/api/admin/orders', { headers }),
        axios.get('/api/books/top-selling'),
        axios.get('/api/books/low-stock')
      ]);

      setStats({
        userCount: userRes.data.length,
        bookCount: bookRes.data.length,
        orderCount: orderRes.data.length,
      });
      setTopSellingBooks(topBooksRes.data);
      setRecentOrders(orderRes.data.slice(0, 5));
      setLowStockBooks(lowStockRes.data);
    } catch (err) {
      console.error('Lỗi khi lấy thống kê:', err);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0₫';
    return Number(value).toLocaleString('vi-VN') + '₫';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return 'Đang xử lý';
      case 'shipping': return 'Đang giao';
      case 'delivered': return 'Đã giao';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 font-medium';
      case 'shipping':
      case 'delivered': return 'text-green-600 font-medium';
      case 'cancelled': return 'text-red-600 font-medium';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">QUẢN LÝ CHUNG</h1>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-100 shadow rounded-xl p-6 flex items-center gap-4">
          <div className="text-4xl text-blue-600"><FaUser /></div>
          <div>
            <p className="text-sm text-gray-600">Người dùng</p>
            <p className="text-xl font-bold text-gray-800">{stats.userCount}</p>
          </div>
        </div>

        <div className="bg-green-100 shadow rounded-xl p-6 flex items-center gap-4">
          <div className="text-4xl text-green-600"><FaBook /></div>
          <div>
            <p className="text-sm text-gray-600">Sách</p>
            <p className="text-xl font-bold text-gray-800">{stats.bookCount}</p>
          </div>
        </div>

        <div className="bg-yellow-100 shadow rounded-xl p-6 flex items-center gap-4">
          <div className="text-4xl text-yellow-600"><FaFileInvoiceDollar /></div>
          <div>
            <p className="text-sm text-gray-600">Đơn hàng</p>
            <p className="text-xl font-bold text-gray-800">{stats.orderCount}</p>
          </div>
        </div>
      </div>

      {/* Khu vực bảng dữ liệu */}
      <div className="w-full max-w-7xl mx-auto mt-10 flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Cột trái: đơn hàng + top sách */}
        <div className="lg:w-3/5 w-full flex flex-col gap-6">
          {/* Top sách bán chạy */}
          <div className="bg-emerald-100 shadow-md rounded-xl overflow-x-auto flex-grow">
            <h2 className="text-lg font-bold px-4 py-3 border-b bg-emerald-100 text-emerald-700 rounded-t-xl">Top 5 sách bán chạy</h2>
            <table className="w-full text-sm text-left text-gray-700 min-w-[600px]">
              <thead className="bg-emerald-200 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-center">Top</th>
                  <th className="px-3 py-2 text-center">Ảnh</th>
                  <th className="px-3 py-2">Tên sách</th>
                  <th className="px-3 py-2">Tác giả</th>
                  <th className="px-3 py-2 text-center">Đã bán</th>
                </tr>
              </thead>
              <tbody className="bg-emerald-100">
                {topSellingBooks.map((book, index) => (
                  <tr key={book._id} className="border-t hover:bg-emerald-200">
                    <td className="px-3 py-2 text-center font-semibold">{index + 1}</td>
                    <td className="px-3 py-2 text-center">
                      <img src={book.image} alt={book.title} className="w-10 h-14 object-cover rounded shadow-sm mx-auto" />
                    </td>
                    <td className="px-3 py-2 font-medium truncate max-w-[150px]">{book.title}</td>
                    <td className="px-3 py-2 truncate max-w-[100px]">{book.author}</td>
                    <td className="px-3 py-2 text-center text-red-700 font-semibold">{book.totalSold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Đơn hàng gần đây */}
          <div className="bg-cyan-100 shadow-md rounded-xl overflow-x-auto flex-grow">
            <h2 className="text-lg font-bold px-4 py-3 border-b bg-cyan-100 text-cyan-700 rounded-t-xl">5 Đơn hàng gần đây</h2>
            <table className="w-full text-sm text-left text-gray-700 min-w-[500px]">
              <thead className="bg-cyan-200 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2">Khách hàng</th>
                  <th className="px-3 py-2 text-center">Tổng tiền</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="bg-cyan-100">
                {recentOrders.map(order => (
                  <tr key={order._id} className="border-t hover:bg-cyan-200">
                    <td className="px-3 py-2">{order.user?.name}</td>
                    <td className="text-center font-semibold text-green-600">{formatCurrency(order.totalPrice)}</td>
                    <td className={`px-3 py-2 capitalize ${statusClass(order.status)}`}>
                      {translateStatus(order.status)}
                    </td>
                    <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột phải: sách sắp hết */}
        <div className="lg:w-2/5 w-full flex flex-col bg-rose-100 shadow-md rounded-xl h-full">
          <h2 className="text-lg font-bold px-4 py-3 border-b bg-rose-100 text-rose-700 rounded-t-xl">Sách sắp hết hàng</h2>
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-rose-200 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-center">Ảnh</th>
                <th className="px-3 py-2">Tên sách</th>
                <th className="px-3 py-2 text-center">Số lượng</th>
              </tr>
            </thead>
            <tbody className="bg-rose-100">
              {lowStockBooks.map(book => (
                <tr key={book._id} className="border-t hover:bg-rose-100">
                  <td className="px-3 py-2 text-center">
                    <img src={book.image} alt={book.title} className="w-10 h-14 object-cover rounded shadow-sm mx-auto" />
                  </td>
                  <td className="px-3 py-2 font-medium truncate max-w-[150px]">{book.title}</td>
                  <td className="px-3 py-2 text-center font-semibold text-red-600">{book.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashBoard;