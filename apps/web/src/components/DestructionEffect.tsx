import { useLayoutEffect, useRef } from "react";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface Shard {
  cx0: number;
  cy0: number;
  rot: number;
  rotVel: number;
  verts: Point[];
  img: HTMLCanvasElement | null;
  ox: number;
  oy: number;
  dw: number;
  dh: number;
  fill: string;
}

interface Ash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface DestructionEffectProps {
  cardRect: Rect;
  homeCenter: Point;
  hue: number;
  texture: HTMLCanvasElement | null;
  onComplete: () => void;
}

/* 把卡片 DOM 栅格化成一幅画布纹理，用于切片成真实碎片。
 * SVG 作为 <img> 使用时不会加载外部资源，因此把 <img> 替换为占位色块，
 * 避免跨域资源在 foreignObject 里渲染为空。 */
export async function rasterizeCard(
  el: HTMLElement,
  hue: number
): Promise<HTMLCanvasElement | null> {
  try {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return null;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.transform = "none";
    clone.style.transition = "none";
    clone.style.willChange = "auto";
    clone.style.width = `${w}px`;
    clone.style.height = `${h}px`;
    clone.style.aspectRatio = "auto";
    clone.querySelectorAll("img").forEach((img) => {
      const d = document.createElement("div");
      d.setAttribute(
        "style",
        `width:100%;height:100%;min-height:100%;border-radius:8px;` +
          `background:linear-gradient(135deg,hsl(${hue} 70% 68%),hsl(${hue} 70% 44%));`
      );
      img.replaceWith(d);
    });

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<foreignObject width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box;">` +
      clone.outerHTML +
      `</div></foreignObject></svg>`;

    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg rasterize failed"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    return canvas;
  } catch {
    return null;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tracePolygon(ctx: CanvasRenderingContext2D, verts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();
}

export function DestructionEffect({
  cardRect,
  homeCenter,
  hue,
  texture,
  onComplete,
}: DestructionEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    ctx.scale(dpr, dpr);

    const compHue = (hue + 180) % 360;

    /* 不规则碎片：非均匀切分 + 抖动共享顶点，拼起来仍是完整卡牌 */
    const COLS = 7;
    const ROWS = 9;
    const cw = cardRect.width / COLS;
    const ch = cardRect.height / ROWS;

    const xs: number[] = [0];
    for (let c = 1; c < COLS; c++) {
      xs.push(xs[c - 1] + cw * (0.65 + Math.random() * 0.7));
    }
    xs.push(cardRect.width);

    const ys: number[] = [0];
    for (let r = 1; r < ROWS; r++) {
      ys.push(ys[r - 1] + ch * (0.65 + Math.random() * 0.7));
    }
    ys.push(cardRect.height);

    const verts: Point[][] = [];
    for (let r = 0; r <= ROWS; r++) {
      verts[r] = [];
      for (let c = 0; c <= COLS; c++) {
        const boundary =
          r === 0 || r === ROWS || c === 0 || c === COLS;
        const jx = boundary ? 0 : (Math.random() - 0.5) * 0.4 * cw;
        const jy = boundary ? 0 : (Math.random() - 0.5) * 0.4 * ch;
        verts[r][c] = { x: xs[c] + jx, y: ys[r] + jy };
      }
    }

    const shards: Shard[] = [];
    const PAD = 4;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const quad = [
          verts[r][c],
          verts[r][c + 1],
          verts[r + 1][c + 1],
          verts[r + 1][c],
        ];
        const minX = Math.min(...quad.map((p) => p.x));
        const maxX = Math.max(...quad.map((p) => p.x));
        const minY = Math.min(...quad.map((p) => p.y));
        const maxY = Math.max(...quad.map((p) => p.y));
        const w = maxX - minX;
        const h = maxY - minY;
        const lcx = (minX + maxX) / 2;
        const lcy = (minY + maxY) / 2;
        const local = quad.map((p) => ({ x: p.x - lcx, y: p.y - lcy }));

        let img: HTMLCanvasElement | null = null;
        let ox = 0;
        let oy = 0;
        let dw = 0;
        let dh = 0;
        if (texture) {
          img = document.createElement("canvas");
          img.width = Math.ceil(w + PAD * 2);
          img.height = Math.ceil(h + PAD * 2);
          const sctx = img.getContext("2d");
          if (sctx) {
            sctx.translate(PAD - minX, PAD - minY);
            tracePolygon(sctx, quad);
            sctx.clip();
            sctx.drawImage(texture, 0, 0, cardRect.width, cardRect.height);
          }
          ox = -(PAD + w / 2);
          oy = -(PAD + h / 2);
          dw = img.width;
          dh = img.height;
        }

        const roll = Math.random();
        let fill: string;
        if (roll < 0.14) {
          fill = `hsl(${hue} 72% 62% / 0.92)`;
        } else if (roll < 0.4) {
          fill = `hsl(220 20% ${34 + Math.random() * 14}% / 0.9)`;
        } else {
          fill = `hsl(0 0% ${94 + Math.random() * 5}% / 0.96)`;
        }

        shards.push({
          cx0: cardRect.left + lcx,
          cy0: cardRect.top + lcy,
          rot: (Math.random() - 0.5) * 0.4,
          rotVel: (Math.random() - 0.5) * 2.5,
          verts: local,
          img,
          ox,
          oy,
          dw,
          dh,
          fill,
        });
      }
    }

    /* 灰烬粒子：在牌位原位置飘散 */
    const ASH_COUNT = 28;
    const ash: Ash[] = [];
    for (let i = 0; i < ASH_COUNT; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 30;
      ash.push({
        x: homeCenter.x + (Math.random() - 0.5) * cardRect.width * 0.5,
        y: homeCenter.y + (Math.random() - 0.5) * cardRect.height * 0.5,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 14,
        size: 1 + Math.random() * 2.5,
      });
    }

    /* 时间轴：短暂保持完整 → 塌陷收缩 → 白色奇点 → 灰烬归零 */
    const T_HOLD = 0.12;
    const T_COLLAPSE_END = 0.62;
    const T_SING_START = 0.58;
    const T_SING_END = 0.85;
    const T_ASH_START = 0.6;
    const T_ASH_END = 1.1;
    const TOTAL = 1.15;

    const easeIn = (t: number) => t * t * t;
    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, vw, vh);

      if (t < T_HOLD) {
        /* 阶段一：保持完整卡牌，营造「随即崩解」前的停顿 */
        if (texture) {
          ctx.drawImage(
            texture,
            cardRect.left,
            cardRect.top,
            cardRect.width,
            cardRect.height
          );
        } else {
          ctx.save();
          ctx.shadowColor = `hsla(${hue} 80% 60% / 0.35)`;
          ctx.shadowBlur = 14;
          ctx.fillStyle = "#ffffff";
          roundedRect(
            ctx,
            cardRect.left,
            cardRect.top,
            cardRect.width,
            cardRect.height,
            16
          );
          ctx.fill();
          ctx.restore();
        }
      } else {
        /* 阶段二：碎片向内塌陷收缩 */
        const p = easeIn(
          Math.min(1, (t - T_HOLD) / (T_COLLAPSE_END - T_HOLD))
        );
        for (const s of shards) {
          const cx = s.cx0 + (homeCenter.x - s.cx0) * p;
          const cy = s.cy0 + (homeCenter.y - s.cy0) * p;
          const scale = 1 - p;
          const rot = s.rot + s.rotVel * p;

          ctx.save();
          ctx.globalAlpha = 1 - p * 0.6;
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          ctx.scale(scale, scale);
          ctx.shadowColor = `hsla(${hue} 90% 65% / 0.9)`;
          ctx.shadowBlur = 8;

          if (s.img) {
            ctx.drawImage(s.img, s.ox, s.oy, s.dw, s.dh);
          } else {
            ctx.fillStyle = s.fill;
            tracePolygon(ctx, s.verts);
            ctx.fill();
          }

          ctx.shadowBlur = 0;
          ctx.strokeStyle = `hsla(${hue} 90% 72% / 0.7)`;
          ctx.lineWidth = 0.6;
          tracePolygon(ctx, s.verts);
          ctx.stroke();
          ctx.restore();
        }
      }

      /* 阶段三：白色奇点 */
      if (t >= T_SING_START && t <= T_SING_END) {
        const u = (t - T_SING_START) / (T_SING_END - T_SING_START);
        const r = Math.sin(Math.PI * u) * 6 + 0.5;
        const glow = r * 3;
        const grad = ctx.createRadialGradient(
          homeCenter.x,
          homeCenter.y,
          0,
          homeCenter.x,
          homeCenter.y,
          glow
        );
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.35, "rgba(255,255,255,0.9)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(homeCenter.x, homeCenter.y, glow, 0, Math.PI * 2);
        ctx.fill();
      }

      /* 阶段四：像素化灰烬，补色，约 0.5s 归零 */
      if (t >= T_ASH_START && t <= T_ASH_END) {
        const ap = (t - T_ASH_START) / (T_ASH_END - T_ASH_START);
        for (const a of ash) {
          const x = a.x + a.vx * ap;
          const y = a.y + a.vy * ap;
          const s = a.size * (1 - ap * 0.5);
          ctx.save();
          ctx.globalAlpha = (1 - ap) * 0.9;
          ctx.fillStyle = `hsl(${compHue} 75% 55%)`;
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
          ctx.restore();
        }
      }

      if (t < TOTAL) {
        raf = requestAnimationFrame(draw);
      } else {
        onCompleteRef.current();
      }
    };

    /* 首帧同步绘制，避免卡片移除与碎片绘制之间出现空帧 */
    draw(start);
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cardRect, homeCenter, hue, texture]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    />
  );
}
