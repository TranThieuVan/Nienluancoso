import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const AdminPromotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [books, setBooks] = useState([]);
    const [genres, setGenres] = useState([]);

    const [tab, setTab] = useState('campaigns');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [searchPromo, setSearchPromo] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [bookSearch, setBookSearch] = useState('');
    const [selectedBooks, setSelectedBooks] = useState([]);
    const [showBookDropdown, setShowBookDropdown] = useState(false);

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

    const formatForInputDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const initialFormState = {
        _id: '',
        name: '',
        discountType: 'percent',
        discountValue: 1,
        targetType: 'all',
        targetValue: '',
        startDate: formatForInputDate(today),
        endDate: formatForInputDate(nextWeek),
        description: '',
        isActive: true
    };

    const [form, setForm] = useState(initialFormState);

    const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('vi-VN');

    const fetchData = async () => {
        try {
            const [promoRes, bookRes] = await Promise.all([
                axios.get('/api/admin/promotions', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/books')
            ]);
            setPromotions(promoRes.data);
            setBooks(bookRes.data);
            const uniqueGenres = [...new Set(bookRes.data.map(b => b.genre).filter(Boolean))];
            setGenres(uniqueGenres);
        } catch (err) {
            Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getCampaignStatus = (promo) => {
        if (!promo.isActive) return 'paused';
        const now = new Date();
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate);
        if (now < start) return 'upcoming';
        if (now > end) return 'ended';
        return 'active';
    };

    const statusConfig = {
        active: { label: "Đang chạy", color: "text-green-700", bg: "bg-green-100", icon: "🟢" },
        upcoming: { label: "Sắp diễn ra", color: "text-yellow-700", bg: "bg-yellow-100", icon: "🟡" },
        ended: { label: "Đã kết thúc", color: "text-gray-600", bg: "bg-gray-200", icon: "⚪" },
        paused: { label: "Tạm ngưng", color: "text-red-700", bg: "bg-red-100", icon: "🔴" }
    };

    const filteredPromotions = promotions.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(searchPromo.toLowerCase());
        const status = getCampaignStatus(c);
        const matchStatus = filterStatus === 'all' || status === filterStatus;
        return matchSearch && matchStatus;
    });

    const stats = {
        active: promotions.filter(c => getCampaignStatus(c) === 'active').length,
        upcoming: promotions.filter(c => getCampaignStatus(c) === 'upcoming').length,
        total: promotions.length,
    };

    const filteredSearchBooks = books.filter(b =>
        (b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
            b.author?.toLowerCase().includes(bookSearch.toLowerCase())) &&
        !selectedBooks.find(s => s._id === b._id)
    );

    const handleOpenAdd = () => {
        setForm(initialFormState);
        setSelectedBooks([]);
        setIsEditing(false);
        setShowModal(true);
    };

    const handleOpenEdit = (promo) => {
        setForm({
            ...promo,
            startDate: formatForInputDate(promo.startDate),
            endDate: formatForInputDate(promo.endDate),
            discountValue: promo.discountValue ?? 1
        });

        if (promo.targetType === 'book' && promo.targetValue) {
            try {
                const bookConfigs = JSON.parse(promo.targetValue);
                const selected = bookConfigs.map(config => {
                    const b = books.find(book => book._id === config.bookId);
                    if (b) {
                        return { ...b, promoDiscountType: config.discountType, promoDiscountValue: config.discountValue };
                    }
                    return null;
                }).filter(Boolean);
                setSelectedBooks(selected);
            } catch (e) {
                setSelectedBooks([]);
            }
        } else {
            setSelectedBooks([]);
        }

        setIsEditing(true);
        setShowModal(true);
    };

    const updateSelectedBookConfig = (id, field, value) => {
        setSelectedBooks(selectedBooks.map(b =>
            b._id === id ? { ...b, [field]: value } : b
        ));
    };

    const calculatePreviewPrice = (bookPrice, type, val) => {
        const numVal = Number(val) || 0;
        if (numVal === 0) return bookPrice;
        const discountAmount = type === 'percent' ? (bookPrice * numVal) / 100 : numVal;
        const newPrice = Math.round(bookPrice - discountAmount);
        return newPrice > 0 ? newPrice : 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (new Date(form.startDate) >= new Date(form.endDate)) {
            return Swal.fire('Lỗi thời gian', 'Ngày bắt đầu phải trước ngày kết thúc!', 'warning');
        }

        if (form.targetType === 'book') {
            if (selectedBooks.length === 0) return Swal.fire('Thiếu thông tin', 'Vui lòng chọn ít nhất 1 cuốn sách.', 'warning');

            const hasEmptyDiscount = selectedBooks.some(b => !b.promoDiscountValue || Number(b.promoDiscountValue) <= 0);
            if (hasEmptyDiscount) return Swal.fire('Thiếu thông tin', 'Vui lòng nhập mức giảm giá hợp lệ cho tất cả sách đã chọn.', 'warning');
        }

        if (form.targetType === 'genre' && !form.targetValue) {
            return Swal.fire('Thiếu thông tin', 'Vui lòng chọn thể loại sách.', 'warning');
        }

        try {
            Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            let finalTargetValue = form.targetValue;

            if (form.targetType === 'book') {
                const configs = selectedBooks.map(b => ({
                    bookId: b._id,
                    discountType: b.promoDiscountType || 'percent',
                    discountValue: Number(b.promoDiscountValue) || 0
                }));
                finalTargetValue = JSON.stringify(configs);
            }

            const payload = {
                ...form,
                startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
                endDate: new Date(`${form.endDate}T23:59:59`).toISOString(),
                discountType: form.targetType === 'book' ? 'percent' : form.discountType,
                discountValue: form.targetType === 'book' ? 0 : (Number(form.discountValue) || 0),
                targetValue: finalTargetValue
            };

            if (!isEditing) delete payload._id;

            if (isEditing) {
                await axios.put(`/api/admin/promotions/${form._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Thành công!', 'Đã cập nhật chiến dịch.', 'success');
            } else {
                await axios.post('/api/admin/promotions', payload, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Thành công!', 'Tạo chiến dịch thành công.', 'success');
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa',
            text: "Chiến dịch sẽ bị xóa và sách sẽ trở về giá gốc!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Đồng ý xóa'
        });

        if (result.isConfirmed) {
            Swal.fire({ title: 'Đang xử lý...', didOpen: () => Swal.showLoading() });
            try {
                await axios.delete(`/api/admin/promotions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Đã xóa!', 'Đã gỡ chiến dịch thành công.', 'success');
                fetchData();
            } catch (err) {
                Swal.fire('Lỗi', 'Không thể xóa chiến dịch', 'error');
            }
        }
    };

    // Component nhập tiền VNĐ theo đơn vị nghìn
    const VndInput = ({ value, onChange, required, placeholder = "VD: 50" }) => {
        const thousands = value !== '' && value !== undefined && value !== null ? value / 1000 : '';
        const handleStep = (delta) => {
            const current = Number(thousands) || 0;
            const next = Math.max(1, current + delta);
            onChange(next * 1000);
        };
        return (
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <input
                    type="number"
                    min="1"
                    required={required}
                    className="w-full pl-4 py-3 outline-none font-bold text-red-600 bg-transparent"
                    style={{ MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none' }}
                    placeholder={placeholder}
                    value={thousands}
                    onChange={e => {
                        const val = e.target.value;
                        onChange(val !== '' ? parseInt(val, 10) * 1000 : '');
                    }}
                />
                <span className="py-3 pr-1 text-gray-500 font-bold text-sm whitespace-nowrap select-none">.000 ₫</span>
                {/* <div className="flex flex-col border-l border-gray-300 self-stretch">
                    <button
                        type="button"
                        className="flex-1 px-2.5 hover:bg-gray-200 text-gray-500 text-[10px] leading-none flex items-center justify-center border-b border-gray-200"
                        onClick={() => handleStep(1)}
                    >▲</button>
                    <button
                        type="button"
                        className="flex-1 px-2.5 hover:bg-gray-200 text-gray-500 text-[10px] leading-none flex items-center justify-center"
                        onClick={() => handleStep(-1)}
                    >▼</button>
                </div> */}
            </div>
        );
    };

    // Component nhập tiền VNĐ theo đơn vị nghìn cho từng sách (dạng nhỏ gọn trong table)
    const VndInputSmall = ({ value, onChange }) => {
        const thousands = value !== '' && value !== undefined && value !== null ? value / 1000 : '';
        const handleStep = (delta) => {
            const current = Number(thousands) || 0;
            const next = Math.max(1, current + delta);
            onChange(next * 1000);
        };
        return (
            <div className="flex bg-gray-50 border border-gray-300 rounded overflow-hidden h-9">
                <input
                    type="number"
                    min="1"
                    className="w-full pl-2 outline-none text-red-600 font-bold text-sm bg-transparent"
                    style={{ MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none' }}
                    placeholder="1"
                    value={thousands}
                    onChange={e => {
                        const val = e.target.value;
                        onChange(val !== '' ? parseInt(val, 10) * 1000 : '');
                    }}
                />
                <span className="py-1 pr-1 text-gray-500 font-bold text-xs whitespace-nowrap self-center select-none">.000</span>
                {/* <div className="flex flex-col border-l border-gray-300 self-stretch">
                    <button
                        type="button"
                        className="flex-1 px-1.5 hover:bg-gray-200 text-gray-500 text-[9px] leading-none flex items-center justify-center border-b border-gray-200"
                        onClick={() => handleStep(1)}
                    >▲</button>
                    <button
                        type="button"
                        className="flex-1 px-1.5 hover:bg-gray-200 text-gray-500 text-[9px] leading-none flex items-center justify-center"
                        onClick={() => handleStep(-1)}
                    >▼</button>
                </div> */}
            </div>
        );
    };

    return (
        <div className="flex flex-col p-6 w-full bg-gray-50 min-h-screen">
            <style>{`
                input[type=number].no-spinner::-webkit-inner-spin-button,
                input[type=number].no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>

            {/* Header & Thống kê */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Chiến Dịch <span className="text-blue-600">Giảm Giá</span></h1>
                <p className="text-gray-500 mt-1">Quản lý và thiết lập Flash Sale tự động cho toàn hệ thống sách.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { label: "Đang diễn ra", value: stats.active, icon: "⚡", color: "text-green-600", bg: "bg-green-100" },
                    { label: "Sắp diễn ra", value: stats.upcoming, icon: "⏳", color: "text-yellow-600", bg: "bg-yellow-100" },
                    { label: "Tổng chiến dịch", value: stats.total, icon: "📋", color: "text-blue-600", bg: "bg-blue-100" },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${s.bg} ${s.color}`}>
                            {s.icon}
                        </div>
                        <div>
                            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                            <div className="text-sm font-medium text-gray-500 mt-1">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-6 border-b border-gray-200 mb-6">
                <button
                    className={`pb-3 font-semibold text-lg transition-colors border-b-2 ${tab === 'campaigns' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTab('campaigns')}
                >
                    Danh sách Chiến dịch
                </button>
                <button
                    className={`pb-3 font-semibold text-lg transition-colors border-b-2 ${tab === 'books' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTab('books')}
                >
                    Sách đang sale
                </button>
            </div>

            {/* TAB: CHIẾN DỊCH */}
            {tab === 'campaigns' && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex flex-wrap justify-between gap-4 mb-4 items-center">
                        <div className="flex gap-3 w-full md:w-auto">
                            <input
                                className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="🔍 Tìm tên chiến dịch..."
                                value={searchPromo} onChange={e => setSearchPromo(e.target.value)}
                            />
                            <select
                                className="border border-gray-300 rounded-lg px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="active">Đang chạy</option>
                                <option value="upcoming">Sắp diễn ra</option>
                                <option value="ended">Đã kết thúc</option>
                                <option value="paused">Tạm ngưng</option>
                            </select>
                        </div>
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md font-bold transition-all flex items-center gap-2"
                            onClick={handleOpenAdd}
                        >
                            <FontAwesomeIcon icon={['fas', 'plus']} /> TẠO CHIẾN DỊCH MỚI
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                                <tr>
                                    <th className="p-4 font-semibold">Tên chương trình</th>
                                    <th className="p-4 font-semibold">Phạm vi</th>
                                    <th className="p-4 font-semibold">Khuyến mãi</th>
                                    <th className="p-4 font-semibold">Thời gian</th>
                                    <th className="p-4 font-semibold">Trạng thái</th>
                                    <th className="p-4 font-semibold text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPromotions.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-500 italic">Không tìm thấy chiến dịch nào</td></tr>
                                ) : filteredPromotions.map(c => {
                                    const status = getCampaignStatus(c);
                                    const conf = statusConfig[status];
                                    return (
                                        <tr key={c._id} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800 text-lg">{c.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">{c.description || "Không có ghi chú"}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                        {c.targetType === "all" ? "TẤT CẢ" : c.targetType === "genre" ? "THỂ LOẠI" : "SÁCH CỤ THỂ"}
                                                    </span>
                                                    <span className="text-sm font-medium text-blue-800">
                                                        {c.targetType === "book" ? "Nhiều tựa sách" : c.targetType === "all" ? "Cửa hàng" : c.targetValue}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-red-600 font-bold">
                                                {c.targetType === "book" ? (
                                                    <span className="text-blue-600 text-sm italic">Giá riêng từng cuốn</span>
                                                ) : (
                                                    <span className="text-lg font-black">{c.discountType === 'percent' ? `-${c.discountValue}%` : `-${formatPrice(c.discountValue)}`}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                <div>{formatDate(c.startDate)}</div>
                                                <div className="text-gray-400 font-light">đến {formatDate(c.endDate)}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-max ${conf.bg} ${conf.color}`}>
                                                    {conf.icon} {conf.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center space-x-2">
                                                <button onClick={() => handleOpenEdit(c)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-md transition-colors">
                                                    <FontAwesomeIcon icon={['fas', 'pen']} />
                                                </button>
                                                <button onClick={() => handleDelete(c._id)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-md transition-colors">
                                                    <FontAwesomeIcon icon={['fas', 'trash']} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: SÁCH ĐANG SALE */}
            {tab === 'books' && (
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {books.filter(b => b.discountedPrice && b.discountedPrice < b.price).map(book => (
                            <div key={book._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow relative">
                                <div className="absolute top-2 right-2 bg-red-500 text-white font-black text-xs px-2.5 py-1 rounded-lg z-10 shadow">
                                    -{Math.round((1 - book.discountedPrice / book.price) * 100)}%
                                </div>
                                <div className="h-48 overflow-hidden bg-gray-100 flex justify-center items-center">
                                    <img src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`} alt={book.title} className="h-full object-cover w-full" />
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight h-10">{book.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{book.author}</p>
                                    <div className="mt-3 flex flex-col">
                                        <span className="text-xs text-gray-400 line-through font-medium">{formatPrice(book.price)}</span>
                                        <span className="text-lg font-black text-red-600 leading-none mt-0.5">{formatPrice(book.discountedPrice)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {books.filter(b => b.discountedPrice && b.discountedPrice < b.price).length === 0 && (
                            <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-xl border">
                                Hiện không có sách nào đang được giảm giá.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL THÊM / SỬA CHIẾN DỊCH */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-gray-800">{isEditing ? 'Cập Nhật Chiến Dịch' : 'Thiết Lập Khuyến Mãi Mới'}</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Hệ thống sẽ tự động cập nhật giá sách theo thông số bên dưới.</p>
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50">
                                <FontAwesomeIcon icon={['fas', 'xmark']} className="text-xl" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="promoForm" onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Tên chương trình *</label>
                                    <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-gray-800" placeholder="VD: Săn sale giữa tháng, Mừng tựu trường..."
                                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>

                                <div className="bg-blue-50/30 border border-blue-100 p-5 rounded-xl">
                                    <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Phạm vi áp dụng *</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { id: 'all', icon: '🌐', label: 'Tất cả sách' },
                                            { id: 'genre', icon: '🏷️', label: 'Theo Thể loại' },
                                            { id: 'book', icon: '📖', label: 'Sách cụ thể (Giá riêng)' }
                                        ].map(type => (
                                            <label key={type.id} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${form.targetType === type.id ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'}`}>
                                                <input type="radio" className="sr-only" checked={form.targetType === type.id} onChange={() => setForm({ ...form, targetType: type.id, targetValue: '' })} />
                                                <span className="text-xl mb-1">{type.icon}</span>
                                                <span className="text-sm">{type.label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* KHU VỰC SÁCH CỤ THỂ */}
                                    {form.targetType === 'book' && (
                                        <div className="mt-4 pt-4 border-t border-blue-100 animate-in slide-in-from-top-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Tìm và thêm sách vào chiến dịch:</label>

                                            <div className="relative mb-4">
                                                <input
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 bg-white shadow-sm"
                                                    placeholder="🔍 Gõ tên sách hoặc tác giả để tìm..."
                                                    value={bookSearch}
                                                    onChange={e => { setBookSearch(e.target.value); setShowBookDropdown(true); }}
                                                    onFocus={() => setShowBookDropdown(true)}
                                                />
                                                {showBookDropdown && bookSearch && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 max-h-60 overflow-y-auto">
                                                        {filteredSearchBooks.length === 0 ? (
                                                            <div className="p-4 text-gray-500 text-sm text-center">Không tìm thấy sách phù hợp</div>
                                                        ) : (
                                                            filteredSearchBooks.map(b => (
                                                                <div key={b._id}
                                                                    className="p-3 hover:bg-blue-50 cursor-pointer flex gap-3 border-b last:border-0 transition-colors"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setSelectedBooks([...selectedBooks, { ...b, promoDiscountType: 'percent', promoDiscountValue: 1 }]);
                                                                        setBookSearch('');
                                                                        setShowBookDropdown(false);
                                                                    }}
                                                                >
                                                                    <img src={`http://localhost:5000${b.image}`} alt="" className="w-10 h-14 object-cover rounded shadow-sm" />
                                                                    <div>
                                                                        <div className="font-bold text-gray-800 text-sm">{b.title}</div>
                                                                        <div className="text-xs text-gray-500 mt-0.5">{b.author} - <span className="text-blue-600 font-semibold">{formatPrice(b.price)}</span></div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {selectedBooks.length > 0 && (
                                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-100 text-gray-600">
                                                            <tr>
                                                                <th className="p-3 font-semibold w-16 text-center">Ảnh</th>
                                                                <th className="p-3 font-semibold w-1/4">Tựa sách</th>
                                                                <th className="p-3 font-semibold w-32">Giá gốc</th>
                                                                <th className="p-3 font-semibold w-48">Mức giảm</th>
                                                                <th className="p-3 font-semibold w-32">Giá sau giảm</th>
                                                                <th className="p-3 font-semibold text-center w-12">Xóa</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedBooks.map(b => (
                                                                <tr key={b._id} className="border-t border-gray-100">
                                                                    <td className="p-3 text-center">
                                                                        <img src={`http://localhost:5000${b.image}`} alt={b.title} className="w-10 h-14 object-cover rounded shadow-sm mx-auto" />
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="font-medium text-gray-800 line-clamp-2">{b.title}</div>
                                                                    </td>
                                                                    <td className="p-3 text-gray-500 line-through">{formatPrice(b.price)}</td>
                                                                    <td className="p-3">
                                                                        <div className="flex bg-gray-50 border border-gray-300 rounded overflow-hidden h-9">
                                                                            <select
                                                                                className="bg-gray-200 px-2 outline-none border-r border-gray-300 text-xs font-bold text-gray-700 cursor-pointer"
                                                                                value={b.promoDiscountType}
                                                                                onChange={(e) => {
                                                                                    const newType = e.target.value;
                                                                                    const newValue = newType === 'percent' ? 1 : 1000;
                                                                                    setSelectedBooks(prev => prev.map(s =>
                                                                                        s._id === b._id ? { ...s, promoDiscountType: newType, promoDiscountValue: newValue } : s
                                                                                    ));
                                                                                }}
                                                                            >
                                                                                <option value="percent">%</option>
                                                                                <option value="fixed">VNĐ</option>
                                                                            </select>

                                                                            {b.promoDiscountType === 'percent' ? (
                                                                                <input
                                                                                    type="number" min="1" max="100"
                                                                                    className="w-full px-2 outline-none text-red-600 font-bold text-sm bg-transparent"
                                                                                    placeholder="1"
                                                                                    value={b.promoDiscountValue}
                                                                                    onChange={(e) => updateSelectedBookConfig(b._id, 'promoDiscountValue', e.target.value)}
                                                                                />
                                                                            ) : (
                                                                                <VndInputSmall
                                                                                    value={b.promoDiscountValue}
                                                                                    onChange={(val) => updateSelectedBookConfig(b._id, 'promoDiscountValue', val)}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 font-black text-green-600">
                                                                        {formatPrice(calculatePreviewPrice(b.price, b.promoDiscountType, b.promoDiscountValue))}
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <button type="button" onClick={() => setSelectedBooks(selectedBooks.filter(s => s._id !== b._id))} className="text-gray-400 hover:text-red-500">
                                                                            <FontAwesomeIcon icon={['fas', 'trash']} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {form.targetType === 'genre' && (
                                        <div className="mt-4 pt-4 border-t border-blue-100 animate-in slide-in-from-top-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Chọn Thể loại được sale:</label>
                                            <select className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-white font-medium text-gray-800"
                                                value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })}>
                                                <option value="">-- Click để chọn --</option>
                                                {genres.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* KHU VỰC MỨC GIẢM CHUNG */}
                                {form.targetType !== 'book' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Hình thức giảm *</label>
                                            <select className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-white font-medium text-gray-800"
                                                value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value, discountValue: e.target.value === 'percent' ? 1 : 1000 })}>
                                                <option value="percent">Giảm theo Phần trăm (%)</option>
                                                <option value="fixed">Giảm thẳng Tiền mặt (VNĐ)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Mức giảm *</label>
                                            {form.discountType === 'percent' ? (
                                                <div className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                                    <input type="number" min="1" max="100" required={form.targetType !== 'book'} className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-center font-bold text-red-600 outline-none focus:border-red-500"
                                                        value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
                                                    <span className="font-bold text-gray-500">%</span>
                                                    <input type="range" min="1" max="90" className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-red-500"
                                                        value={form.discountValue || 1} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
                                                </div>
                                            ) : (
                                                <VndInput
                                                    value={form.discountValue}
                                                    onChange={(val) => setForm({ ...form, discountValue: val })}
                                                    required={form.targetType !== 'book'}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Ngày bắt đầu *</label>
                                        <input type="date" required max={form.endDate} className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 text-gray-800 font-medium"
                                            value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Ngày kết thúc *</label>
                                        <input type="date" required min={form.startDate} className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 text-gray-800 font-medium"
                                            value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div>
                                        <p className="font-bold text-gray-800">Trạng thái Kích hoạt</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Tắt để tạm ngưng chiến dịch và khôi phục giá gốc.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>

                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                                HỦY BỎ
                            </button>
                            <button type="submit" form="promoForm" className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md">
                                {isEditing ? 'LƯU THAY ĐỔI' : 'TẠO CHIẾN DỊCH'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPromotions;