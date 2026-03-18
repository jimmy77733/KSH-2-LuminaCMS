"use client"

/**
 * MorphingText — 液態變形文字組件
 *
 * 特效原理：
 *  1. SVG feColorMatrix「閾值濾鏡」(filter id="threshold")
 *       values="... 0 0 0 255 -140" → 將 alpha 通道做高對比拉伸，
 *       讓半透明的模糊邊緣在閾值以下直接消失，製造「液態溶解」感。
 *  2. CSS filter: url(#threshold) blur(0.6px)
 *       套用在容器上，先模糊整體再過閾值，讓兩段文字交疊時看起來像液態融合。
 *  3. requestAnimationFrame 動畫（JS）
 *       兩個互相疊加的 <span>，透過 JS 控制各自的 opacity 與 filter:blur()，
 *       交互淡入淡出，搭配閾值濾鏡即產生「變形字體」效果。
 *  4. 靜態 HTML 輸出（無 JS）
 *       craftToHtml.ts 改用多個 <span> + CSS @keyframes + 同款 SVG filter，
 *       每個 <span> 依序淡入/淡出，達成零 JS 的動態效果。
 */

import React, { useCallback, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

const morphTime = 1.5
const cooldownTime = 0.5

const useMorphingText = (texts: string[]) => {
  const textIndexRef = useRef(0)
  const morphRef = useRef(0)
  const cooldownRef = useRef(0)
  const timeRef = useRef(new Date())

  const text1Ref = useRef<HTMLSpanElement>(null)
  const text2Ref = useRef<HTMLSpanElement>(null)

  const setStyles = useCallback(
    (fraction: number) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current]
      if (!current1 || !current2) return

      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`

      const invertedFraction = 1 - fraction
      current1.style.filter = `blur(${Math.min(
        8 / invertedFraction - 8,
        100
      )}px)`
      current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`

      current1.textContent = texts[textIndexRef.current % texts.length]
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length]
    },
    [texts]
  )

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current
    cooldownRef.current = 0

    let fraction = morphRef.current / morphTime

    if (fraction > 1) {
      cooldownRef.current = cooldownTime
      fraction = 1
    }

    setStyles(fraction)

    if (fraction === 1) {
      textIndexRef.current++
    }
  }, [setStyles])

  const doCooldown = useCallback(() => {
    morphRef.current = 0
    const [current1, current2] = [text1Ref.current, text2Ref.current]
    if (current1 && current2) {
      current2.style.filter = "none"
      current2.style.opacity = "100%"
      current1.style.filter = "none"
      current1.style.opacity = "0%"
    }
  }, [])

  useEffect(() => {
    let animationFrameId: number

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const newTime = new Date()
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000
      timeRef.current = newTime

      cooldownRef.current -= dt

      if (cooldownRef.current <= 0) doMorph()
      else doCooldown()
    }

    animate()
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [doMorph, doCooldown])

  return { text1Ref, text2Ref }
}

interface MorphingTextProps {
  className?: string
  texts: string[]
  /** 自訂字體大小（px），未傳時使用 Tailwind 預設 40pt/6rem */
  fontSize?: number
  /** 自訂文字顏色 */
  color?: string
}

const Texts: React.FC<Pick<MorphingTextProps, "texts">> = ({ texts }) => {
  const { text1Ref, text2Ref } = useMorphingText(texts)
  return (
    <>
      <span
        className="absolute inset-x-0 top-0 m-auto inline-block w-full"
        ref={text1Ref}
      />
      <span
        className="absolute inset-x-0 top-0 m-auto inline-block w-full"
        ref={text2Ref}
      />
    </>
  )
}

const SvgFilters: React.FC = () => (
  <svg
    id="filters"
    className="fixed h-0 w-0"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <filter id="threshold">
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 255 -140"
        />
      </filter>
    </defs>
  </svg>
)

export const MorphingText: React.FC<MorphingTextProps> = ({
  texts,
  className,
  fontSize,
  color,
}) => (
  <div
    className={cn(
      "relative mx-auto w-full text-center font-sans leading-none font-bold filter-[url(#threshold)_blur(0.6px)]",
      fontSize ? "" : "h-16 text-[40pt] md:h-24 lg:text-[6rem]",
      className
    )}
    style={
      fontSize
        ? { fontSize: `${fontSize}px`, color: color, height: `${Math.round(fontSize * 1.5)}px` }
        : color
          ? { color }
          : undefined
    }
  >
    <Texts texts={texts} />
    <SvgFilters />
  </div>
)
