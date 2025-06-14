"use client"

import type { PatternType } from "./background-pattern"

interface SvgPatternsProps {
  pattern: PatternType
  color?: string
}

export function SvgPatterns({ pattern, color = "#000000" }: SvgPatternsProps) {
  switch (pattern) {
    case "wave":
      return (
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80C40 53.3333 120 0 200 0C280 0 360 53.3333 400 80V400H0V80Z" fill={color} fillOpacity="0.05" />
          <path
            d="M0 160C40 133.333 120 80 200 80C280 80 360 133.333 400 160V400H0V160Z"
            fill={color}
            fillOpacity="0.05"
          />
          <path
            d="M0 240C40 213.333 120 160 200 160C280 160 360 213.333 400 240V400H0V240Z"
            fill={color}
            fillOpacity="0.05"
          />
          <path
            d="M0 320C40 293.333 120 240 200 240C280 240 360 293.333 400 320V400H0V320Z"
            fill={color}
            fillOpacity="0.05"
          />
        </svg>
      )
    case "leaf":
      return (
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M399 1C399 220.6 220.6 399 1 399C1 179.4 179.4 1 399 1Z" stroke={color} strokeOpacity="0.2" />
          <path d="M349 51C349 193.6 193.6 349 51 349C51 206.4 206.4 51 349 51Z" stroke={color} strokeOpacity="0.2" />
          <path
            d="M299 101C299 166.6 166.6 299 101 299C101 233.4 233.4 101 299 101Z"
            stroke={color}
            strokeOpacity="0.2"
          />
          <path
            d="M249 151C249 139.6 139.6 249 151 249C151 260.4 260.4 151 249 151Z"
            stroke={color}
            strokeOpacity="0.2"
          />
        </svg>
      )
    case "flow":
      return (
        <svg width="400" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 100C50 150 100 150 150 100C200 50 250 50 300 100C350 150 400 150 450 100"
            stroke={color}
            strokeOpacity="0.2"
            strokeWidth="2"
          />
          <path
            d="M0 50C50 100 100 100 150 50C200 0 250 0 300 50C350 100 400 100 450 50"
            stroke={color}
            strokeOpacity="0.2"
            strokeWidth="2"
          />
          <path
            d="M0 150C50 200 100 200 150 150C200 100 250 100 300 150C350 200 400 200 450 150"
            stroke={color}
            strokeOpacity="0.2"
            strokeWidth="2"
          />
        </svg>
      )
    case "dots":
      return (
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 10 }).map((_, rowIndex) =>
            Array.from({ length: 10 }).map((_, colIndex) => (
              <circle
                key={`${rowIndex}-${colIndex}`}
                cx={20 + colIndex * 40}
                cy={20 + rowIndex * 40}
                r={4}
                fill={color}
                fillOpacity="0.2"
              />
            )),
          )}
        </svg>
      )
    case "grid":
      return (
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 10 }).map((_, index) => (
            <line
              key={`h-${index}`}
              x1="0"
              y1={40 * index}
              x2="400"
              y2={40 * index}
              stroke={color}
              strokeOpacity="0.1"
            />
          ))}
          {Array.from({ length: 10 }).map((_, index) => (
            <line
              key={`v-${index}`}
              x1={40 * index}
              y1="0"
              x2={40 * index}
              y2="400"
              stroke={color}
              strokeOpacity="0.1"
            />
          ))}
        </svg>
      )
    default:
      return null
  }
}
