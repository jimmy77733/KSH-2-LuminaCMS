"use client";

import React, { useEffect, useRef } from "react";

export interface LetterGlitchProps {
  glitchColors?: string[];
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  characters?: string;
  className?: string;
}

export const LetterGlitch: React.FC<LetterGlitchProps> = ({
  glitchColors = ["#2b4539", "#61dca3", "#61b3dc"],
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789",
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const letters = useRef<{ char: string; color: string; targetColor: string; colorProgress: number }[]>([]);
  const grid = useRef({ columns: 0, rows: 0 });
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const lastGlitch = useRef(Date.now());

  const fontSize = 16;
  const charW = 10;
  const charH = 20;

  const rndChar = () => characters[Math.floor(Math.random() * characters.length)];
  const rndColor = () => glitchColors[Math.floor(Math.random() * glitchColors.length)];

  function hexToRgb(hex: string) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
      hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => r + r + g + g + b + b),
    );
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
  }

  function lerpColor(s: { r: number; g: number; b: number }, e: { r: number; g: number; b: number }, f: number) {
    return `rgb(${Math.round(s.r + (e.r - s.r) * f)},${Math.round(s.g + (e.g - s.g) * f)},${Math.round(s.b + (e.b - s.b) * f)})`;
  }

  function initLetters(cols: number, rows: number) {
    grid.current = { columns: cols, rows };
    letters.current = Array.from({ length: cols * rows }, () => ({
      char: rndChar(),
      color: rndColor(),
      targetColor: rndColor(),
      colorProgress: 1,
    }));
  }

  function drawLetters() {
    if (!ctx.current || letters.current.length === 0) return;
    const c = ctx.current;
    const { width, height } = canvasRef.current!.getBoundingClientRect();
    c.clearRect(0, 0, width, height);
    c.font = `${fontSize}px monospace`;
    c.textBaseline = "top";
    letters.current.forEach((l, i) => {
      const x = (i % grid.current.columns) * charW;
      const y = Math.floor(i / grid.current.columns) * charH;
      c.fillStyle = l.color;
      c.fillText(l.char, x, y);
    });
  }

  function updateLetters() {
    const count = Math.max(1, Math.floor(letters.current.length * 0.05));
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * letters.current.length);
      if (!letters.current[idx]) continue;
      letters.current[idx].char = rndChar();
      letters.current[idx].targetColor = rndColor();
      if (!smooth) {
        letters.current[idx].color = letters.current[idx].targetColor;
        letters.current[idx].colorProgress = 1;
      } else {
        letters.current[idx].colorProgress = 0;
      }
    }
  }

  function handleSmooth() {
    let needsRedraw = false;
    letters.current.forEach((l) => {
      if (l.colorProgress < 1) {
        l.colorProgress = Math.min(1, l.colorProgress + 0.05);
        const s = hexToRgb(l.color);
        const e = hexToRgb(l.targetColor);
        if (s && e) {
          l.color = lerpColor(s, e, l.colorProgress);
          needsRedraw = true;
        }
      }
    });
    if (needsRedraw) drawLetters();
  }

  function animate() {
    const now = Date.now();
    if (now - lastGlitch.current >= glitchSpeed) {
      updateLetters();
      drawLetters();
      lastGlitch.current = now;
    }
    if (smooth) handleSmooth();
    animRef.current = requestAnimationFrame(animate);
  }

  function resize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    if (ctx.current) ctx.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.ceil(rect.width / charW);
    const rows = Math.ceil(rect.height / charH);
    initLetters(cols, rows);
    drawLetters();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctx.current = canvas.getContext("2d");
    resize();
    animate();

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        resize();
        animate();
      }, 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glitchSpeed, smooth]);

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#000", overflow: "hidden" }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {outerVignette && (
        <div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)",
          }}
        />
      )}
      {centerVignette && (
        <div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
      )}
    </div>
  );
};

export default LetterGlitch;
