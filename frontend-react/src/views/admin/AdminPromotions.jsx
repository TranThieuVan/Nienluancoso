import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// --- CONSTANTS & HELPERS ---
const API_URL = 'http://localhost:5000/api';
const INPUT_CLS = 'border border-gray-200 rounded-lg bg-white text-sm text-gray-800 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all';
const LABEL_CLS = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5';
const formatPrice = p => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
const formatDate = d => new Date(d).toLocaleDateString('vi-VN');
const fDateInput = d => { const dt = new Date(d); return dt && !isNaN(dt) ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : ''; };
const getStatus = p => !p.isActive ? 'paused' : (new Date() < new Date(p.startDate) ? 'upcoming' : (new Date() > new Date(p.endDate) ? 'ended' : 'active'));
const calcPrice = (p, t, v) => Math.max(0, Math.round(p - (t === 'percent' ? (p * (Number(v) || 0)) / 100 : (Number(v) || 0))));

const STATUS = {
    active: { label: 'Đang chạy', dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 ring-green-200' },
    upcoming: { label: 'Sắp diễn ra', dot: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    ended: { label: 'Đã kết thúc', dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-500 ring-gray-200' },
    paused: { label: 'Tạm ngưng', dot: 'bg-red-400', pill: 'bg-red-50 text-red-600 ring-red-200' },
};

// --- VndInput ---
const VndInput = ({ value, onChange, required, placeholder = '50', size = 'lg', max }) => {
    const inputRef = useRef(null);
    const rulerRef = useRef(null);
    const isSm = size === 'sm';
    const numCls = isSm ? 'text-[13px]' : 'text-sm';
    const thousands = value ? value / 1000 : '';
    const maxThousands = max != null ? max / 1000 : undefined;

    useEffect(() => {
        if (!inputRef.current || !rulerRef.current) return;
        rulerRef.current.textContent = inputRef.current.value || placeholder || '00';
        inputRef.current.style.width = rulerRef.current.offsetWidth + 2 + 'px';
    }, [thousands, placeholder]);

    const step = 5;

    return (
        <div
            className={`flex items-stretch bg-white border border-gray-200 overflow-hidden
  transition-all duration-150 hover:border-gray-300
  focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100
  ${isSm ? 'rounded-md h-9' : 'rounded-lg h-[42px]'}`}
        >
            <span
                ref={rulerRef}
                aria-hidden="true"
                className={`absolute invisible whitespace-pre font-medium pointer-events-none ${numCls}`}
            />

            {/* input area */}
            <div
                className={`flex items-center flex-1 min-w-0 cursor-text ${isSm ? 'pl-2.5' : 'pl-3.5'
                    }`}
                onClick={() => inputRef.current?.focus()}
            >
                <input
                    ref={inputRef}
                    type="number"
                    min="1"
                    max={maxThousands}
                    required={required}
                    placeholder={placeholder}
                    value={thousands}
                    onChange={(e) => {
                        const val = e.target.value;

                        if (val === '') {
                            onChange('');
                            return;
                        }

                        const num = parseInt(val, 10);
                        if (isNaN(num)) return;

                        const result = num * 1000;
                        onChange(max != null ? Math.min(result, max) : result);
                    }}
                    className={`outline-none bg-transparent font-medium text-gray-800
      min-w-[2ch] max-w-[9ch]
      [appearance:textfield]
      [&::-webkit-inner-spin-button]:appearance-none
      [&::-webkit-outer-spin-button]:appearance-none
      ${isSm ? 'text-[13px]' : 'text-sm'} leading-none`}
                    style={{ width: '3ch' }}
                />

                <span
                    className={`font-medium text-gray-800 select-none whitespace-nowrap ${numCls}`}
                >
                    .000
                </span>

                <span
                    className={`font-semibold text-gray-400 select-none flex-shrink-0 ${isSm ? 'text-[11px] ml-1' : 'text-xs ml-1.5'
                        }`}
                >
                    ₫
                </span>
            </div>

            {/* divider */}
            <div className="w-px bg-gray-100 my-2 flex-shrink-0" />

            {/* spinner */}
            <div className={`flex flex-col flex-shrink-0 ${isSm ? 'w-6' : 'w-8'}`}>
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        const next = Math.max(1, (Number(thousands) || 0) + step);
                        onChange((max != null ? Math.min(next, max / 1000) : next) * 1000);
                    }}
                    className="flex-1 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                >
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                        <path d="M3.5 0.5L6.5 4.5H0.5L3.5 0.5Z" fill="currentColor" />
                    </svg>
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        onChange(Math.max(1, (Number(thousands) || 0) - step) * 1000)
                    }
                    className="flex-1 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors border-t border-gray-100"
                >
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                        <path d="M3.5 4.5L0.5 0.5H6.5L3.5 4.5Z" fill="currentColor" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// --- PercentInput ---
const PercentInput = ({ value, onChange, required }) => (
    <div className={`${INPUT_CLS} flex items-center gap-3 px-3 py-2`}>
        <input type="number" min="1" max="100" required={required}
            className="w-14 text-center font-semibold text-gray-800 text-sm bg-transparent outline-none border-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            value={value} onChange={e => onChange(e.target.value)} />
        <span className="text-gray-400 font-semibold text-sm">%</span>
        <input type="range" min="1" max="90" className="flex-1 h-1.5 accent-blue-500 cursor-pointer"
            value={value || 1} onChange={e => onChange(e.target.value)} />
        <span className="text-xs font-semibold text-blue-600 w-8 text-right">{value}%</span>
    </div>
);

// --- MAIN COMPONENT ---
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
    const initForm = {
        _id: '', name: '', discountType: 'percent', discountValue: 1,
        targetType: 'all', targetValue: '',
        startDate: fDateInput(new Date()),
        endDate: fDateInput(new Date(Date.now() + 7 * 86400000)),
        description: '', isActive: true,
    };
    const [form, setForm] = useState(initForm);

    const fetchData = async () => {
        try {
            const [pRes, bRes] = await Promise.all([
                axios.get(`${API_URL}/admin/promotions`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/books`),
            ]);
            setPromotions(pRes.data);
            setBooks(bRes.data);
            setGenres([...new Set(bRes.data.map(b => b.genre).filter(Boolean))]);
        } catch (err) { console.error(err); Swal.fire('Lỗi', 'Không thể kết nối Backend', 'error'); }
    };
    useEffect(() => { fetchData(); }, []);

    // giá nhỏ nhất trong phạm vi hiện tại — dùng để validate & clamp fixed discount
    const getMinBookPrice = () => {
        let pool = books;
        if (form.targetType === 'genre' && form.targetValue)
            pool = books.filter(b => b.genre === form.targetValue);
        if (!pool.length) return null;
        return Math.min(...pool.map(b => b.price).filter(Boolean));
    };

    // max cho VndInput khi fixed: luôn < giá sách nhỏ nhất
    const fixedDiscountMax = (() => {
        if (form.discountType !== 'fixed' || form.targetType === 'book') return undefined;
        const min = getMinBookPrice();
        return min != null ? min - 1000 : undefined;
    })();

    const filteredPromotions = promotions.filter(c =>
        c.name.toLowerCase().includes(searchPromo.toLowerCase()) &&
        (filterStatus === 'all' || getStatus(c) === filterStatus)
    );
    const stats = {
        active: promotions.filter(c => getStatus(c) === 'active').length,
        upcoming: promotions.filter(c => getStatus(c) === 'upcoming').length,
        total: promotions.length,
    };
    const filteredBooks = books.filter(b =>
        (b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
            b.author?.toLowerCase().includes(bookSearch.toLowerCase())) &&
        !selectedBooks.find(s => s._id === b._id)
    );

    const openModal = (p = null) => {
        setForm(p ? { ...p, startDate: fDateInput(p.startDate), endDate: fDateInput(p.endDate), discountValue: p.discountValue ?? 1 } : initForm);
        if (p?.targetType === 'book' && p.targetValue) {
            try {
                const configs = typeof p.targetValue === 'string' ? JSON.parse(p.targetValue) : p.targetValue;
                setSelectedBooks(configs.map(c => { const b = books.find(bk => bk._id === c.bookId); return b ? { ...b, promoDiscountType: c.discountType, promoDiscountValue: c.discountValue } : null; }).filter(Boolean));
            } catch { setSelectedBooks([]); }
        } else { setSelectedBooks([]); }
        setIsEditing(!!p);
        setShowModal(true);
    };

    const updateBookCfg = (id, f, v) => setSelectedBooks(prev => prev.map(b => b._id === id ? { ...b, [f]: v } : b));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (new Date(form.startDate) >= new Date(form.endDate))
            return Swal.fire('Lỗi', 'Ngày bắt đầu phải trước ngày kết thúc!', 'warning');
        if (form.targetType === 'book' && (!selectedBooks.length || selectedBooks.some(b => !b.promoDiscountValue || Number(b.promoDiscountValue) <= 0)))
            return Swal.fire('Lỗi', 'Vui lòng chọn sách và nhập mức giảm hợp lệ.', 'warning');
        if (form.targetType === 'genre' && !form.targetValue)
            return Swal.fire('Lỗi', 'Vui lòng chọn thể loại.', 'warning');

        // validate: fixed discount phải < giá sách nhỏ nhất trong phạm vi
        if (form.targetType !== 'book' && form.discountType === 'fixed') {
            const minPrice = getMinBookPrice();
            if (minPrice != null && Number(form.discountValue) >= minPrice) {
                const scope = form.targetType === 'genre' ? `thể loại "${form.targetValue}"` : 'toàn bộ sách';
                return Swal.fire('Mức giảm không hợp lệ', `Mức giảm phải nhỏ hơn giá cuốn sách rẻ nhất trong ${scope} (${formatPrice(minPrice)}).`, 'warning');
            }
        }

        try {
            Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const payload = {
                ...form,
                startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
                endDate: new Date(`${form.endDate}T23:59:59`).toISOString(),
                discountType: form.targetType === 'book' ? 'percent' : form.discountType,
                discountValue: form.targetType === 'book' ? 0 : Number(form.discountValue) || 0,
                targetValue: form.targetType === 'book'
                    ? JSON.stringify(selectedBooks.map(b => ({ bookId: b._id, discountType: b.promoDiscountType || 'percent', discountValue: Number(b.promoDiscountValue) || 0 })))
                    : (typeof form.targetValue === 'string' ? form.targetValue : JSON.stringify(form.targetValue)),
            };
            delete payload._id; delete payload.__v;
            await axios[isEditing ? 'put' : 'post'](`${API_URL}/admin/promotions${isEditing ? `/${form._id}` : ''}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Thành công!', isEditing ? 'Đã cập nhật chiến dịch.' : 'Tạo chiến dịch thành công.', 'success');
            setShowModal(false); fetchData();
        } catch (err) { Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi xử lý', 'error'); }
    };

    const handleDelete = async id => {
        if (!(await Swal.fire({ title: 'Xác nhận xóa', text: 'Sách sẽ trở về giá gốc!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Xóa' })).isConfirmed) return;
        Swal.fire({ title: 'Đang xử lý...', didOpen: () => Swal.showLoading() });
        try { await axios.delete(`${API_URL}/admin/promotions/${id}`, { headers: { Authorization: `Bearer ${token}` } }); Swal.fire('Đã xóa!', '', 'success'); fetchData(); }
        catch { Swal.fire('Lỗi', 'Không thể xóa', 'error'); }
    };

    return (
        <div className="flex flex-col p-6 w-full bg-gray-50 min-h-screen">

            <div className="mb-7">
                <h1 className="text-2xl font-bold text-gray-900">Chiến Dịch <span className="text-blue-600">Giảm Giá</span></h1>
                <p className="text-sm text-gray-400 mt-1">Quản lý và thiết lập Flash Sale tự động.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { l: 'Đang diễn ra', v: stats.active, i: '⚡', c: 'text-green-600', b: 'bg-green-50', br: 'border-green-100' },
                    { l: 'Sắp diễn ra', v: stats.upcoming, i: '⏳', c: 'text-amber-600', b: 'bg-amber-50', br: 'border-amber-100' },
                    { l: 'Tổng', v: stats.total, i: '📋', c: 'text-blue-600', b: 'bg-blue-50', br: 'border-blue-100' },
                ].map((s, i) => (
                    <div key={i} className={`bg-white border ${s.br} rounded-xl p-5 flex items-center gap-4`}>
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${s.b}`}>{s.i}</div>
                        <div><div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-xs font-medium text-gray-400 mt-0.5">{s.l}</div></div>
                    </div>
                ))}
            </div>

            <div className="flex gap-1 border-b border-gray-200 mb-6">
                {[{ k: 'campaigns', l: 'Danh sách chiến dịch' }, { k: 'books', l: 'Sách đang sale' }].map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)}
                        className={`pb-3 px-1 mr-5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === t.k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        {t.l}
                    </button>
                ))}
            </div>

            {tab === 'campaigns' && (
                <div>
                    <div className="flex flex-wrap justify-between gap-3 mb-4 items-center">
                        <div className="flex gap-2 flex-1 min-w-0">
                            <input className={`${INPUT_CLS} px-3 py-2 flex-1 max-w-xs`} placeholder="Tìm tên chiến dịch..." value={searchPromo} onChange={e => setSearchPromo(e.target.value)} />
                            <select className={`${INPUT_CLS} px-3 py-2`} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="all">Tất cả</option><option value="active">Đang chạy</option>
                                <option value="upcoming">Sắp diễn ra</option><option value="ended">Đã kết thúc</option><option value="paused">Tạm ngưng</option>
                            </select>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2" onClick={() => openModal()}>
                            <FontAwesomeIcon icon={['fas', 'plus']} />Tạo chiến dịch
                        </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-100"><tr>
                                {['Tên', 'Phạm vi', 'Khuyến mãi', 'Thời gian', 'Trạng thái', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {filteredPromotions.length === 0
                                    ? <tr><td colSpan="6" className="px-4 py-12 text-center text-sm text-gray-400">Không tìm thấy chiến dịch</td></tr>
                                    : filteredPromotions.map(c => {
                                        const s = STATUS[getStatus(c)]; return (
                                            <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/70">
                                                <td className="px-4 py-3"><div className="font-semibold text-gray-800">{c.name}</div><div className="text-xs text-gray-400 mt-0.5">{c.description}</div></td>
                                                <td className="px-4 py-3"><span className="text-[11px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{c.targetType === 'all' ? 'Tất cả' : c.targetType === 'genre' ? c.targetValue : 'Sách cụ thể'}</span></td>
                                                <td className="px-4 py-3 font-semibold text-gray-700">{c.targetType === 'book' ? <span className="text-xs text-gray-400 italic">Giá riêng từng cuốn</span> : c.discountType === 'percent' ? <span className="text-blue-600">-{c.discountValue}%</span> : <span className="text-blue-600">-{formatPrice(c.discountValue)}</span>}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500"><div>{formatDate(c.startDate)}</div><div className="text-gray-300">→ {formatDate(c.endDate)}</div></td>
                                                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${s.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span></td>
                                                <td className="px-4 py-3"><div className="flex gap-1.5 justify-end">
                                                    <button onClick={() => openModal(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><FontAwesomeIcon icon={['fas', 'pen']} /></button>
                                                    <button onClick={() => handleDelete(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"><FontAwesomeIcon icon={['fas', 'trash']} /></button>
                                                </div></td>
                                            </tr>
                                        );
                                    })
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'books' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {books.filter(b => b.discountedPrice && b.discountedPrice < b.price).length
                        ? books.filter(b => b.discountedPrice && b.discountedPrice < b.price).map(b => (
                            <div key={b._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow relative">
                                <span className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md z-10">-{Math.round((1 - b.discountedPrice / b.price) * 100)}%</span>
                                <div className="h-44 bg-gray-50 overflow-hidden"><img src={b.image?.startsWith('http') ? b.image : `http://localhost:5000${b.image}`} alt={b.title} className="w-full h-full object-cover" /></div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-gray-800 text-xs line-clamp-2 h-8">{b.title}</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{b.author}</p>
                                    <div className="mt-2"><span className="text-[11px] text-gray-300 line-through block">{formatPrice(b.price)}</span><span className="text-sm font-bold text-red-500">{formatPrice(b.discountedPrice)}</span></div>
                                </div>
                            </div>
                        ))
                        : <div className="col-span-full py-16 text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-200">Không có sách giảm giá.</div>
                    }
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex justify-center items-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden">

                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-base font-bold text-gray-800">{isEditing ? 'Cập nhật chiến dịch' : 'Tạo chiến dịch mới'}</h2>
                            <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"><FontAwesomeIcon icon={['fas', 'xmark']} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1" style={{ scrollbarGutter: 'stable' }}>
                            <form id="promoForm" onSubmit={handleSubmit} className="space-y-5">

                                <div>
                                    <label className={LABEL_CLS}>Tên chương trình *</label>
                                    <input type="text" required className={`${INPUT_CLS} w-full px-3 py-2.5`}
                                        placeholder="VD: Săn sale giữa tháng, Mừng tựu trường..."
                                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>

                                <div>
                                    <label className={LABEL_CLS}>Phạm vi áp dụng *</label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {[
                                            { id: 'all', icon: '🌐', l: 'Tất cả' },
                                            { id: 'genre', icon: '🏷️', l: 'Thể loại' },
                                            { id: 'book', icon: '📖', l: 'Sách cụ thể' },
                                        ].map(t => (
                                            <label key={t.id} className={`flex flex-col items-center py-3 px-2 rounded-lg border cursor-pointer transition-all ${form.targetType === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}>
                                                <input type="radio" className="sr-only" checked={form.targetType === t.id} onChange={() => setForm({ ...form, targetType: t.id, targetValue: '' })} />
                                                <span className="text-lg mb-1">{t.icon}</span>
                                                <span className="text-xs font-semibold">{t.l}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* min-h giữ layout ổn định khi chuyển giữa "Tất cả" và "Thể loại" */}
                                    <div className="min-h-[76px]">
                                        {form.targetType === 'genre' && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <label className={LABEL_CLS}>Chọn thể loại</label>
                                                <select className={`${INPUT_CLS} w-full px-3 py-2.5`} value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })}>
                                                    <option value="">-- Chọn --</option>
                                                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {form.targetType === 'book' && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <label className={LABEL_CLS}>Tìm sách</label>
                                                <div className="relative mb-3">
                                                    <input className={`${INPUT_CLS} w-full pl-9 pr-3 py-2.5`} placeholder="Tìm tên/tác giả..."
                                                        value={bookSearch} onChange={e => { setBookSearch(e.target.value); setShowBookDropdown(true); }} onFocus={() => setShowBookDropdown(true)} />
                                                    <span className="absolute left-3 top-2.5 text-gray-300 pointer-events-none">🔍</span>
                                                    {showBookDropdown && bookSearch && (
                                                        <div className="absolute top-full w-full mt-1 bg-white border border-gray-200 shadow-lg rounded-lg z-50 max-h-52 overflow-y-auto">
                                                            {filteredBooks.length
                                                                ? filteredBooks.map(b => (
                                                                    <div key={b._id} onMouseDown={e => { e.preventDefault(); setSelectedBooks([...selectedBooks, { ...b, promoDiscountType: 'percent', promoDiscountValue: 1 }]); setBookSearch(''); setShowBookDropdown(false); }}
                                                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex gap-3 border-b border-gray-50 last:border-0">
                                                                        <img src={`http://localhost:5000${b.image}`} alt="" className="w-8 h-11 object-cover rounded" />
                                                                        <div>
                                                                            <div className="text-xs font-semibold text-gray-800">{b.title}</div>
                                                                            <div className="text-[11px] text-gray-400 mt-0.5">{b.author} · <span className="text-blue-500 font-semibold">{formatPrice(b.price)}</span></div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                                : <div className="p-3 text-center text-xs text-gray-400">Không tìm thấy</div>
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedBooks.length > 0 && (
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-gray-50 border-b border-gray-100"><tr>
                                                                {['Ảnh', 'Tựa', 'Giá gốc', 'Giảm', 'Sau giảm', ''].map((h, i) => (
                                                                    <th key={i} className="px-3 py-2 font-semibold text-gray-500">{h}</th>
                                                                ))}
                                                            </tr></thead>
                                                            <tbody>
                                                                {selectedBooks.map(b => (
                                                                    <tr key={b._id} className="border-b border-gray-50 last:border-0 align-top">
                                                                        <td className="px-3 py-2"><img src={`http://localhost:5000${b.image}`} className="w-8 h-11 object-cover rounded" alt="" /></td>
                                                                        <td className="px-3 py-2 font-medium text-gray-700 w-48">{b.title}</td>
                                                                        <td className="px-3 py-2 line-through text-gray-400">{formatPrice(b.price)}</td>
                                                                        <td className="px-3 py-2 w-56">
                                                                            <div className="flex flex-col gap-1.5">
                                                                                <select
                                                                                    className={`${INPUT_CLS} w-full px-2 py-1.5 text-xs`}
                                                                                    value={b.promoDiscountType}
                                                                                    onChange={e => {
                                                                                        const newType = e.target.value;
                                                                                        setSelectedBooks(prev => prev.map(s =>
                                                                                            s._id === b._id
                                                                                                ? { ...s, promoDiscountType: newType, promoDiscountValue: newType === 'percent' ? 1 : 1000 }
                                                                                                : s
                                                                                        ));
                                                                                    }}
                                                                                >
                                                                                    <option value="percent">Phần trăm (%)</option>
                                                                                    <option value="fixed">Tiền mặt (VNĐ)</option>
                                                                                </select>
                                                                                {b.promoDiscountType === 'percent'
                                                                                    ? <PercentInput
                                                                                        value={b.promoDiscountValue}
                                                                                        onChange={v => updateBookCfg(b._id, 'promoDiscountValue', v)}
                                                                                    />
                                                                                    : <VndInput
                                                                                        size="sm"
                                                                                        value={b.promoDiscountValue}
                                                                                        onChange={v => updateBookCfg(b._id, 'promoDiscountValue', v)}
                                                                                        max={b.price - 1000}
                                                                                    />
                                                                                }
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-2 font-semibold text-green-600">{formatPrice(calcPrice(b.price, b.promoDiscountType, b.promoDiscountValue))}</td>
                                                                        <td className="px-3 py-2"><button type="button" onClick={() => setSelectedBooks(selectedBooks.filter(s => s._id !== b._id))} className="text-gray-300 hover:text-red-400 transition-colors"><FontAwesomeIcon icon={['fas', 'trash']} /></button></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {form.targetType !== 'book' && (
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className={LABEL_CLS}>Hình thức *</label>
                                            <select className={`${INPUT_CLS} w-full px-3 py-2.5`} value={form.discountType}
                                                onChange={e => setForm({ ...form, discountType: e.target.value, discountValue: e.target.value === 'percent' ? 1 : 1000 })}>
                                                <option value="percent">Giảm theo phần trăm (%)</option>
                                                <option value="fixed">Giảm thẳng tiền mặt (VNĐ)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={LABEL_CLS}>
                                                Mức giảm *
                                                {form.discountType === 'fixed' && getMinBookPrice() != null && (
                                                    <span className="ml-1.5 normal-case font-normal text-gray-400">
                                                        (tối đa {formatPrice(getMinBookPrice() - 1000)})
                                                    </span>
                                                )}
                                            </label>
                                            {form.discountType === 'percent'
                                                ? <PercentInput value={form.discountValue} onChange={v => setForm({ ...form, discountValue: v })} required />
                                                : <VndInput value={form.discountValue} onChange={v => setForm({ ...form, discountValue: v })} required max={fixedDiscountMax} />
                                            }
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL_CLS}>Bắt đầu *</label>
                                        <input type="date" required max={form.endDate} className={`${INPUT_CLS} w-full px-3 py-2.5`} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLS}>Kết thúc *</label>
                                        <input type="date" required min={form.startDate} className={`${INPUT_CLS} w-full px-3 py-2.5`} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center border border-gray-200 rounded-lg px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">Kích hoạt</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Tắt để tạm ngưng và khôi phục giá gốc.</p>
                                    </div>
                                    <label className="relative cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                                    </label>
                                </div>

                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2.5 flex-shrink-0">
                            <button onClick={() => setShowModal(false)} className="border border-gray-200 text-gray-600 rounded-lg px-5 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors">Hủy</button>
                            <button type="submit" form="promoForm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors">{isEditing ? 'Lưu thay đổi' : 'Tạo chiến dịch'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPromotions;