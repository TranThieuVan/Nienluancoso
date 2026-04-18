import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const formatPrice = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const formatForInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const ALL_RANKS = ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương'];
const RANK_COLOR = { 'Kim cương': 'text-blue-700', 'Bạch kim': 'text-purple-600', 'Vàng': 'text-amber-600', 'Bạc': 'text-gray-500', 'Khách hàng': 'text-gray-600' };

const today = new Date();
const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);

const INIT = {
    _id: '', code: '', discountType: 'fixed', discountValue: '',
    minOrderValue: '', maxDiscountAmount: '',
    startDate: formatForInput(today), expirationDate: formatForInput(nextWeek),
    usageLimit: 100, isActive: true, applicableRanks: [...ALL_RANKS], isUnlimitedUsage: false,
};

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(INIT);

    // ✨ Các State dành cho Bộ lọc và Tìm kiếm
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [rankFilter, setRankFilter] = useState('all');

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const now = new Date();

    const stats = [
        { label: 'Tổng voucher', dot: 'bg-indigo-600', value: vouchers.length, bg: 'bg-indigo-200', border: 'border-indigo-300', textLabel: 'text-indigo-700', textVal: 'text-indigo-900' },
        {
            label: 'Đang hoạt động',
            dot: 'bg-green-600',
            bg: 'bg-green-200', border: 'border-green-300', textLabel: 'text-green-700', textVal: 'text-green-900',
            value: vouchers.filter(v => v.isActive && new Date(v.expirationDate) >= now && v.usedCount < v.usageLimit).length
        },
        {
            label: 'Đã khóa / Hết hạn',
            dot: 'bg-red-600',
            bg: 'bg-red-200', border: 'border-red-300', textLabel: 'text-red-700', textVal: 'text-red-900',
            value: vouchers.filter(v => !v.isActive || new Date(v.expirationDate) < now || v.usedCount >= v.usageLimit).length
        },
    ];

    const fetchVouchers = async () => {
        try {
            const res = await axios.get('/api/admin/vouchers', { headers: { Authorization: `Bearer ${token}` } });
            setVouchers(res.data);
        } catch { Swal.fire('Lỗi', 'Không thể lấy danh sách mã giảm giá', 'error'); }
    };

    useEffect(() => { fetchVouchers(); }, []);

    const handleOpenAdd = () => { setForm(INIT); setIsEditing(false); setShowModal(true); };
    const handleOpenEdit = (v) => {
        setForm({
            ...v, startDate: formatForInput(v.startDate), expirationDate: formatForInput(v.expirationDate),
            discountValue: v.discountValue ?? '', minOrderValue: v.minOrderValue ?? '',
            maxDiscountAmount: v.maxDiscountAmount ?? '', isUnlimitedUsage: v.usageLimit >= 999999,
        });
        setIsEditing(true); setShowModal(true);
    };

    const handleCurrency = (field, value) => {
        if (value === '') { setForm(f => ({ ...f, [field]: '' })); return; }
        const raw = value.replace(/\D/g, '');
        setForm(f => ({ ...f, [field]: raw ? parseInt(raw, 10) : '' }));
    };

    const handleRankToggle = (rank) => {
        setForm(f => {
            const has = f.applicableRanks.includes(rank);
            return { ...f, applicableRanks: has ? f.applicableRanks.filter(r => r !== rank) : [...f.applicableRanks, rank] };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (new Date(form.startDate) >= new Date(form.expirationDate))
            return Swal.fire('Lỗi thời gian', 'Ngày bắt đầu phải trước ngày kết thúc!', 'warning');
        if (form.applicableRanks.length === 0)
            return Swal.fire('Lỗi', 'Vui lòng chọn ít nhất 1 hạng áp dụng.', 'warning');

        try {
            const payload = {
                ...form,
                startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
                expirationDate: new Date(`${form.expirationDate}T23:59:59`).toISOString(),
                discountValue: Number(form.discountValue) || 0,
                minOrderValue: Number(form.minOrderValue) || 0,
                maxDiscountAmount: form.maxDiscountAmount !== '' && form.maxDiscountAmount !== null ? Number(form.maxDiscountAmount) : null,
                usageLimit: form.isUnlimitedUsage ? 999999 : (Number(form.usageLimit) || 1),
            };
            delete payload.isUnlimitedUsage;

            if (isEditing) {
                await axios.put(`/api/admin/vouchers/${form._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Thành công!', 'Cập nhật mã giảm giá thành công.', 'success');
            } else {
                await axios.post('/api/admin/vouchers', payload, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Thành công!', 'Tạo mã giảm giá mới thành công.', 'success');
            }
            setShowModal(false);
            fetchVouchers();
        } catch (err) { Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error'); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa', text: 'Dữ liệu không thể khôi phục!', icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
            customClass: {
                confirmButton: 'bg-red-600 text-white font-semibold py-2 px-4 mr-2 rounded',
                cancelButton: 'bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded',
            }, buttonsStyling: false,
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/admin/vouchers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Đã xóa!', '', 'success');
                fetchVouchers();
            } catch { Swal.fire('Lỗi', 'Không thể xóa', 'error'); }
        }
    };

    // ✨ LOGIC LỌC DỮ LIỆU FRONTEND
    const filteredVouchers = vouchers.filter(v => {
        const isExpired = new Date(v.expirationDate) < now;
        const isOut = v.usageLimit < 999999 && v.usedCount >= v.usageLimit;

        let status = 'active';
        if (!v.isActive) status = 'locked';
        else if (isExpired) status = 'expired';
        else if (isOut) status = 'out_of_stock';

        // 1. Lọc theo mã (Search)
        const matchSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase());
        // 2. Lọc theo trạng thái
        const matchStatus = statusFilter === 'all' || status === statusFilter;
        // 3. Lọc theo rank
        const matchRank = rankFilter === 'all' || v.applicableRanks.includes(rankFilter);

        return matchSearch && matchStatus && matchRank;
    });

    const inputCls = "w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-gray-400";

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">

            <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý Voucher</h1>
                </div>
                <button onClick={handleOpenAdd}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Thêm mã mới
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
                {stats.map(s => (
                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 shadow-sm`}>
                        <p className={`text-xs uppercase tracking-widest ${s.textLabel} font-bold flex items-center gap-1.5`}>
                            <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
                        </p>
                        <p className={`text-3xl font-bold ${s.textVal} mt-1.5 font-mono`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ✨ GIAO DIỆN BỘ LỌC VÀ TÌM KIẾM */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-end gap-4">
                {/* Search Input */}
                <div className="flex-grow max-w-xs">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-1.5">Tìm kiếm</label>
                    <input
                        type="text"
                        placeholder="Nhập mã voucher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400"
                    />
                </div>

                {/* Filter Trạng thái */}
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-1.5">Trạng thái</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 bg-white cursor-pointer"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">🟢 Đang hoạt động</option>
                        <option value="locked">🔴 Đã khóa</option>
                        <option value="expired">⚪ Hết hạn</option>
                        <option value="out_of_stock">🟠 Hết lượt</option>
                    </select>
                </div>

                {/* Filter Hạng */}
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-1.5">Hạng áp dụng</label>
                    <select
                        value={rankFilter}
                        onChange={(e) => setRankFilter(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 bg-white cursor-pointer"
                    >
                        <option value="all">Tất cả các hạng</option>
                        {ALL_RANKS.map(rank => (
                            <option key={rank} value={rank}>{rank}</option>
                        ))}
                    </select>
                </div>

                {/* Nút Xóa bộ lọc */}
                {(searchTerm || statusFilter !== 'all' || rankFilter !== 'all') && (
                    <button
                        onClick={() => { setSearchTerm(''); setStatusFilter('all'); setRankFilter('all'); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 border border-gray-200 hover:text-red-500 hover:border-red-200 transition-colors self-end mb-0.5"
                    >
                        ✕ Xóa bộ lọc
                    </button>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-500">
                        Hiển thị <strong className="text-gray-900">{filteredVouchers.length}</strong> mã giảm giá
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-base">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['Mã voucher', 'Khuyến mãi', 'Đơn tối thiểu', 'Thời hạn', 'Lượt dùng', 'Trạng thái', 'Hành động'].map((h, i) => (
                                    <th key={h} className={`px-4 py-3 text-xs uppercase tracking-widest text-gray-500 font-bold ${i >= 5 ? 'text-center' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {/* ✨ Render mảng filteredVouchers thay vì mảng gốc */}
                            {filteredVouchers.length === 0 ? (
                                <tr><td colSpan="7" className="py-16 text-center text-base text-gray-400">Không tìm thấy mã giảm giá nào phù hợp.</td></tr>
                            ) : filteredVouchers.map(v => (
                                <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-indigo-600 font-mono tracking-wider text-base">{v.code}</td>
                                    <td className="px-4 py-3 font-bold text-red-600 font-mono text-base">
                                        {v.discountType === 'fixed' ? `Giảm ${formatPrice(v.discountValue)}` : `Giảm ${v.discountValue}%`}
                                    </td>
                                    <td className="px-4 py-3 text-base text-gray-700 font-mono">{formatPrice(v.minOrderValue)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 leading-relaxed">
                                        <span className="text-gray-400 font-semibold">Từ: </span>{formatDate(v.startDate)}<br />
                                        <span className="text-gray-400 font-semibold">Đến: </span>{formatDate(v.expirationDate)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {v.usageLimit >= 999999
                                            ? <span className="text-sm font-bold text-indigo-600">Không giới hạn</span>
                                            : <span className="text-base font-mono text-gray-700">{v.usedCount} / {v.usageLimit}</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(() => {
                                            const isExpired = new Date(v.expirationDate) < new Date();
                                            const isOut = v.usageLimit < 999999 && v.usedCount >= v.usageLimit;

                                            if (!v.isActive) {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Đã khóa
                                                    </span>
                                                );
                                            }
                                            if (isExpired) {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-xs font-bold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />Hết hạn
                                                    </span>
                                                );
                                            }
                                            if (isOut) {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-xs font-bold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Hết lượt
                                                    </span>
                                                );
                                            }

                                            return (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Hoạt động
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleOpenEdit(v)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                                Sửa
                                            </button>
                                            <button onClick={() => handleDelete(v._id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                                                    <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                                </svg>
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                            <h2 className="text-base font-bold text-gray-900">{isEditing ? 'Chỉnh sửa mã giảm giá' : 'Thêm mã mới'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <form id="voucherForm" onSubmit={handleSubmit} className="space-y-5">

                                {/* Toggle trạng thái */}
                                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold text-green-800">Trạng thái mã giảm giá</p>
                                        <p className="text-xs text-green-600 mt-0.5">Tắt để tạm khóa mã mà không xóa</p>
                                    </div>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Code + Type */}
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold pb-1.5 border-b border-gray-100">Thông tin mã</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-bold text-gray-500 mb-1.5">Mã voucher *</label>
                                        <input required placeholder="VD: TET2026"
                                            className={`${inputCls} font-mono font-bold text-indigo-600 tracking-wider uppercase`}
                                            value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-bold text-gray-500 mb-1.5">Loại giảm giá</label>
                                        <select className={inputCls} value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}>
                                            <option value="fixed">Tiền mặt (₫)</option>
                                            <option value="percent">Phần trăm (%)</option>
                                        </select>
                                    </div>

                                    {/* Discount value */}
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-bold text-gray-500 mb-1.5">Giá trị giảm *</label>
                                        <div className="relative">
                                            {form.discountType === 'percent' ? (
                                                <>
                                                    <input required type="number" min="0" max="100" placeholder="10"
                                                        className={`${inputCls} pr-7`}
                                                        value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold pointer-events-none">%</span>
                                                </>
                                            ) : (
                                                <>
                                                    <input required placeholder="0"
                                                        className={`${inputCls} pr-7 font-mono font-semibold`}
                                                        value={form.discountValue !== '' ? Number(form.discountValue).toLocaleString('vi-VN') : ''}
                                                        onChange={e => handleCurrency('discountValue', e.target.value)}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold pointer-events-none">₫</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Min order */}
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-bold text-gray-500 mb-1.5">Đơn tối thiểu</label>
                                        <div className="relative">
                                            <input placeholder="0"
                                                className={`${inputCls} pr-7 font-mono`}
                                                value={form.minOrderValue !== '' ? Number(form.minOrderValue).toLocaleString('vi-VN') : ''}
                                                onChange={e => handleCurrency('minOrderValue', e.target.value)}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold pointer-events-none">₫</span>
                                        </div>
                                    </div>

                                    {/* Max discount (percent only) */}
                                    {form.discountType === 'percent' && (
                                        <div className="col-span-2">
                                            <label className="block text-xs uppercase tracking-wide font-bold text-gray-500 mb-1.5">Giảm tối đa (bỏ trống = không giới hạn)</label>
                                            <div className="relative">
                                                <input placeholder="Không giới hạn"
                                                    className={`${inputCls} pr-7 font-mono`}
                                                    value={form.maxDiscountAmount !== '' && form.maxDiscountAmount !== null ? Number(form.maxDiscountAmount).toLocaleString('vi-VN') : ''}
                                                    onChange={e => handleCurrency('maxDiscountAmount', e.target.value)}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold pointer-events-none">₫</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Dates */}
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold pb-1.5 border-b border-gray-100">Thời hạn</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-bold text-gray-500 mb-1.5">Ngày bắt đầu *</label>
                                        <input type="date" required max={form.expirationDate} className={inputCls}
                                            value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-bold text-gray-500 mb-1.5">Ngày kết thúc *</label>
                                        <input type="date" required min={form.startDate} className={inputCls}
                                            value={form.expirationDate} onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Usage limit */}
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold pb-1.5 border-b border-gray-100">Giới hạn sử dụng</p>
                                <div className="flex items-center gap-3">
                                    <input type="number" min="1" max="999999" disabled={form.isUnlimitedUsage}
                                        className={`${inputCls} flex-1 font-mono font-semibold text-base ${form.isUnlimitedUsage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                        value={form.isUnlimitedUsage ? 999999 : form.usageLimit}
                                        onChange={e => { let v = parseInt(e.target.value, 10); if (v > 999999) v = 999999; setForm(f => ({ ...f, usageLimit: v || '' })); }}
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex-shrink-0 text-sm font-semibold text-gray-700">
                                        <input type="checkbox" className="w-4 h-4 cursor-pointer accent-indigo-600"
                                            checked={form.isUnlimitedUsage}
                                            onChange={e => setForm(f => ({ ...f, isUnlimitedUsage: e.target.checked }))}
                                        />
                                        Không giới hạn
                                    </label>
                                </div>

                                {/* Ranks */}
                                <div>
                                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 mb-3">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Đối tượng áp dụng</p>
                                        <button type="button" onClick={() => setForm(f => ({ ...f, applicableRanks: f.applicableRanks.length === ALL_RANKS.length ? [] : [...ALL_RANKS] }))}
                                            className="text-xs text-indigo-600 font-semibold hover:underline"
                                        >
                                            {form.applicableRanks.length === ALL_RANKS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                        {ALL_RANKS.map(rank => (
                                            <label key={rank}
                                                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full border text-sm font-semibold transition-all ${form.applicableRanks.includes(rank) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                                            >
                                                <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                                                    checked={form.applicableRanks.includes(rank)}
                                                    onChange={() => handleRankToggle(rank)}
                                                />
                                                <span className={RANK_COLOR[rank]}>{rank}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 italic mt-2">* Mã giá trị cao nên giới hạn cho hạng Vàng trở lên.</p>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                            <button onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >Hủy</button>
                            <button type="submit" form="voucherForm"
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                {isEditing ? 'Lưu thay đổi' : 'Tạo mã giảm giá'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVouchers;