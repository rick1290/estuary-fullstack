"use client"
import Link from "next/link"
import { SearchIcon, ChevronDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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
    <div className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden">
      {/* Immersive gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sage-50 via-cream-100 to-terracotta-50/30">
        {/* Texture overlay */}
        <div className="absolute inset-0 texture-grain opacity-20" />
        
        {/* Decorative blobs */}
        <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-terracotta-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-sage-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blush-200/20 rounded-full blur-3xl" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 md:px-6 py-16 md:py-24 max-w-5xl mx-auto animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-8 shadow-sm">
          <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
          <span className="text-sm text-olive-700 font-medium">Your Wellness Journey Starts Here</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium mb-6 tracking-tight leading-tight text-olive-900">
          Find Your Path
          <br />
          <span className="text-gradient bg-gradient-to-r from-sage-600 to-terracotta-600 bg-clip-text text-transparent">
            to Wellness & Growth
          </span>
        </h1>

        <p className="mb-10 mx-auto max-w-2xl text-lg md:text-xl text-olive-700 leading-relaxed animate-slide-up" style={{animationDelay: '0.2s'}}>
          Discover expert practitioners, transformative courses, and immersive workshops—all in one sacred space. Your journey
          to well-being begins with a single step.
        </p>

        {/* Search Bar - Immersive style */}
        <div className="p-3 mx-auto max-w-2xl rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl mb-8 border border-sage-200 animate-slide-up" style={{animationDelay: '0.4s'}}>
          <div className="flex items-center">
            <div className="flex items-center pl-4">
              <SearchIcon className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
            </div>
            <Input
              className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-olive-800 placeholder:text-olive-400/70"
              placeholder="Search for practitioners, courses, or wellness topics..."
            />
            <Button className="mr-1 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg" size="lg">
              Begin Journey
            </Button>
          </div>
        </div>

        {/* Trending Topics - Warm, inviting style */}
        <div className="mb-12 animate-fade-in" style={{animationDelay: '0.6s'}}>
          <p className="mb-5 text-sm text-olive-600 font-medium">Popular Transformations</p>
          <div className="flex flex-wrap justify-center gap-3">
            {TRENDING_TOPICS.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="text-olive-700 bg-sage-50 hover:bg-sage-100 border-sage-300 hover:border-sage-400 px-5 py-2.5 text-sm font-medium transition-all hover:shadow-md"
                asChild
              >
                <Link href={`/marketplace?topic=${topic}`}>{topic}</Link>
              </Badge>
            ))}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 text-sm text-olive-600 animate-fade-in" style={{animationDelay: '0.8s'}}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-sage-500 rounded-full" />
            <span>10,000+ Transformations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-terracotta-500 rounded-full" />
            <span>500+ Expert Practitioners</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blush-500 rounded-full" />
            <span>Trusted Since 2020</span>
          </div>
        </div>

        {/* Scroll Down Indicator - Organic style */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in"
          style={{animationDelay: '1s'}}
        >
          <Button
            variant="ghost"
            size="icon"
            className="text-olive-400 hover:text-olive-600 transition-colors rounded-full"
            aria-label="Scroll down"
            onClick={() =>
              window.scrollTo({
                top: window.innerHeight,
                behavior: "smooth",
              })
            }
          >
            <ChevronDown className="h-6 w-6 animate-bounce" strokeWidth="1.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}