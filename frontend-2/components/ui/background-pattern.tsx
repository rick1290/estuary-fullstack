"use client"

import { cn } from "@/lib/utils"
import { SvgPatterns } from "./svg-patterns"

export type PatternType = "wave" | "leaf" | "flow" | "dots" | "grid"
export type PatternPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"

interface BackgroundPatternProps {
  pattern: PatternType
  position?: PatternPosition
  scale?: number
  rotate?: number
  opacity?: number
  color?: string
  className?: string
}

export default function BackgroundPattern({
  pattern = "wave",
  position = "bottom-right",
  scale = 1,
  rotate = 0,
  opacity = 0.05,
  color = "#000000",
  className,
}: BackgroundPatternProps) {
  // Calculate position styles
  const getPositionStyles = () => {
    const styles: Record<string, string> = {}

    if (position.includes("top")) styles.top = "0"
    if (position.includes("bottom")) styles.bottom = "0"
    if (position.includes("left")) styles.left = "0"
    if (position.includes("right")) styles.right = "0"
    if (position === "center") {
      styles.top = "50%"
      styles.left = "50%"
      styles.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`
      return styles
    }

    styles.transform = `scale(${scale}) rotate(${rotate}deg)`
    return styles
  }

  const positionStyles = getPositionStyles()

  return (
    <div
      className={cn("absolute z-0 pointer-events-none", className)}
      style={{
        ...positionStyles,
        opacity,
      }}
    >
      <SvgPatterns pattern={pattern} color={color} />
    </div>
  )
}
