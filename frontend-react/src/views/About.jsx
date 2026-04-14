import { useState, useEffect, useRef } from "react";
import axios from "axios";
const SECTIONS = [
    {
        id: 1,
        imageLeft: false,
        tag: "Câu chuyện của chúng tôi",
        heading: "Nơi mỗi trang sách\nlà một hành trình.",
        body: "Được thành lập vào năm 2024, Booknest ra đời từ niềm tin rằng sách không chỉ là vật phẩm — mà là cánh cửa mở ra những thế giới chưa từng được khám phá. Chúng tôi là những người yêu sách, bởi những người yêu sách, dành cho những người yêu sách.",
        image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
        alt: "Thư viện sách cổ điển",
    },
    {
        id: 2,
        imageLeft: true,
        tag: "Triết lý biên tập",
        heading: "Chúng tôi chọn lọc\nbằng trái tim.",
        body: "Mỗi cuốn sách trên Booknest đều trải qua quá trình tuyển chọn kỹ lưỡng từ đội ngũ biên tập viên giàu kinh nghiệm. Chúng tôi không theo đuổi số lượng — chúng tôi theo đuổi chất lượng và sự phù hợp với từng độc giả.",
        image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
        alt: "Biên tập sách",
    },
    {
        id: 3,
        imageLeft: false,
        tag: "Cộng đồng",
        heading: "Đọc cùng nhau\nhơn đọc một mình.",
        body: "Booknest không chỉ là một cửa hàng. Chúng tôi xây dựng một cộng đồng nơi các độc giả chia sẻ, đánh giá và khám phá sách cùng nhau. Mỗi review, mỗi cuộc trò chuyện đều là một phần của hành trình.",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
        alt: "Cộng đồng đọc sách",
    },
];

// Hook xử lý hiệu ứng cuộn xuất hiện
function useInView(threshold = 0.1) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setInView(true); },
            { threshold }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return [ref, inView];
}

function Section({ data, index }) {
    const [ref, inView] = useInView();
    const { imageLeft, tag, heading, body, sub, image, alt, id } = data;

    return (
        <section
            ref={ref}
            className={`flex flex-col md:flex-row min-h-[600px] border-b border-gray-100 last:border-0 transition-all duration-1000 ease-out ${imageLeft ? "md:flex-row-reverse" : ""
                } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
            style={{ transitionDelay: `${index * 150}ms` }}
        >
            {/* Image - 45% */}
            <div className="w-full md:w-[45%] relative overflow-hidden bg-gray-50">
                <img
                    src={image}
                    alt={alt}
                    className={`w-full h-full object-cover transition-transform duration-[1.5s] ease-out ${inView ? "scale-100" : "scale-110"
                        }`}
                />
                <div className="absolute inset-0 bg-black/5" />
                <span className="absolute bottom-8 left-8 text-[10px] tracking-[0.3em] font-bold text-white/90 uppercase">
                    0{id} /
                </span>
            </div>

            {/* Text - 55% */}
            <div className="w-full md:w-[55%] flex flex-col justify-center p-12 md:p-20 lg:p-28">
                {/* Tag */}
                <p className={`text-[11px] tracking-[0.4em] uppercase font-bold text-gray-400 mb-8 transition-opacity duration-700 delay-300 ${inView ? "opacity-100" : "opacity-0"}`}>
                    {tag}
                </p>

                {/* Heading */}
                <h2 className="text-4xl lg:text-6xl font-bold text-black leading-[1.1] mb-10 whitespace-pre-line tracking-tight">
                    {heading}
                </h2>

                {/* Minimalist Divider */}
                <div className={`h-[2px] bg-black mb-10 transition-all duration-1000 delay-500 ${inView ? "w-16" : "w-0"}`} />

                {/* Body - Tăng lên text-lg */}
                <p className={`text-lg text-gray-600 leading-relaxed mb-10 max-w-xl transition-opacity duration-700 delay-700 ${inView ? "opacity-100" : "opacity-0"}`}>
                    {body}
                </p>

                {/* Sub */}
                <p className={`text-[11px] tracking-[0.2em] font-bold text-gray-400 uppercase transition-opacity duration-700 delay-1000 ${inView ? "opacity-100" : "opacity-0"}`}>
                    {sub}
                </p>
            </div>
        </section>
    );
}

export default function AboutPage() {
    // 1. Khởi tạo state chứa dữ liệu thống kê (mặc định hiển thị "..." trong lúc chờ API)
    const [stats, setStats] = useState([
        { num: "...", label: "Đầu sách" },
        { num: "...", label: "Thành viên" },
        { num: "...", label: "Đánh giá" }
    ]);

    // 2. Gọi API để lấy dữ liệu thật
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Thay URL này bằng endpoint API thống kê thực tế của Backend bạn
                // Giả sử API trả về dạng: { totalBooks: 52100, totalUsers: 205000, avgRating: 4.8 }
                const { data } = await axios.get("http://localhost:5000/api/stats");

                // Hàm format số thông minh: 52100 -> "52K+"
                const formatK = (number) => {
                    if (!number) return "0";
                    if (number >= 1000) return Math.floor(number / 1000) + "K+";
                    return number.toString();
                };

                setStats([
                    { num: formatK(data.totalBooks), label: "Đầu sách" },
                    { num: formatK(data.totalUsers), label: "Thành viên" },
                    { num: `${data.avgRating || 5}★`, label: "Đánh giá" }
                ]);
            } catch (error) {
                console.error("Lỗi khi tải thống kê:", error);
                // Fallback: Nếu API lỗi thì hiển thị số mặc định cho đẹp
                setStats([
                    { num: "50K+", label: "Đầu sách" },
                    { num: "200K+", label: "Thành viên" },
                    { num: "5★", label: "Đánh giá" }
                ]);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="bg-white text-black min-h-screen">
            {/* HERO SECTION */}
            <header className="px-10 md:px-20 pt-16 pb-24 ">
                <div className="max-w-none grid grid-cols-1 md:grid-cols-3 md:pt-12 md:pb-20 gap-12 items-end">
                    <div className="space-y-8 md:col-span-2">
                        <h1 className="text-7xl lg:text-8xl xl:text-9xl md:mb-24 lg:mb-0 font-bold leading-[0.9] tracking-tighter text-black uppercase">
                            Chúng tôi <br />
                            <span className="text-gray-300 italic font-medium">tin vào</span> <br />
                            sức mạnh <br />
                            của sách.
                        </h1>
                    </div>

                    <div className="md:pb-4 space-y-12">
                        <p className="text-2xl text-gray-500 leading-relaxed max-w-md">
                            Booknest là điểm đến của những tâm hồn yêu đọc — nơi tri thức được trao đi với sự trân trọng và chăm chút tận tâm.
                        </p>

                        {/* CẬP NHẬT: Map qua state 'stats' thay vì mảng cứng */}
                        <div className="flex gap-16 border-t border-gray-100 pt-8">
                            {stats.map(({ num, label }) => (
                                <div key={label} className="space-y-2">
                                    <div className="text-5xl font-bold tracking-tighter transition-all duration-500">
                                        {num}
                                    </div>
                                    <div className="text-xl tracking-widest text-gray-400 uppercase font-bold">
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* ALTERNATING SECTIONS */}
            <div className="border-t border-gray-100">
                {SECTIONS.map((s, i) => (
                    <Section key={s.id} data={s} index={i} />
                ))}
            </div>
        </div>
    );
}