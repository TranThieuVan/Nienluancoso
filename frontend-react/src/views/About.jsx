import { useState, useEffect, useRef } from "react";

const sections = [
    {
        id: 1,
        imageLeft: false,
        tag: "Câu chuyện của chúng tôi",
        heading: "Nơi mỗi trang sách\nlà một hành trình.",
        body: "Được thành lập vào năm 2018, Booknest ra đời từ niềm tin rằng sách không chỉ là vật phẩm — mà là cánh cửa mở ra những thế giới chưa từng được khám phá. Chúng tôi là những người yêu sách, bởi những người yêu sách, dành cho những người yêu sách.",
        sub: "Hơn 50.000 đầu sách · Giao hàng toàn quốc · Đổi trả miễn phí 30 ngày",
        image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
        alt: "Thư viện sách cổ điển",
    },
    {
        id: 2,
        imageLeft: true,
        tag: "Triết lý biên tập",
        heading: "Chúng tôi chọn lọc\nbằng trái tim.",
        body: "Mỗi cuốn sách trên Booknest đều trải qua quá trình tuyển chọn kỹ lưỡng từ đội ngũ biên tập viên giàu kinh nghiệm. Chúng tôi không theo đuổi số lượng — chúng tôi theo đuổi chất lượng và sự phù hợp với từng độc giả.",
        sub: "Danh mục được biên tập thủ công · Đội ngũ 12 biên tập viên",
        image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
        alt: "Biên tập sách",
    },
    {
        id: 3,
        imageLeft: false,
        tag: "Cộng đồng",
        heading: "Đọc cùng nhau\nhơn đọc một mình.",
        body: "Booknest không chỉ là một cửa hàng. Chúng tôi xây dựng một cộng đồng nơi các độc giả chia sẻ, đánh giá và khám phá sách cùng nhau. Mỗi review, mỗi cuộc trò chuyện đều là một phần của hành trình.",
        sub: "Hơn 200.000 thành viên · 15.000 bài review · CLB đọc sách hàng tuần",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
        alt: "Cộng đồng đọc sách",
    },
];

function useInView(threshold = 0.15) {
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
    const { imageLeft, tag, heading, body, sub, image, alt } = data;

    return (
        <section
            ref={ref}
            className={`flex flex-col md:flex-row ${imageLeft ? "md:flex-row-reverse" : ""} min-h-[520px] `}
            style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(40px)", transition: "opacity 0.8s ease, transform 0.8s ease", transitionDelay: `${index * 0.08}s` }}
        >
            {/* Image — 40% */}
            <div className="w-full md:w-2/5 relative overflow-hidden bg-neutral-100" style={{ minHeight: 320 }}>
                <img
                    src={image}
                    alt={alt}
                    className="w-full h-full object-cover"
                    style={{
                        position: "absolute", inset: 0,
                        transition: "transform 0.9s ease",
                        transform: inView ? "scale(1)" : "scale(1.06)",
                    }}
                />
                {/* Overlay subtle */}
                <div className="absolute inset-0 bg-black/10" />
                {/* Index number */}
                <span
                    className="absolute bottom-5 left-5 font-mono text-white/80 text-xs tracking-[0.25em] uppercase"
                    style={{ letterSpacing: "0.22em" }}
                >
                    0{data.id} /
                </span>
            </div>

            {/* Text — 60% */}
            <div
                className={`w-full md:w-3/5 flex flex-col justify-center px-10 py-16 md:px-16 lg:px-20 `}
            >
                {/* Tag */}
                <p
                    className="text-xs tracking-[0.3em] uppercase font-mono text-neutral-400 mb-6"
                    style={{ opacity: inView ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }}
                >
                    {tag}
                </p>

                {/* Heading */}
                <h2
                    className="text-4xl lg:text-5xl font-light text-black leading-tight mb-8"
                    style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        whiteSpace: "pre-line",
                        opacity: inView ? 1 : 0,
                        transform: inView ? "translateY(0)" : "translateY(16px)",
                        transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
                    }}
                >
                    {heading}
                </h2>

                {/* Divider */}
                <div
                    className="bg-black mb-8"
                    style={{
                        height: 1,
                        width: inView ? 60 : 0,
                        transition: "width 0.9s ease 0.45s",
                    }}
                />

                {/* Body */}
                <p
                    className="text-base text-neutral-600 leading-relaxed mb-8 max-w-lg"
                    style={{
                        fontFamily: "'Lora', Georgia, serif",
                        opacity: inView ? 1 : 0,
                        transition: "opacity 0.8s ease 0.5s",
                    }}
                >
                    {body}
                </p>

                {/* Sub */}
                <p
                    className="text-xs tracking-widest font-mono text-neutral-400 uppercase"
                    style={{ opacity: inView ? 1 : 0, transition: "opacity 0.8s ease 0.65s" }}
                >
                    {sub}
                </p>
            </div>
        </section>
    );
}

export default function AboutPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Lora:ital@0;1&family=Space+Mono:wght@400;700&display=swap";
        document.head.appendChild(link);

        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="bg-white text-black min-h-screen" style={{ fontFamily: "'Space Mono', monospace" }}>

            {/* HERO */}
            <div>
                <div className="max-w-none px-10 md:px-16 pt-20 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div>
                        <p className="text-xs tracking-[0.35em] uppercase font-mono text-neutral-400 mb-6">Giới thiệu</p>
                        <h1
                            className="text-6xl md:text-8xl font-light leading-none text-black"
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                            Chúng tôi
                            <br />
                            <em>tin vào</em>
                            <br />
                            sức mạnh
                            <br />
                            của sách.
                        </h1>
                    </div>
                    <div className="md:self-end pb-2">
                        <p
                            className="text-base text-neutral-500 leading-relaxed max-w-sm mb-8"
                            style={{ fontFamily: "'Lora', Georgia, serif" }}
                        >
                            Booknest là điểm đến của những tâm hồn yêu đọc — nơi tri thức được trao đi với sự trân trọng và chăm chút tận tâm.
                        </p>
                        <div className="flex gap-12 text-center">
                            {[["50K+", "Đầu sách"], ["200K+", "Thành viên"], ["5★", "Đánh giá"]].map(([num, label]) => (
                                <div key={label}>
                                    <div className="text-3xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{num}</div>
                                    <div className="text-xs tracking-widest text-neutral-400 uppercase mt-1">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ALTERNATING SECTIONS */}
            <div>
                {sections.map((s, i) => (
                    <Section key={s.id} data={s} index={i} />
                ))}
            </div>



        </div>
    );
}