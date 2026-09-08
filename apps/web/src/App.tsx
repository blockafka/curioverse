import { useState, useCallback, type CSSProperties } from "react";
import { Card } from "./components/Card";

/* ---------- 类型 ---------- */
interface CardData {
  id: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

/* ---------- 粗野主义配色与物理参数 ---------- */
const INK = "#000000";
const CREAM = "#FFFDF5";
const BLUE = "#0084FF";

const FONT =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const BLACK_BORDER = "3px solid #000";
const HARD_SHADOW_SM = "3px 3px 0 0 #000";
const HARD_SHADOW = "5px 5px 0 0 #000";
const HARD_SHADOW_LG = "7px 7px 0 0 #000";

/* 卡片内图片：block + border-box，避免 inline 基线空隙与黑边框撑出滚动条 */
const CARD_IMG_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: "12px",
  border: BLACK_BORDER,
  boxSizing: "border-box",
  display: "block",
};

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
  <img key="galaxy" draggable={false} src="https://picsum.photos/seed/galaxy/400/600" alt="星际" style={CARD_IMG_STYLE} />,
  "在这张卡牌背后，隐藏着古老而强大的力量。只有真正理解卡牌语言的人，才能唤醒沉睡的能量。",
  <img key="ocean" draggable={false} src="https://picsum.photos/seed/ocean/400/600" alt="深海" style={CARD_IMG_STYLE} />,
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
  background: CREAM,
  backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
  color: INK,
  fontFamily: FONT,
  position: "relative",
  overflow: "hidden",
};

const headingStyle: CSSProperties = {
  textAlign: "center",
  margin: "0 0 16px",
};

const titleBadgeStyle: CSSProperties = {
  display: "inline-block",
  fontSize: "2.25rem",
  fontWeight: 900,
  color: "#ffffff",
  background: BLUE,
  border: BLACK_BORDER,
  borderRadius: "14px",
  padding: "4px 18px",
  boxShadow: HARD_SHADOW_LG,
  letterSpacing: "-0.02em",
  textTransform: "lowercase",
  transform: "rotate(-1deg)",
};

const subStyle: CSSProperties = {
  textAlign: "center",
  fontSize: "1rem",
  fontWeight: 700,
  color: INK,
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
    side === "left" ? "rgba(0,132,255,0.16)" : "rgba(255,107,107,0.16)",
  borderRight: side === "left" ? BLACK_BORDER : undefined,
  borderLeft: side === "right" ? BLACK_BORDER : undefined,
});

const zoneIconStyle: CSSProperties = {
  fontSize: "2.5rem",
  marginBottom: "10px",
  filter: "drop-shadow(2px 2px 0 #000)",
};

const zoneLabelStyle: CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: "2px",
  color: INK,
  writingMode: "vertical-rl" as const,
  background: "#fff",
  padding: "10px 5px",
  border: BLACK_BORDER,
  borderRadius: "10px",
  boxShadow: HARD_SHADOW_SM,
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
  background: "#fff",
  border: BLACK_BORDER,
  borderRadius: "9999px",
  padding: "8px 18px",
  boxShadow: HARD_SHADOW,
};

const debugBtnStyle: CSSProperties = {
  border: BLACK_BORDER,
  background: BLUE,
  color: "#ffffff",
  padding: "6px 14px",
  borderRadius: "9999px",
  fontSize: "0.8rem",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: FONT,
  boxShadow: HARD_SHADOW_SM,
};

const debugTextStyle: CSSProperties = {
  fontSize: "0.8rem",
  color: INK,
  fontWeight: 700,
};

const favListStyle: CSSProperties = {
  position: "fixed",
  bottom: "76px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: "8px",
  zIndex: 50,
};

const favBadgeStyle: CSSProperties = {
  background: "#fff",
  color: INK,
  fontSize: "0.7rem",
  fontWeight: 700,
  padding: "3px 10px",
  borderRadius: "9999px",
  border: BLACK_BORDER,
  boxShadow: HARD_SHADOW_SM,
  whiteSpace: "nowrap" as const,
};

/* 贴纸按压效果：hover 时向阴影方向位移并收回阴影 */
const brutalCSS = `
.brutal-btn {
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.brutal-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 0 #000;
}
.brutal-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 #000;
}
`;

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
          draggable={false}
          src="https://picsum.photos/seed/galaxy/400/600"
          alt="星际"
          style={CARD_IMG_STYLE}
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

  // 可控的混乱：给卡牌分配轻微旋转
  const ROTATIONS = [-1.6, 1.4, -0.8];

  return (
    <main style={pageStyle}>
      <style>{brutalCSS}</style>

      {/* 左侧收藏区 */}
      <div style={zoneStyle("left")}>
        <div style={zoneIconStyle}>✨</div>
        <div style={zoneLabelStyle}>收藏</div>
      </div>

      {/* 右侧销毁区 */}
      <div style={zoneStyle("right")}>
        <div style={zoneIconStyle}>🗑️</div>
        <div style={zoneLabelStyle}>销毁</div>
      </div>

      <h1 style={headingStyle}>
        <span style={titleBadgeStyle}>Curioverse</span>
      </h1>
      <p style={subStyle}>拖拽卡牌到两侧，右划销毁，左划收藏</p>

      <div style={cardAreaStyle}>
        {cards.map((card, i) => (
          <Card
            key={card.id}
            id={card.id}
            title={card.title}
            subtitle={card.subtitle}
            width="220px"
            rotate={ROTATIONS[i % ROTATIONS.length]}
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
        <span style={debugTextStyle}>卡片: {cards.length}/3</span>
        <button
          className="brutal-btn"
          style={debugBtnStyle}
          onClick={handleAdd}
        >
          + 添加卡片
        </button>
      </div>
    </main>
  );
}
