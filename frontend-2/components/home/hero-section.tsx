"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { SearchIcon, ChevronDown, Sparkles, Users, Star, TrendingUp } from "lucide-react"
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

// Animated stats
const STATS = [
  { icon: Users, value: 10247, label: "Transformations", suffix: "+" },
  { icon: Star, value: 4.9, label: "Average Rating", suffix: "" },
  { icon: TrendingUp, value: 523, label: "Active Practitioners", suffix: "" },
]

export default function HeroSection() {
  const [searchPlaceholder, setSearchPlaceholder] = useState(0)
  const [animatedValues, setAnimatedValues] = useState(STATS.map(() => 0))
  
  const placeholders = [
    "Search for meditation coaches...",
    "Find yoga instructors near you...",
    "Discover mindfulness experts...",
    "Browse wellness workshops...",
  ]

  // Rotate search placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setSearchPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Animate stats on mount
  useEffect(() => {
    const timers = STATS.map((stat, index) => {
      const increment = stat.value / 50
      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= stat.value) {
          current = stat.value
          clearInterval(timer)
        }
        setAnimatedValues(prev => {
          const newValues = [...prev]
          newValues[index] = current
          return newValues
        })
      }, 30)
      
      return timer
    })

    return () => timers.forEach(clearInterval)
  }, [])

  return (
    <div className="relative flex min-h-[90vh] w-full overflow-hidden">
      {/* Background gradients - adjusted for split layout */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage-50 via-cream-50 to-terracotta-50/30">
        <div className="absolute inset-0 texture-grain opacity-20" />
        <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-terracotta-200/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-sage-200/30 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}} />
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10 w-full">
        <div className="container max-w-7xl px-4 md:px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-8 shadow-sm">
                <Sparkles className="h-4 w-4 text-terracotta-600 animate-sparkle" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Your Wellness Journey Starts Here</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-6xl font-medium mb-6 tracking-tight leading-tight text-olive-900">
                Find Your Path
                <br />
                <span className="text-gradient bg-gradient-to-r from-sage-600 to-terracotta-600 bg-clip-text text-transparent">
                  to Wellness & Growth
                </span>
              </h1>

              <p className="mb-10 text-lg md:text-xl text-olive-700 leading-relaxed animate-slide-up" style={{animationDelay: '0.2s'}}>
                Connect with expert practitioners, join transformative workshops, and discover your potential—all in one sacred space.
              </p>

              {/* Search Bar */}
              <div className="p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl mb-8 border border-sage-200 animate-slide-up hover:shadow-2xl transition-shadow" style={{animationDelay: '0.4s'}}>
                <div className="flex items-center">
                  <div className="flex items-center pl-4">
                    <SearchIcon className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                  </div>
                  <Input
                    className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-olive-800 placeholder:text-olive-400/70 transition-all"
                    placeholder={placeholders[searchPlaceholder]}
                  />
                  <Button className="mr-1 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg hover:shadow-xl transition-all" size="lg">
                    Begin Journey
                  </Button>
                </div>
              </div>

              {/* Trending Topics */}
              <div className="mb-12 animate-fade-in" style={{animationDelay: '0.6s'}}>
                <p className="mb-5 text-sm text-olive-600 font-medium">Popular Transformations</p>
                <div className="flex flex-wrap gap-3">
                  {TRENDING_TOPICS.map((topic, index) => (
                    <Badge
                      key={topic}
                      variant="outline"
                      className="text-olive-700 bg-sage-50 hover:bg-sage-100 border-sage-300 hover:border-sage-400 px-5 py-2.5 text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer animate-fade-in"
                      style={{animationDelay: `${0.6 + index * 0.05}s`}}
                      asChild
                    >
                      <Link href={`/marketplace?topic=${topic}`}>{topic}</Link>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Animated Trust Indicators */}
              <div className="flex flex-wrap gap-8 text-sm animate-fade-in" style={{animationDelay: '0.8s'}}>
                {STATS.map((stat, index) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5 text-sage-700" strokeWidth="1.5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-olive-900">
                          {index === 1 ? animatedValues[index].toFixed(1) : Math.floor(animatedValues[index])}
                          {stat.suffix}
                        </p>
                        <p className="text-xs text-olive-600">{stat.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="relative animate-fade-in lg:block hidden" style={{animationDelay: '0.4s'}}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&h=600&fit=crop"
                  alt="Wellness practitioners in a serene yoga session"
                  className="w-full h-[600px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-olive-900/20 to-transparent" />
                
                {/* Floating info cards */}
                <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg animate-float">
                  <p className="text-sm font-medium text-olive-900">Live Session</p>
                  <p className="text-xs text-olive-600">Mindfulness with Dr. Sarah</p>
                </div>
                
                <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg animate-float" style={{animationDelay: '1s'}}>
                  <p className="text-sm font-medium text-olive-900">Next Workshop</p>
                  <p className="text-xs text-olive-600">Sound Healing Journey - 3pm</p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-terracotta-200/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-sage-200/30 rounded-full blur-2xl" />
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator */}
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