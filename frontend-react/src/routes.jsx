// src/routes.jsx
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// --- IMPORT LAYOUTS ---
import UserLayout from '@/layouts/UserLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/layouts/AuthLayout';

// --- IMPORT CÁC TRANG CƠ BẢN ---
import Home from '@/views/Home';
import Login from '@/views/Login';
import Register from '@/views/Register';
import About from '@/views/About';
import Cart from '@/views/Cart';
import BookDetail from '@/views/BookDetail';
import Favorites from '@/views/Favorites';
import Orders from '@/views/Orders';
import OrderDetail from '@/views/OrderDetail';
import Profile from '@/views/Profile';
import Checkout from '@/views/Checkout';
import SearchResults from '@/views/SearchResults';
import BookList from '@/views/BookList';
import VnpayReturn from './views/VnpayReturn';
import AdminDashboard from '@/views/admin/AdminDashBoard';
import AdminBookList from '@/views/admin/AdminBookList';
import AddBook from '@/views/admin/AddBook';
import EditBook from '@/views/admin/EditBook';
import AdminUsers from '@/views/admin/AdminUsers';
import AdminOrders from '@/views/admin/AdminOrders';
import AdminCommentList from '@/views/admin/AdminCommentList';
import AdminVouchers from '@/views/admin/AdminVouchers';
import AdminPromotions from './views/admin/AdminPromotions';

const ViewAllBooks = lazy(() => import('@/views/ViewAllBooks'));
const AdminOrderDetail = lazy(() => import('@/views/admin/AdminOrderDetail'));
const AdminRevenue = lazy(() => import('@/views/admin/AdminRevenue'));
const AdminMessages = lazy(() => import('@/views/admin/AdminMessages'));

// --- GUARDS ---
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};

// ✅ ĐÃ SỬA: Guard kiểm tra quyền Super Admin
const AdminRoute = ({ children, requireSuperAdmin = false }) => {
    const adminToken = localStorage.getItem('adminToken');
    const userRole = localStorage.getItem('userRole');

    if (!adminToken) return <Navigate to="/login" replace />;

    // Chặn nhân viên truy cập trang quản trị tài chính
    if (requireSuperAdmin && userRole !== 'admin') {
        return <Navigate to="/admin/orders" replace />;
    }

    return children;
};

const AppRoutes = () => {
    const location = useLocation();

    useEffect(() => {
        const isAdminRoute = location.pathname.startsWith('/admin');
        if (isAdminRoute) {
            localStorage.removeItem('token');
        } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('userRole');
        }
    }, [location.pathname]);

    const FallbackLoading = <div className="p-10 text-center text-gray-500">Đang tải...</div>;

    return (
        <Suspense fallback={FallbackLoading}>
            <Routes>
                {/* Auth */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>

                {/* User */}
                <Route path="/" element={<UserLayout />}>
                    <Route index element={<Home />} />
                    <Route path="books" element={<BookList />} />
                    <Route path="books/:id" element={<BookDetail />} />
                    <Route path="favorites" element={<Favorites />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="about" element={<About />} />
                    <Route path="search" element={<SearchResults />} />
                    <Route path="books/view-all" element={<ViewAllBooks />} />
                    <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                    <Route path="checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
                    <Route path="orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
                    <Route path="orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
                    <Route path="/vnpay-return" element={<VnpayReturn />} />
                </Route>

                {/* Admin Area */}
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>

                    {/* 🔒 CHỈ DÀNH CHO QUẢN TRỊ VIÊN (ADMIN TỐI CAO) */}
                    {/* Giữ requireSuperAdmin cho Dashboard và Revenue */}
                    <Route index element={<AdminRoute requireSuperAdmin={true}><AdminDashboard /></AdminRoute>} />
                    <Route path="revenue" element={<AdminRoute requireSuperAdmin={true}><AdminRevenue /></AdminRoute>} />

                    {/* 👨‍💻 DÀNH CHO NHÂN VIÊN VÀ ADMIN (Đã bỏ requireSuperAdmin) */}
                    <Route path="users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="vouchers" element={<AdminRoute><AdminVouchers /></AdminRoute>} />
                    <Route path="promotions" element={<AdminRoute><AdminPromotions /></AdminRoute>} />

                    {/* Các route vận hành khác giữ nguyên */}
                    <Route path="books" element={<AdminRoute><AdminBookList /></AdminRoute>} />
                    <Route path="add-book" element={<AdminRoute><AddBook /></AdminRoute>} />
                    <Route path="edit-book/:id" element={<AdminRoute><EditBook /></AdminRoute>} />
                    <Route path="orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
                    <Route path="orders/:id" element={<AdminRoute><AdminOrderDetail /></AdminRoute>} />
                    <Route path="comments" element={<AdminRoute><AdminCommentList /></AdminRoute>} />
                    <Route path="messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
                </Route>

                <Route path="*" element={<div className="p-20 text-center text-2xl font-bold">404 - Không tìm thấy trang</div>} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;