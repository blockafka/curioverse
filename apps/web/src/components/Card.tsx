import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import { DestructionEffect, rasterizeCard } from "./DestructionEffect";

export type DropZone = "none" | "destroy" | "favorite";

interface DestructionState {
  cardRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  homeCenter: { x: number; y: number };
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return h;
}

interface CardProps {
  id: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  width?: string;
  onDestroy?: (id: string) => void;
  onFavorite?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function Card({
  id,
  title,
  subtitle,
  children,
  width = "220px",
  onDestroy,
  onFavorite,
  className,
  style,
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 预栅格化卡牌纹理，供崩解动画切片成真实碎片
  const textureRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    rasterizeCard(el, hueFromId(id)).then((c) => {
      if (c && !cancelled) textureRef.current = c;
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 3D tilt
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, scale: 1 });
  const [isHovered, setIsHovered] = useState(false);

  // wobble (常驻微弱漂浮)
  const wobbleRef = useRef({ x: 0, y: 0 });
  const [wobble, setWobble] = useState({ x: 0, y: 0 });
  const wobbleRafRef = useRef<number>(0);

  // drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dropZone, setDropZone] = useState<DropZone>("none");
  const dragStartRef = useRef<{
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const dragRef = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const springRafRef = useRef<number>(0);

  // destruction animation state
  const [destruction, setDestruction] = useState<DestructionState | null>(null);

  const ZONE_WIDTH_RATIO = 0.18; // 左右区域各占屏幕宽度的18%

  /* ---------- wobble (常驻漂浮，hover时幅度更大) ---------- */
  useEffect(() => {
    if (isDragging) {
      setWobble({ x: 0, y: 0 });
      return;
    }
    const amplitude = isHovered ? 3.0 : 1.2;
    let start = performance.now();
    const animate = (now: number) => {
      const t = (now - start) / 1000;
      wobbleRef.current = {
        x: Math.sin(t * 2.6) * 1.8 * amplitude +
           Math.sin(t * 4.2) * 0.6 * amplitude,
        y: Math.cos(t * 2.1) * 1.4 * amplitude +
           Math.cos(t * 3.7) * 0.5 * amplitude,
      };
      setWobble({ ...wobbleRef.current });
      wobbleRafRef.current = requestAnimationFrame(animate);
    };
    wobbleRafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(wobbleRafRef.current);
  }, [isHovered, isDragging]);

  /* ---------- 检测卡片中心点所在的目标区域 ---------- */
  const checkDropZone = useCallback((): DropZone => {
    const el = ref.current;
    if (!el) return "none";
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const screenW = window.innerWidth;
    const zoneW = screenW * ZONE_WIDTH_RATIO;
    if (cx < zoneW) return "favorite";
    if (cx > screenW - zoneW) return "destroy";
    return "none";
  }, []);

  /* ---------- window-level drag + spring-back ---------- */
  useEffect(() => {
    if (!isDragging) {
      // spring back to origin
      if (dragRef.current.x === 0 && dragRef.current.y === 0) return;

      const springBack = () => {
        dragRef.current.x *= 0.82;
        dragRef.current.y *= 0.82;
        setDrag({ ...dragRef.current });
        if (
          Math.abs(dragRef.current.x) > 0.5 ||
          Math.abs(dragRef.current.y) > 0.5
        ) {
          springRafRef.current = requestAnimationFrame(springBack);
        } else {
          dragRef.current = { x: 0, y: 0 };
          setDrag({ x: 0, y: 0 });
        }
      };
      springRafRef.current = requestAnimationFrame(springBack);
      return () => cancelAnimationFrame(springRafRef.current);
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      const clientX =
        "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : e.clientY;
      dragRef.current = {
        x: dragStartRef.current.ox + (clientX - dragStartRef.current.sx),
        y: dragStartRef.current.oy + (clientY - dragStartRef.current.sy),
      };
      setDrag({ ...dragRef.current });
      setDropZone(checkDropZone());
    };

    const onEnd = (e: MouseEvent | TouchEvent) => {
      const zone = checkDropZone();
      setIsDragging(false);
      dragStartRef.current = null;
      setDropZone("none");

      if (zone === "destroy" && onDestroy) {
        const el = ref.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          setDestruction({
            cardRect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
            homeCenter: {
              x: rect.left + rect.width / 2 - dragRef.current.x,
              y: rect.top + rect.height / 2 - dragRef.current.y,
            },
          });
        }
        dragRef.current = { x: 0, y: 0 };
        setDrag({ x: 0, y: 0 });
        return;
      }
      if (zone === "favorite" && onFavorite) {
        onFavorite(id);
        dragRef.current = { x: 0, y: 0 };
        setDrag({ x: 0, y: 0 });
        return;
      }

      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const clientX =
          "changedTouches" in e
            ? e.changedTouches[0].clientX
            : e.clientX;
        const clientY =
          "changedTouches" in e
            ? e.changedTouches[0].clientY
            : e.clientY;
        const over =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;
        setIsHovered(over);
        if (!over) {
          setTilt({ rx: 0, ry: 0, scale: 1 });
        }
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      cancelAnimationFrame(springRafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, id, onDestroy, onFavorite, checkDropZone]);

  /* ---------- card-level handlers ---------- */
  const onPointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const clientX =
        "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : e.clientY;

      cancelAnimationFrame(springRafRef.current);

      setIsDragging(true);
      setIsHovered(true);
      dragStartRef.current = {
        sx: clientX,
        sy: clientY,
        ox: dragRef.current.x,
        oy: dragRef.current.y,
      };
    },
    []
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotateX = ((y - cy) / cy) * -20;
      const rotateY = ((x - cx) / cx) * 20;

      setTilt({ rx: rotateX, ry: rotateY, scale: 1.05 });
      setIsHovered(true);
    },
    [isDragging]
  );

  const onMouseLeave = useCallback(() => {
    if (isDragging) return;
    setTilt({ rx: 0, ry: 0, scale: 1 });
    setIsHovered(false);
  }, [isDragging]);

  /* ---------- combined transforms ---------- */
  const totalX = drag.x + wobble.x;
  const totalY = drag.y + wobble.y;

  const cardTransform =
    `translate(${totalX.toFixed(2)}px, ${totalY.toFixed(2)}px) ` +
    `perspective(800px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) ` +
    `scale(${tilt.scale.toFixed(3)})`;

  const shadowTransform =
    `translate(${(totalX * 0.3).toFixed(2)}px, ${(totalY * 0.3 + 18).toFixed(2)}px) ` +
    `scale(0.92)`;

  /* ---------- styles ---------- */
  const wrapperStyle: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    verticalAlign: "top",
    width,
    touchAction: "none",
  };

  const shadowStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "16px",
    background:
      "radial-gradient(ellipse at center, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 70%)",
    transform: shadowTransform,
    transition: "transform 0.15s ease-out, opacity 0.3s ease",
    opacity: isHovered || isDragging ? 1 : 0.55,
    zIndex: 0,
    pointerEvents: "none",
  };

  const cardStyle: CSSProperties = {
    position: "relative",
    zIndex: isDragging ? 100 : 1,
    width: "100%",
    aspectRatio: "2 / 3",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow:
      isHovered || isDragging
        ? "0 28px 56px rgba(0,0,0,0.14)"
        : "0 4px 14px rgba(0,0,0,0.06)",
    transform: cardTransform,
    transition: isDragging
      ? "none"
      : "transform 0.15s ease-out, box-shadow 0.3s ease",
    cursor: isDragging ? "grabbing" : "grab",
    overflow: "hidden",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    willChange: "transform",
    ...style,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.3,
  };

  const subtitleStyle: CSSProperties = {
    margin: 0,
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "#6b7280",
    lineHeight: 1.4,
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    overflow: "auto",
    color: "#374151",
    fontSize: "0.85rem",
    lineHeight: 1.5,
  };

  if (destruction) {
    return (
      <>
        <div style={wrapperStyle} className={className} aria-hidden="true">
          <div
            style={{ width: "100%", aspectRatio: "2 / 3", visibility: "hidden" }}
          />
        </div>
        <DestructionEffect
          cardRect={destruction.cardRect}
          homeCenter={destruction.homeCenter}
          hue={hueFromId(id)}
          texture={textureRef.current}
          onComplete={() => onDestroy?.(id)}
        />
      </>
    );
  }

  return (
    <div style={wrapperStyle} className={className}>
      <div style={shadowStyle} aria-hidden="true" />
      <div
        ref={ref}
        style={cardStyle}
        onMouseDown={onPointerDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={onPointerDown}
      >
        <h2 style={titleStyle}>{title}</h2>
        {subtitle && <h3 style={subtitleStyle}>{subtitle}</h3>}
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
}
