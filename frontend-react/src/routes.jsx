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
import Cart from '@/views/Cart';
import BookDetail from '@/views/BookDetail';
import Favorites from '@/views/Favorites';
import Orders from '@/views/Orders';
import Profile from '@/views/Profile';
import Checkout from '@/views/Checkout';
import SearchResults from '@/views/SearchResults';
import BookList from '@/views/BookList';

import AdminDashboard from '@/views/admin/AdminDashBoard';
import AdminBookList from '@/views/admin/AdminBookList';
import AddBook from '@/views/admin/AddBook';
import EditBook from '@/views/admin/EditBook';
import AdminUsers from '@/views/admin/AdminUsers';
import AdminOrders from '@/views/admin/AdminOrders';
import AdminCommentList from '@/views/admin/AdminCommentList';

// --- LAZY LOAD VIEWS ---
const ViewAllBooks = lazy(() => import('@/views/ViewAllBooks'));
const AdminOrderDetail = lazy(() => import('@/views/admin/AdminOrderDetail'));
const AdminRevenue = lazy(() => import('@/views/admin/AdminRevenue'));
const AdminMessages = lazy(() => import('@/views/admin/AdminMessages'));

// --- GUARDS (Bảo vệ Route) ---
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
    const adminToken = localStorage.getItem('adminToken');
    return adminToken ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
    const location = useLocation();

    // Middleware xử lý Token
    useEffect(() => {
        const isAdminRoute = location.pathname.startsWith('/admin');
        if (isAdminRoute) {
            localStorage.removeItem('token');
        } else {
            localStorage.removeItem('adminToken');
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
                    <Route path="search" element={<SearchResults />} />
                    <Route path="books/view-all" element={<ViewAllBooks />} />
                    <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                    <Route path="checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
                    <Route path="orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
                </Route>

                {/* Admin */}
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="books" element={<AdminBookList />} />
                    <Route path="add-book" element={<AddBook />} />
                    <Route path="edit-book/:id" element={<EditBook />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="comments" element={<AdminCommentList />} />
                    <Route path="orders/:id" element={<AdminOrderDetail />} />
                    <Route path="revenue" element={<AdminRevenue />} />
                    <Route path="messages" element={<AdminMessages />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<div className="p-20 text-center text-2xl font-bold">404 - Không tìm thấy trang</div>} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;