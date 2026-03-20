"use client";

import React, { useCallback, useEffect, useRef } from "react";

export interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  className?: string;
  style?: React.CSSProperties;
}

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 4,
  gap = 24,
  baseColor = "#271E37",
  activeColor = "#5227FF",
  proximity = 120,
  className = "",
  style,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<{ x: number; y: number }[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  const bRgb = hexToRgb(baseColor);
  const aRgb = hexToRgb(activeColor);

  const buildGrid = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    const cell = dotSize + gap;
    const dots: { x: number; y: number }[] = [];
    for (let y = dotSize / 2 + gap / 2; y < height + cell; y += cell) {
      for (let x = dotSize / 2 + gap / 2; x < width + cell; x += cell) {
        dots.push({ x, y });
      }
    }
    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    buildGrid();
    let ro: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(buildGrid);
      if (wrapRef.current) ro.observe(wrapRef.current);
    } else {
      window.addEventListener("resize", buildGrid);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", buildGrid);
    };
  }, [buildGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const proxSq = proximity * proximity;
    let rafId: number;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: px, y: py } = mouseRef.current;

      for (const dot of dotsRef.current) {
        const dx = dot.x - px;
        const dy = dot.y - py;
        const dsq = dx * dx + dy * dy;
        let fillStyle: string;
        if (dsq <= proxSq) {
          const t = 1 - Math.sqrt(dsq) / proximity;
          const r = Math.round(bRgb.r + (aRgb.r - bRgb.r) * t);
          const g = Math.round(bRgb.g + (aRgb.g - bRgb.g) * t);
          const b = Math.round(bRgb.b + (aRgb.b - bRgb.b) * t);
          fillStyle = `rgb(${r},${g},${b})`;
        } else {
          fillStyle = baseColor;
        }
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    };

    draw();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [proximity, baseColor, bRgb, aRgb, dotSize]);

  return (
    <section
      className={className}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", position: "relative", ...style }}
    >
      <div ref={wrapRef} style={{ width: "100%", height: "100%", position: "relative" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      </div>
    </section>
  );
};

export default DotGrid;
