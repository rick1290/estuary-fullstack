"use client"
import Link from "next/link"
import Image from "next/image"
import { SearchIcon, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import BackgroundPattern from "@/components/ui/background-pattern"

// Trending topics
const TRENDING_TOPICS = [
  "Meditation",
  "Mental Health",
  "Nutrition",
  "Sound Healing",
  "Yoga",
  "Mindfulness",
  "Life Coaching",
  "Breathwork",
]

export default function HeroSection() {
  return (
    <div className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden bg-white">
      {/* Clean minimalist background inspired by Superfluent/Octave */}
      <div className="absolute inset-0 bg-gradient-to-b from-warm-100/50 to-white z-0">
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]">
          <BackgroundPattern pattern="flow" position="center" scale={1.5} rotate={0} opacity={0.02} color="#000000" />
        </div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 md:px-6 py-16 md:py-24 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium mb-6 tracking-tight leading-tight">
          Find Your Path
          <br />
          to Wellness and Growth
        </h1>

        <p className="mb-10 mx-auto max-w-2xl text-lg md:text-xl text-gray-600 leading-relaxed">
          Discover expert practitioners, transformative courses, and immersive workshops—all in one place. Your journey
          to well-being starts here.
        </p>

        {/* Search Bar - Clean and minimal */}
        <div className="p-2 mx-auto max-w-2xl rounded-xl bg-white shadow-lg mb-8 border border-gray-100">
          <div className="flex items-center">
            <div className="flex items-center pl-4">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
              placeholder="Search for practitioners, courses, or topics..."
            />
            <Button className="mr-2" size="lg">Search</Button>
          </div>
        </div>

        {/* Trending Topics - Minimal pills */}
        <div className="mb-12">
          <p className="mb-4 text-sm text-gray-500 font-medium uppercase tracking-wide">Trending Topics</p>
          <div className="flex flex-wrap justify-center gap-3">
            {TRENDING_TOPICS.map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="text-gray-700 bg-gray-100 hover:bg-gray-200 border-0 px-4 py-2 text-sm font-normal"
                asChild
              >
                <Link href={`/marketplace?topic=${topic}`}>{topic}</Link>
              </Badge>
            ))}
          </div>
        </div>

        {/* Scroll Down Indicator - Minimal */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Scroll down"
            onClick={() =>
              window.scrollTo({
                top: window.innerHeight,
                behavior: "smooth",
              })
            }
          >
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </Button>
        </div>
      </div>
    </div>
  )
}
