import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const allRanks = ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương'];

    // Format Date để nhét vào thẻ <input type="date"> (Định dạng YYYY-MM-DD)
    const formatForInputDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // ✅ Lấy ngày hôm nay và ngày tuần sau làm mặc định
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const initialFormState = {
        _id: '',
        code: '',
        discountType: 'fixed',
        discountValue: '',
        minOrderValue: '',
        maxDiscountAmount: '',
        startDate: formatForInputDate(today),       // Mặc định là hôm nay
        expirationDate: formatForInputDate(nextWeek), // Mặc định là 1 tuần sau
        usageLimit: 100,
        isActive: true,
        applicableRanks: [...allRanks],
        isUnlimitedUsage: false
    };

    const [form, setForm] = useState(initialFormState);

    // Format tiền cho đẹp (Hiển thị bảng)
    const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

    // Format ngày hiển thị trong Bảng (Chỉ lấy ngày/tháng/năm)
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('vi-VN');
    };

    const fetchVouchers = async () => {
        try {
            const res = await axios.get('/api/admin/vouchers', { headers: { Authorization: `Bearer ${token}` } });
            setVouchers(res.data);
        } catch (err) {
            Swal.fire('Lỗi', 'Không thể lấy danh sách mã giảm giá', 'error');
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const handleOpenAdd = () => {
        setForm(initialFormState);
        setIsEditing(false);
        setShowModal(true);
    };

    const handleOpenEdit = (voucher) => {
        setForm({
            ...voucher,
            startDate: formatForInputDate(voucher.startDate),
            expirationDate: formatForInputDate(voucher.expirationDate),
            discountValue: voucher.discountValue ?? '',
            minOrderValue: voucher.minOrderValue ?? '',
            maxDiscountAmount: voucher.maxDiscountAmount ?? '',
            isUnlimitedUsage: voucher.usageLimit >= 999999
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleCurrencyChange = (field, value) => {
        if (value === '') {
            setForm({ ...form, [field]: '' });
            return;
        }
        const rawValue = value.replace(/\D/g, '');
        setForm({ ...form, [field]: rawValue !== '' ? parseInt(rawValue, 10) : '' });
    };

    const handleRankToggle = (rank) => {
        setForm((prev) => {
            const isChecked = prev.applicableRanks.includes(rank);
            const newRanks = isChecked ? prev.applicableRanks.filter(r => r !== rank) : [...prev.applicableRanks, rank];
            return { ...prev, applicableRanks: newRanks };
        });
    };

    const handleToggleAllRanks = () => {
        if (form.applicableRanks.length === allRanks.length) {
            setForm({ ...form, applicableRanks: [] });
        } else {
            setForm({ ...form, applicableRanks: [...allRanks] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (new Date(form.startDate) >= new Date(form.expirationDate)) {
            return Swal.fire('Lỗi thời gian', 'Ngày bắt đầu phải trước ngày kết thúc!', 'warning');
        }

        if (form.applicableRanks.length === 0) {
            return Swal.fire('Lỗi', 'Vui lòng chọn ít nhất 1 hạng người dùng được áp dụng mã này.', 'warning');
        }

        try {
            const payload = {
                ...form,
                startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
                expirationDate: new Date(`${form.expirationDate}T23:59:59`).toISOString(),
                discountValue: Number(form.discountValue) || 0,
                minOrderValue: Number(form.minOrderValue) || 0,
                maxDiscountAmount: form.maxDiscountAmount !== '' && form.maxDiscountAmount !== null ? Number(form.maxDiscountAmount) : null,
                usageLimit: form.isUnlimitedUsage ? 999999 : (Number(form.usageLimit) || 1)
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
        } catch (err) {
            Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa',
            text: "Dữ liệu không thể khôi phục sau khi xóa!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy',
            customClass: {
                confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 mr-2 rounded',
                cancelButton: 'bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded'
            },
            buttonsStyling: false
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/admin/vouchers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Đã xóa!', 'Mã giảm giá đã bị xóa.', 'success');
                fetchVouchers();
            } catch (err) {
                Swal.fire('Lỗi', 'Không thể xóa mã giảm giá', 'error');
            }
        }
    };

    return (
        <div className="flex flex-col p-6 w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Quản lý Mã Giảm Giá</h1>
                    <p className="text-gray-500">Tạo, chỉnh sửa và phân quyền mã voucher cho các cấp bậc người dùng.</p>
                </div>
            </div>

            <div className="flex justify-end mb-4 items-center">
                <button
                    onClick={handleOpenAdd}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow font-bold flex items-center gap-2 transition-colors"
                >
                    <FontAwesomeIcon icon={['fas', 'plus']} /> Thêm Mã Mới
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded shadow-md">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            <th className="p-3 border-b">Mã Voucher</th>
                            <th className="p-3 border-b">Khuyến mãi</th>
                            <th className="p-3 border-b">Đơn tối thiểu</th>
                            <th className="p-3 border-b">Thời hạn (Ngày)</th>
                            <th className="p-3 border-b">Lượt dùng</th>
                            <th className="p-3 border-b">Trạng thái</th>
                            <th className="p-3 border-b text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchers.length === 0 ? (
                            <tr><td colSpan="7" className="p-4 text-center text-gray-500">Chưa có mã giảm giá nào</td></tr>
                        ) : (
                            vouchers.map(v => (
                                <tr key={v._id} className="hover:bg-gray-50">
                                    <td className="p-3 border-b align-middle font-black text-blue-600 tracking-wide">{v.code}</td>
                                    <td className="p-3 border-b align-middle font-semibold text-red-600">
                                        {v.discountType === 'fixed' ? `Giảm ${formatPrice(v.discountValue)}` : `Giảm ${v.discountValue}%`}
                                    </td>
                                    <td className="p-3 border-b align-middle">{formatPrice(v.minOrderValue)}</td>
                                    <td className="p-3 border-b align-middle text-sm text-gray-700">
                                        <div><strong>Từ:</strong> {formatDate(v.startDate)}</div>
                                        <div><strong>Đến:</strong> {formatDate(v.expirationDate)}</div>
                                    </td>
                                    <td className="p-3 border-b align-middle text-sm font-semibold">
                                        {v.usageLimit >= 999999 ? (
                                            <span className="text-blue-600">Không giới hạn</span>
                                        ) : (
                                            `${v.usedCount} / ${v.usageLimit}`
                                        )}
                                    </td>
                                    <td className="p-3 border-b align-middle">
                                        {v.isActive ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Hoạt động</span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Đã khóa</span>
                                        )}
                                    </td>
                                    <td className="p-3 border-b align-middle text-center space-x-2">
                                        <button onClick={() => handleOpenEdit(v)} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded inline-flex items-center justify-center">
                                            <FontAwesomeIcon icon={['fas', 'edit']} />
                                        </button>
                                        <button onClick={() => handleDelete(v._id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded inline-flex items-center justify-center">
                                            <FontAwesomeIcon icon={['fas', 'trash']} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL THÊM / SỬA */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h2 className="text-xl font-bold">{isEditing ? 'Sửa Mã Giảm Giá' : 'Thêm Mã Mới'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="voucherForm" onSubmit={handleSubmit} className="space-y-5">

                                <div className="bg-blue-50 border border-blue-200 p-3 rounded flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-blue-800 text-sm">Trạng thái mã giảm giá</p>
                                        <p className="text-xs text-blue-600 mt-0.5">Tắt công tắc này nếu bạn muốn tạm khóa mã khẩn cấp mà không cần xóa.</p>
                                    </div>
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                            <div className={`block w-14 h-8 rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${form.isActive ? 'transform translate-x-6' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Mã giảm giá (Code)</label>
                                        <input type="text" required className="w-full border rounded px-3 py-2 uppercase outline-none focus:border-blue-500 font-bold text-blue-600 tracking-wider" placeholder="VD: TET2026"
                                            value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Loại giảm giá</label>
                                        <select className="w-full border rounded px-3 py-2 bg-white outline-none focus:border-blue-500"
                                            value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                                            <option value="fixed">Tiền mặt (VNĐ)</option>
                                            <option value="percent">Phần trăm (%)</option>
                                        </select>
                                    </div>

                                    {form.discountType === 'percent' ? (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Giá trị giảm (%)</label>
                                            <div className="relative">
                                                <input type="number" required min="0" max="100" className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500" placeholder="VD: 10"
                                                    value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
                                                <span className="absolute right-3 top-2 text-gray-500 font-bold">%</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Giá trị giảm (VNĐ)</label>
                                            <div className="relative">
                                                <input type="text" required className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500 pr-8 font-semibold text-red-600" placeholder="0"
                                                    value={form.discountValue !== '' ? Number(form.discountValue).toLocaleString('vi-VN') : ''} onChange={e => handleCurrencyChange('discountValue', e.target.value)} />
                                                <span className="absolute right-3 top-2 text-gray-500 font-bold">₫</span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Đơn tối thiểu (VNĐ)</label>
                                        <div className="relative">
                                            <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500 pr-8 font-semibold" placeholder="0"
                                                value={form.minOrderValue !== '' ? Number(form.minOrderValue).toLocaleString('vi-VN') : ''} onChange={e => handleCurrencyChange('minOrderValue', e.target.value)} />
                                            <span className="absolute right-3 top-2 text-gray-500 font-bold">₫</span>
                                        </div>
                                    </div>

                                    {form.discountType === 'percent' && (
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Mức giảm tối đa (VNĐ) - Bỏ trống nếu không giới hạn</label>
                                            <div className="relative">
                                                <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500 pr-8 font-semibold" placeholder="Không giới hạn"
                                                    value={form.maxDiscountAmount !== '' && form.maxDiscountAmount !== null ? Number(form.maxDiscountAmount).toLocaleString('vi-VN') : ''} onChange={e => handleCurrencyChange('maxDiscountAmount', e.target.value)} />
                                                <span className="absolute right-3 top-2 text-gray-500 font-bold">₫</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* ✅ PHẦN NGÀY THÁNG ĐÃ ĐƯỢC CHẶN BẰNG MIN VÀ MAX */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Ngày bắt đầu</label>
                                        <input
                                            type="date"
                                            required
                                            max={form.expirationDate} // Khóa các ngày sau ngày kết thúc
                                            className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500 cursor-pointer disabled:bg-gray-100"
                                            value={form.startDate}
                                            onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Ngày kết thúc</label>
                                        <input
                                            type="date"
                                            required
                                            min={form.startDate} // Khóa các ngày trước ngày bắt đầu
                                            className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500 cursor-pointer disabled:bg-gray-100"
                                            value={form.expirationDate}
                                            onChange={e => setForm({ ...form, expirationDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Tổng lượt dùng (Giới hạn phát hành)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                min="1"
                                                max="999999"
                                                disabled={form.isUnlimitedUsage}
                                                className={`flex-1 border rounded px-3 py-2 outline-none focus:border-blue-500 ${form.isUnlimitedUsage ? 'bg-gray-100 text-gray-400 font-bold cursor-not-allowed' : ''}`}
                                                value={form.isUnlimitedUsage ? 999999 : form.usageLimit}
                                                onChange={e => {
                                                    let val = parseInt(e.target.value, 10);
                                                    if (val > 999999) val = 999999;
                                                    setForm({ ...form, usageLimit: val || '' });
                                                }}
                                            />
                                            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border px-3 py-2 rounded hover:bg-gray-100 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 cursor-pointer"
                                                    checked={form.isUnlimitedUsage}
                                                    onChange={e => setForm({ ...form, isUnlimitedUsage: e.target.checked })}
                                                />
                                                <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Không giới hạn</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-gray-700">Đối tượng áp dụng (Rank)</label>
                                        <button type="button" onClick={handleToggleAllRanks} className="text-sm text-blue-600 hover:underline font-bold">
                                            {form.applicableRanks.length === allRanks.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded border">
                                        {allRanks.map(rank => (
                                            <label key={rank} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 cursor-pointer"
                                                    checked={form.applicableRanks.includes(rank)}
                                                    onChange={() => handleRankToggle(rank)}
                                                />
                                                <span className={`font-semibold ${rank === 'Kim cương' ? 'text-blue-700' : rank === 'Bạch kim' ? 'text-purple-600' : rank === 'Vàng' ? 'text-yellow-600' : 'text-gray-700'}`}>
                                                    {rank}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 italic">* Mẹo: Mã có giá trị cao chỉ nên tích chọn hạng Vàng, Bạch Kim, Kim Cương để kích thích khách cày rank.</p>
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2 border rounded font-bold hover:bg-gray-100 text-gray-700 transition-colors">
                                Hủy
                            </button>
                            <button type="submit" form="voucherForm" className="px-5 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors">
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