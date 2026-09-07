import { useState, useCallback, type CSSProperties } from "react";
import { Card } from "./components/Card";

/* ---------- 类型 ---------- */
interface CardData {
  id: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

const MOCK_TITLES = [
  ["瞬悉全宇宙", "长得帅"],
  ["为什么年轻人喜欢徒步？", "Angfel Cijd"],
  ["为什么年轻人总是不喜欢徒步？", "🍺"],
  ["暗影骑士", "神秘力量的守护者"],
  ["深海秘境", "潜入深渊"],
  ["火焰巫师", "掌控元素之力"],
  ["风之行者", "穿梭于林叶之间"],
  ["时间旅者", "跨越世纪的追寻"],
  ["梦境编织者", "沉睡中的奇迹"],
];

const MOCK_CONTENTS = [
  "探索故事、观点与现实应用。每张卡牌都是一扇通往未知世界的门，等待你去揭开它的秘密。",
  "通过精心的像素艺术设计，传统卡牌游戏焕发出全新的生命力。每一个像素都承载着创作者的心血与灵感。",
  <img key="galaxy" src="https://picsum.photos/seed/galaxy/400/600" alt="星际" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />,
  "在这张卡牌背后，隐藏着古老而强大的力量。只有真正理解卡牌语言的人，才能唤醒沉睡的能量。",
  <img key="ocean" src="https://picsum.photos/seed/ocean/400/600" alt="深海" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />,
  "元素卡牌是游戏中最具爆发力的存在。当巫师举起法杖，整个战场都将被烈焰吞噬。",
  "风行者从不留下足迹，他们像一阵微风掠过战场，只留下敌人困惑的眼神。",
  "时间的河流不会为任何人停留，但时间旅者可以在关键时刻短暂地触摸过去与未来。",
  "梦境编织者在黑夜中编织着最瑰丽的图景，那些被遗忘的想象将在黎明前重获新生。",
];

let nextId = 100;

/* ---------- styles ---------- */
const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "48px 24px",
  background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
  color: "#111827",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  position: "relative",
  overflow: "hidden",
};

const headingStyle: CSSProperties = {
  textAlign: "center",
  fontSize: "2rem",
  fontWeight: 700,
  marginBottom: "8px",
  color: "#0f172a",
};

const subStyle: CSSProperties = {
  textAlign: "center",
  fontSize: "1rem",
  color: "#64748b",
  marginBottom: "48px",
};

const cardAreaStyle: CSSProperties = {
  display: "flex",
  gap: "28px",
  justifyContent: "center",
  alignItems: "center",
  maxWidth: "800px",
  margin: "0 auto",
  minHeight: "380px",
  position: "relative",
  zIndex: 1,
};

const zoneStyle = (side: "left" | "right"): CSSProperties => ({
  position: "fixed",
  top: 0,
  bottom: 0,
  left: side === "left" ? 0 : undefined,
  right: side === "right" ? 0 : undefined,
  width: "18%",
  minWidth: "80px",
  maxWidth: "180px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 0,
  pointerEvents: "none",
  userSelect: "none",
  background:
    side === "left"
      ? "linear-gradient(180deg, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0.06) 100%)"
      : "linear-gradient(180deg, rgba(239,68,68,0.16) 0%, rgba(239,68,68,0.06) 100%)",
  backdropFilter: "blur(2px)",
  borderRight: side === "left" ? "1px solid rgba(59,130,246,0.3)" : undefined,
  borderLeft: side === "right" ? "1px solid rgba(239,68,68,0.3)" : undefined,
});

const zoneIconStyle: CSSProperties = {
  fontSize: "2.5rem",
  opacity: 0.45,
  marginBottom: "8px",
};

const zoneLabelStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "1.5px",
  opacity: 0.5,
  writingMode: "vertical-rl" as const,
};

const debugBarStyle: CSSProperties = {
  position: "fixed",
  bottom: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: "12px",
  alignItems: "center",
  zIndex: 50,
  background: "rgba(255,255,255,0.9)",
  borderRadius: "9999px",
  padding: "8px 18px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  backdropFilter: "blur(8px)",
};

const debugBtnStyle: CSSProperties = {
  border: "none",
  background: "#0f172a",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: "9999px",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const debugTextStyle: CSSProperties = {
  fontSize: "0.8rem",
  color: "#64748b",
  fontWeight: 500,
};

const favListStyle: CSSProperties = {
  position: "fixed",
  bottom: "72px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: "8px",
  zIndex: 50,
};

const favBadgeStyle: CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  fontSize: "0.7rem",
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: "9999px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
  whiteSpace: "nowrap" as const,
};

export function App() {
  const initialCards: CardData[] = [
    {
      id: "1",
      title: "瞬悉全宇宙",
      subtitle: "从一个问题出发",
      content:
        "探索故事、观点与现实应用。每张卡牌都是一扇通往未知世界的门，等待你去揭开它的秘密。",
    },
    {
      id: "2",
      title: "像素之美",
      subtitle: "复古与现代的融合",
      content:
        "通过精心的像素艺术设计，传统卡牌游戏焕发出全新的生命力。每一个像素都承载着创作者的心血与灵感。",
    },
    {
      id: "3",
      title: "星际航行者",
      subtitle: "探索未知星域",
      content: (
        <img
          src="https://picsum.photos/seed/galaxy/400/600"
          alt="星际"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "8px",
          }}
        />
      ),
    },
  ];

  const [cards, setCards] = useState<CardData[]>(initialCards);
  const [favorites, setFavorites] = useState<string[]>([]);

  const handleDestroy = useCallback((id: string) => {
    // 销毁后不自动补牌，由「+ 添加卡片」手动补牌
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleFavorite = useCallback((id: string) => {
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (card) {
        setFavorites((f) =>
          f.includes(card.title) ? f : [...f, card.title]
        );
      }
      const filtered = prev.filter((c) => c.id !== id);
      while (filtered.length < 3) {
        const idx = Math.floor(Math.random() * MOCK_TITLES.length);
        const [t, s] = MOCK_TITLES[idx];
        const contentIdx = idx % MOCK_CONTENTS.length;
        filtered.push({
          id: String(nextId++),
          title: t,
          subtitle: s,
          content: MOCK_CONTENTS[contentIdx],
        });
      }
      return filtered;
    });
  }, []);

  const handleAdd = useCallback(() => {
    setCards((prev) => {
      if (prev.length >= 3) return prev;
      const next = [...prev];
      while (next.length < 3) {
        const idx = Math.floor(Math.random() * MOCK_TITLES.length);
        const [t, s] = MOCK_TITLES[idx];
        const contentIdx = idx % MOCK_CONTENTS.length;
        next.push({
          id: String(nextId++),
          title: t,
          subtitle: s,
          content: MOCK_CONTENTS[contentIdx],
        });
      }
      return next;
    });
  }, []);

  return (
    <main style={pageStyle}>
      {/* 左侧收藏区 */}
      <div style={zoneStyle("left")}>
        <div style={zoneIconStyle}>✨</div>
        <div style={zoneLabelStyle}>收藏</div>
      </div>

      {/* 右侧销毁区 */}
      <div style={zoneStyle("right")}>
        <div style={zoneIconStyle}>🗑</div>
        <div style={zoneLabelStyle}>销毁</div>
      </div>

      <h1 style={headingStyle}>Curioverse</h1>
      <p style={subStyle}>拖拽卡牌到两侧，右划销毁，左划收藏</p>

      <div style={cardAreaStyle}>
        {cards.map((card) => (
          <Card
            key={card.id}
            id={card.id}
            title={card.title}
            subtitle={card.subtitle}
            width="220px"
            onDestroy={handleDestroy}
            onFavorite={handleFavorite}
          >
            {card.content}
          </Card>
        ))}
      </div>

      {/* 收藏列表（mock） */}
      {favorites.length > 0 && (
        <div style={favListStyle}>
          {favorites.map((f, i) => (
            <span key={i} style={favBadgeStyle}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Debug 工具栏 */}
      <div style={debugBarStyle}>
        <span style={debugTextStyle}>
          卡片: {cards.length}/3
        </span>
        <button style={debugBtnStyle} onClick={handleAdd}>
          + 添加卡片
        </button>
      </div>
    </main>
  );
}
