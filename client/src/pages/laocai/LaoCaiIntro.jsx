import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Breadcrumb, Modal, Carousel } from 'antd';
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import './LaoCaiIntro.css';

/** Ảnh nền hero — luân phiên ~3 khung cảnh miền núi (CDN Unsplash). */
const HERO_SLIDES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1920&q=80',
];

const DESTINATIONS = [
  {
    key: 'fansipan',
    title: 'Đỉnh Fansipan',
    desc: 'Nóc nhà Đông Dương, cáp treo và không gian tâm linh trên đỉnh núi.',
    // Ảnh modal/card lấy từ client/public/laocai/
    // Dùng ảnh `.png` có sẵn ở public/laocai
    img: '/laocai/Fansipan-1.png',
    gallery: [
      '/laocai/Fansipan-1.png',
      '/laocai/Fansipan-2.png',
      '/laocai/Fansipan-3.png',
    ],
    bestTime: 'Tháng 9 – tháng 4 (trời trong, ít sương mù dày)',
    details:
      'Fansipan cao 3.143 m, là điểm nhấn du lịch tâm linh – thiên nhiên của Lào Cai. Hệ thống cáp treo giúp di chuyển thuận tiện; trên đỉnh có quần thể kiến trúc và không gian lễ bái. Đây là nơi phù hợp để hiểu thêm về định hướng phát triển du lịch bền vững và hạ tầng phục vụ khách tại tỉnh.',
    highlights: [
      'Cáp treo Sun World Fansipan Legend, tuyến đi bộ và điểm ngắm toàn cảnh dãy Hoàng Liên Sơn.',
      'Kết hợp được với lịch trình Sa Pa 1–2 ngày: chợ, bản làng, ẩm thực địa phương.',
      'Lưu ý thời tiết lạnh và sương mù; nên mang áo ấm, giày chống trơn.',
    ],
  },
  {
    key: 'sapa',
    title: 'Thị trấn Sa Pa',
    desc: 'Khí hậu ôn đới, kiến trúc Pháp cổ và chợ phiên đa sắc màu.',
    img: '/laocai/ThitranSapa-1.png',
    gallery: [
      '/laocai/ThitranSapa-1.png',
      '/laocai/ThitranSapa-2.png',
      '/laocai/ThitranSapa-3.png',
    ],
    bestTime: 'Quanh năm; mùa thu – đông thường có không khí trong và nhiệt độ dễ chịu.',
    details:
      'Sa Pa là trung tâm hành chính – dịch vụ quan trọng của tỉnh Lào Cai, nơi tập trung lưu trú, ăn uống, vận chuyển và các hoạt động văn hoá cộng đồng. Sinh viên thực tập có thể quan sát mô hình đô thị nhỏ ven núi, tương tác dịch vụ số (đặt phòng, bản đồ, thanh toán) và các hoạt động hỗ trợ cộng đồng địa phương.',
    highlights: [
      'Nhà thờ đá, chợ tình Sa Pa, phố đi bộ và ẩm thực: thắng cố, cơm lam, rau rừng.',
      'Thuận tiện làm điểm trung chuyển tới Fansipan, bản Cát Cát, thung lũng Mường Hoa.',
      'Nên tôn trọng văn hoá dân tộc thiểu số khi tham quan, mua sắm.',
    ],
  },
  {
    key: 'muonghoa',
    title: 'Thung lũng Mường Hoa',
    desc: 'Ruộng bậc thang, bản làng và cảnh quan nông nghiệp đặc trưng Tây Bắc.',
    img: '/laocai/Thunglungmuonghoa-1.png',
    gallery: [
      '/laocai/Thunglungmuonghoa-1.png',
      '/laocai/Thunglungmuonghoa-2.png',
      '/laocai/Thunglungmuonghoa-3.png',
    ],
    bestTime: 'Mùa nước đổ (khoảng tháng 5 – 6) và mùa lúa chín (khoảng tháng 9 – 10).',
    details:
      'Mường Hoa nổi bật với ruộng bậc thang, suối và bản làng. Đây là minh hoạ rõ ràng cho mối quan hệ giữa địa hình, thủy lợi và sản xuất nông nghiệp của đồng bào. Phù hợp cho các chủ đề thực tập liên quan khảo sát địa phương, du lịch cộng đồng hoặc truyền thông địa danh.',
    highlights: [
      'Tuyến tàu hoả leo núi / cáp có thể kết hợp tùy thời điểm mở cửa và thời tiết.',
      'Đường dốc, nhiều bậc thang — cần sức khoẻ vừa phải và giày thể thao.',
      'Giữ gìn cảnh quan: không xả rác, không bẻ cành, tôn trọng ruộng đang canh tác.',
    ],
  },
  {
    key: 'catcat',
    title: 'Bản Cát Cát',
    desc: 'Làng nghề dệt, thác nước và trải nghiệm văn hoá dân tộc.',
    img: '/laocai/BanCatCat-1.png',
    gallery: [
      '/laocai/BanCatCat-1.png',
      '/laocai/BanCatCat-2.png',
      '/laocai/BanCatCat-3.png',
    ],
    bestTime: 'Xuân (hoa, suối đầy nước) và cuối thu (khí trong, ít mưa).',
    details:
      'Cát Cát là bản làng gần trung tâm Sa Pa, nổi tiếng với nghề dệt thổ cẩm, thác nước và không gian văn hoá trình diễn. Phù hợp tham quan ngắn ngày, học về làng nghề và mô hình thu nhập từ du lịch địa phương.',
    highlights: [
      'Có lệ phí tham quan; nên hỏi giá và xin phép trước khi chụp ảnh người dân.',
      'Đường đi dốc, có nhiều quầy hàng — cẩn trọng khi mua đồ lưu niệm.',
      'Kết hợp tốt với buổi chiều sau khi làm việc tại thị trấn.',
    ],
  },
];

// Video mẫu để test UI (chưa có file local).
// Khi bạn có video thật, thay URL này bằng đường dẫn local mp4/webm tương ứng.
const VIDEO_SAMPLES = {
  fansipan: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  sapa: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  muonghoa: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  catcat: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
};

function makeSvgPlaceholder(title, variant = 0) {
  const safe = String(title)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .trim();

  const palettes = [
    ['#0ea5e9', '#22c55e'],
    ['#3b82f6', '#14b8a6'],
    ['#2563eb', '#f97316'],
    ['#1d4ed8', '#84cc16'],
  ];
  const [a, b] = palettes[variant % palettes.length];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${a}"/>
          <stop offset="1" stop-color="${b}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#g)"/>
      <rect x="0" y="0" width="1200" height="700" fill="rgba(0,0,0,0.15)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif"
        font-size="58" font-weight="800" fill="rgba(255,255,255,0.95)">${safe}</text>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif"
        font-size="20" font-weight="600" fill="rgba(255,255,255,0.80)">Ảnh minh hoạ</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function LaoCaiIntro() {
  const history = useHistory();
  const [q, setQ] = useState('');
  const [activeDestination, setActiveDestination] = useState(null);
  const [activeVideoKey, setActiveVideoKey] = useState(null);
  const heroCarouselRef = useRef(null);
  const modalCarouselRef = useRef(null);
  const rootRef = useRef(null);
  const autoStateRef = useRef({
    enabled: false,
    isAutoPlaying: false,
    eligible: new Set(),
    triggered: new Set(),
    visualOrder: [],
  });
  const closeTimerRef = useRef(null);
  const modalOpenRef = useRef(false);

  const recomputeVisualOrder = () => {
    const root = rootRef.current;
    if (!root) return [];

    const cards = Array.from(root.querySelectorAll('[data-card-key]'));
    if (!cards.length) return [];

    const items = cards.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        key: el.getAttribute('data-card-key'),
        x: rect.left,
        y: rect.top,
      };
    });

    // Xác định số cột theo x để chọn chiến lược thứ tự phù hợp:
    // - Nếu đang 2 cột: ưu tiên theo cột (trên -> dưới trong cột trái trước), đúng ý "1 trên 2 dưới".
    // - Nếu >= 3 cột: ưu tiên theo hàng (trên -> dưới, trong mỗi hàng trái -> phải).
    const itemsSortedX = items.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const columns = [];
    const colTolerance = 140; // px

    itemsSortedX.forEach((it) => {
      const last = columns[columns.length - 1];
      if (!last || Math.abs(it.x - last.xCenter) > colTolerance) {
        columns.push({ xCenter: it.x, items: [it] });
      } else {
        last.items.push(it);
        last.xCenter = (last.xCenter * (last.items.length - 1) + it.x) / last.items.length;
      }
    });

    const colCount = columns.length;
    const orderedKeys = [];
    const seen = new Set();
    const pushKey = (k) => {
      if (!k || seen.has(k)) return;
      seen.add(k);
      orderedKeys.push(k);
    };

    if (colCount >= 3) {
      // Row-major: y asc, x asc
      items.slice().sort((a, b) => a.y - b.y || a.x - b.x).forEach((it) => pushKey(it.key));
      return orderedKeys;
    }

    // 1 cột: cũng xếp top-to-bottom
    if (colCount <= 1) {
      items.slice().sort((a, b) => a.y - b.y || a.x - b.x).forEach((it) => pushKey(it.key));
      return orderedKeys;
    }

    // 2 cột: cột trái -> cột phải; trong mỗi cột: top -> bottom
    columns
      .slice()
      .sort((a, b) => a.xCenter - b.xCenter)
      .forEach((col) => {
        col.items
          .slice()
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .forEach((it) => pushKey(it.key));
      });

    return orderedKeys;
  };

  const tryAutoOpenNext = () => {
    const root = rootRef.current;
    if (!root) return;
    const st = autoStateRef.current;
    if (!st.enabled) return;
    if (st.isAutoPlaying) return;
    if (modalOpenRef.current) return;

    const nextKey = st.visualOrder.find((k) => st.eligible.has(k) && !st.triggered.has(k));
    if (!nextKey) return;

    st.triggered.add(nextKey);
    st.eligible.delete(nextKey);

    st.isAutoPlaying = true;
    // Auto "chạm" theo thứ tự: chuyển thẻ đang phát video preview
    setActiveVideoKey(nextKey);

    closeTimerRef.current = setTimeout(() => {
      setActiveVideoKey(null);
      st.isAutoPlaying = false;
      // Sau khi tắt video preview, thử chuyển thẻ tiếp theo nếu còn nằm trong viewport
      tryAutoOpenNext();
    }, 1500);
  };

  useEffect(() => {
    modalOpenRef.current = !!activeDestination;
  }, [activeDestination]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;

    const els = root.querySelectorAll('[data-reveal="fade-up"]');
    if (!els.length) return;

    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      els.forEach((el) => el.classList.add('lc-reveal-show'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lc-reveal-show');
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    autoStateRef.current.visualOrder = recomputeVisualOrder();

    const cards = Array.from(root.querySelectorAll('[data-card-key]'));
    if (!cards.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const st = autoStateRef.current;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = entry.target.getAttribute('data-card-key');
          if (!key) return;
          st.eligible.add(key);
        });
        tryAutoOpenNext();
      },
      {
        threshold: 0.45,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    cards.forEach((c) => io.observe(c));

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const prev = autoStateRef.current._lastY ?? y;
      autoStateRef.current._lastY = y;
      // chỉ bật auto khi đang scroll xuống
      autoStateRef.current.enabled = y > prev + 6;
      // nếu vừa enabled, thử mở ngay
      if (autoStateRef.current.enabled) tryAutoOpenNext();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => {
      autoStateRef.current.visualOrder = recomputeVisualOrder();
      // giữ eligible/triggered để không nhảy lung tung
    };
    window.addEventListener('resize', onResize);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function nextHeroSlide() {
    heroCarouselRef.current?.next();
  }

  function nextModalSlide() {
    modalCarouselRef.current?.next();
  }

  function normalizeText(input) {
    // Loại ký tự ẩn (zero-width) và chuẩn hoá tiếng Việt để search/xoá không bị kẹt query
    const cleaned0 = String(input ?? '')
      // xóa zero-width + BOM
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // thay NBSP thành space thường
      .replace(/\u00A0/g, ' ')
      // gom mọi whitespace unicode về space
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned0) return '';

    const cleaned1 = cleaned0
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Nếu chuỗi chỉ còn ký tự “không chữ số/không chữ cái” (vd: ký tự ẩn), coi như rỗng
    const cleaned2 = cleaned1.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned2 || '';
  }

  const qNormalized = useMemo(() => normalizeText(q), [q]);

  // Nếu người dùng xoá nhưng vẫn còn ký tự ẩn/whitespace trong state,
  // ép state về '' để filtered không bị "kẹt" 1 kết quả.
  useEffect(() => {
    if (q !== '' && qNormalized === '') setQ('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qNormalized]);

  const filtered = useMemo(() => {
    const s = qNormalized;
    if (!s) return DESTINATIONS;

    return DESTINATIONS.filter((d) => {
      const titleN = normalizeText(d.title);
      const descN = normalizeText(d.desc);
      const detailsN = normalizeText(d.details);
      return titleN.includes(s) || descN.includes(s) || detailsN.includes(s);
    });
  }, [qNormalized]);

  function handleSearch(e) {
    e.preventDefault();
  }

  return (
    <div className="lc-root" ref={rootRef}>
      <section className="lc-hero lc-hero-slider">
        <div className="lc-breadcrumb-wrap">
          <Breadcrumb separator="/">
            <Breadcrumb.Item>
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => history.push('/')}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && history.push('/')}
              >
                Trang chủ
              </span>
            </Breadcrumb.Item>
            <Breadcrumb.Item>Giới thiệu Lào Cai</Breadcrumb.Item>
          </Breadcrumb>
        </div>

        <div className="lc-hero-bg">
          <Carousel
            ref={heroCarouselRef}
            autoplay
            autoplaySpeed={5500}
            effect="fade"
            dots={{ className: 'lc-hero-dots' }}
            className="lc-hero-carousel"
          >
            {HERO_SLIDES.map((src) => (
              <div key={src}>
                <div
                  className="lc-hero-slide-bg"
                  style={{ backgroundImage: `url(${src})` }}
                  role="button"
                  tabIndex={0}
                  onClick={nextHeroSlide}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      nextHeroSlide();
                    }
                  }}
                  aria-label="Bấm để xem ảnh nền tiếp theo"
                />
              </div>
            ))}
          </Carousel>
          <div className="lc-hero-gradient" aria-hidden />
        </div>
        <div className="lc-hero-inner">
          <div className="lc-kicker lc-reveal" data-reveal="fade-up">
            <EnvironmentOutlined style={{ marginRight: 8 }} />
            Tỉnh Lào Cai · Việt Nam
          </div>
          <h1 className="lc-title lc-reveal" data-reveal="fade-up" style={{ '--reveal-delay': '60ms' }}>
            Khám phá Lào Cai cùng hành trình thực tập
          </h1>
          <p className="lc-lead lc-reveal" data-reveal="fade-up" style={{ '--reveal-delay': '110ms' }}>
            Lào Cai là cửa ngõ Tây Bắc: biên giới, đa dân tộc, cảnh quan núi rừng và đô thị đang
            chuyển mình số. Trang này giúp hình dung địa phương khi thực tập tại các đơn vị đối tác
            trên địa bàn — ví dụ <strong>Trung tâm Công nghệ thông tin tỉnh</strong>.
          </p>
          <form className="lc-search-wrap" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Tìm điểm đến (vd: Sa Pa, Fansipan...)"
              value={q}
              onChange={(e) => {
                setQ(e.currentTarget.value);
              }}
              aria-label="Tìm điểm đến Lào Cai"
            />
            <button type="submit" className="lc-search-btn" aria-label="Tìm kiếm">
              <SearchOutlined />
            </button>
          </form>
        </div>
      </section>

      <section className="lc-section">
        <div className="lc-glass">
          <h2 className="lc-glass-title">Điểm đến nổi bật</h2>
          <p className="lc-glass-hint">Bấm vào từng thẻ để xem mô tả chi tiết và xem 3 ảnh luân phiên.</p>
          <div className="lc-cards">
            {filtered.map((d, idx) => (
              <article
                key={d.key}
                className="lc-card lc-reveal"
                role="button"
                tabIndex={0}
                data-card-key={d.key}
                onClick={() => {
                  setActiveVideoKey(d.key);
                  setActiveDestination(d);
                }}
                onMouseEnter={() => setActiveVideoKey(d.key)}
                onMouseLeave={() => {
                  // Nếu chưa mở modal cho thẻ này thì trả về ảnh khi rời chuột
                  if (!activeDestination || activeDestination.key !== d.key) {
                    setActiveVideoKey(null);
                  }
                }}
                onFocus={() => setActiveVideoKey(d.key)}
                onBlur={() => {
                  if (!activeDestination || activeDestination.key !== d.key) {
                    setActiveVideoKey(null);
                  }
                }}
                onTouchStart={() => setActiveVideoKey(d.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveVideoKey(d.key);
                    setActiveDestination(d);
                  }
                }}
                aria-label={`Xem chi tiết ${d.title}`}
                data-reveal="fade-up"
                style={{ '--reveal-delay': `${idx * 60}ms` }}
              >
                {activeVideoKey === d.key ? (
                  <video
                    className="lc-card-video"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    src={VIDEO_SAMPLES[d.key]}
                    poster={d.img}
                  />
                ) : (
                  <img
                    className="lc-card-img"
                    src={d.img}
                    alt={d.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = makeSvgPlaceholder(d.title, 0);
                    }}
                  />
                )}
                <div className="lc-card-body">
                  <h3 className="lc-card-title">{d.title}</h3>
                  <p className="lc-card-desc">{d.desc}</p>

                  <div className="lc-card-extra">
                    <div className="lc-card-bestTime">
                      <span className="lc-card-bestTime-label">Thời điểm:</span> {d.bestTime}
                    </div>
                    {d.highlights && d.highlights.length > 0 && (
                      <div className="lc-card-tags">
                        {d.highlights.slice(0, 2).map((t) => (
                          <span className="lc-pill" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="lc-card-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveVideoKey(d.key);
                      setActiveDestination(d);
                    }}
                    aria-label={`Xem chi tiết ${d.title}`}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <p style={{ margin: 16, opacity: 0.9 }}>Không có kết quả phù hợp &quot;{q}&quot;.</p>
          )}
        </div>
      </section>

      <section className="lc-context lc-reveal" data-reveal="fade-up" style={{ '--reveal-delay': '50ms' }}>
        <h2>Thông tin thực tập trên cổng quản lý</h2>
        <p>
          Đăng ký thực tập, xác nhận/duyệt thông tin, phân công và tổng kết thường được thực hiện
          trực tiếp trên cổng quản lý (tuỳ vai trò tài khoản của bạn). Trang này chủ yếu giúp bạn
          hình dung “bước nào làm gì” và cách đọc trạng thái trên hệ thống.
        </p>

        <div className="lc-proc">
          <div className="lc-proc-item">
            <div className="lc-proc-step">1</div>
            <div className="lc-proc-body">
              <div className="lc-proc-title">Đăng ký thực tập</div>
              <div className="lc-proc-status">
                Thường gặp: <span className="lc-status-pill">Chờ duyệt</span>
              </div>
              <div className="lc-proc-desc">Điền đúng thông tin và chuẩn bị file/biểu mẫu theo yêu cầu.</div>
            </div>
          </div>

          <div className="lc-proc-item">
            <div className="lc-proc-step">2</div>
            <div className="lc-proc-body">
              <div className="lc-proc-title">Xác nhận/duyệt thông tin</div>
              <div className="lc-proc-status">
                Có thể chuyển: <span className="lc-status-pill">Chờ bổ sung</span>
              </div>
              <div className="lc-proc-desc">Theo thông báo và cập nhật kịp thời nếu hệ thống yêu cầu.</div>
            </div>
          </div>

          <div className="lc-proc-item">
            <div className="lc-proc-step">3</div>
            <div className="lc-proc-body">
              <div className="lc-proc-title">Phân công doanh nghiệp &amp; người hướng dẫn</div>
              <div className="lc-proc-status">
                Khi chốt: <span className="lc-status-pill">Đã được phân công</span>
              </div>
              <div className="lc-proc-desc">Kiểm tra lại doanh nghiệp và người hướng dẫn để tránh sai lệch.</div>
            </div>
          </div>

          <div className="lc-proc-item">
            <div className="lc-proc-step">4</div>
            <div className="lc-proc-body">
              <div className="lc-proc-title">Nộp hồ sơ/biểu mẫu &amp; cập nhật tiến độ</div>
              <div className="lc-proc-status">
                Thường gặp: <span className="lc-status-pill">Đang thực hiện</span> /{' '}
                <span className="lc-status-pill">Đã nộp</span> / <span className="lc-status-pill">Chờ phản hồi</span>
              </div>
              <div className="lc-proc-desc">Nộp đúng hạn, ghi chú/trao đổi khi có thay đổi.</div>
            </div>
          </div>

          <div className="lc-proc-item">
            <div className="lc-proc-step">5</div>
            <div className="lc-proc-body">
              <div className="lc-proc-title">Tổng kết (nghiệm thu/báo cáo/điểm)</div>
              <div className="lc-proc-status">
                Có thể hiển thị: <span className="lc-status-pill">Chờ nghiệm thu</span> →{' '}
                <span className="lc-status-pill">Đã hoàn tất</span>
              </div>
              <div className="lc-proc-desc">Rà soát bộ hồ sơ cuối kỳ theo hướng dẫn.</div>
            </div>
          </div>
        </div>

        <div className="lc-grid-3">
          <div className="lc-context-card">
            <div className="lc-context-card-title">Checklist theo giai đoạn</div>
            <ul className="lc-mini-list">
              <li>
                <strong>Trước khi bắt đầu:</strong> thông tin cá nhân, đối chiếu dữ liệu thực tập, kiểm tra file/giấy tờ (đúng định dạng, đủ yêu cầu).
              </li>
              <li>
                <strong>Trong quá trình:</strong> nộp đúng hạn, cập nhật tiến độ, lưu biên nhận/phiên bản đã nộp và ghi chú khi thay đổi.
              </li>
              <li>
                <strong>Kết thúc:</strong> rà soát tài liệu đã nộp, tải/bảo quản biên nhận hoặc kết quả (nếu có), rồi chốt hồ sơ.
              </li>
            </ul>
          </div>

          <div className="lc-context-card">
            <div className="lc-context-card-title">Nếu gặp lỗi/thiếu thông tin</div>
            <ul className="lc-mini-list">
              <li><strong>Upload lỗi/định dạng sai:</strong> thử đúng định dạng, nén file (nếu cần) và kiểm tra dung lượng; nếu vẫn lỗi thì báo bộ phận hỗ trợ trong hệ thống.</li>
              <li><strong>Sai dữ liệu/chưa được phân công:</strong> kiểm tra lại trường thông tin và trạng thái; làm theo “trả về/đề nghị bổ sung”.</li>
              <li><strong>Không tìm thấy biểu mẫu:</strong> đúng mục/tab theo vai trò hoặc dùng ô tìm kiếm; nếu không thấy thì hỏi HR/admin.</li>
            </ul>
          </div>

          <div className="lc-context-card lc-schedule-card">
            <div className="lc-context-card-title">Gợi ý lịch làm việc thực tế</div>
            <div className="lc-schedule-text">
              Mỗi tuần dành khoảng <strong>15–30 phút</strong> để cập nhật tiến độ và kiểm tra trạng thái.
              Trước deadline <strong>2–3 ngày</strong> thì chuẩn bị xong để tránh nộp dồn cuối kỳ.
            </div>
          </div>
        </div>
      </section>

      <Modal
        title={activeDestination ? activeDestination.title : 'Chi tiết điểm đến'}
        visible={!!activeDestination}
        onCancel={() => {
          setActiveDestination(null);
          setActiveVideoKey(null);
        }}
        footer={null}
        width={720}
        destroyOnClose
      >
        {activeDestination && (
          <div className="lc-detail">
            <Carousel
              ref={modalCarouselRef}
              autoplay
              autoplaySpeed={4000}
              effect="fade"
              dots
              className="lc-modal-carousel"
            >
              {(activeDestination.gallery || [activeDestination.img]).map((src) => (
                <div key={src}>
                  <button
                    type="button"
                    className="lc-modal-slide-btn"
                    onClick={nextModalSlide}
                    aria-label="Xem ảnh tiếp theo"
                  >
                    <img
                      className="lc-detail-img"
                      src={src}
                      alt={activeDestination.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = makeSvgPlaceholder(activeDestination.title, 1);
                      }}
                    />
                  </button>
                </div>
              ))}
            </Carousel>
            <p className="lc-detail-desc">{activeDestination.details}</p>
            <p className="lc-detail-meta">
              <strong>Thời điểm gợi ý:</strong> {activeDestination.bestTime}
            </p>
            {activeDestination.highlights && (
              <ul className="lc-detail-list">
                {activeDestination.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
