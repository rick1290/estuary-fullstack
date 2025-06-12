"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Search, Filter, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import BackgroundPattern, { type PatternType } from "@/components/ui/background-pattern"

interface MarketplaceLayoutProps {
  children: ReactNode
  title: string
  description?: string
  searchPlaceholder?: string
  initialSearchQuery?: string
  sidebar?: ReactNode
  patternType?: PatternType
}

export default function MarketplaceLayout({
  children,
  title,
  description,
  searchPlaceholder = "Search for services, practitioners, or keywords...",
  initialSearchQuery = "",
  sidebar,
  patternType = "wave",
}: MarketplaceLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Determine which tab is active based on the current path
  const getActiveTab = () => {
    if (pathname === "/marketplace") return "all"
    if (pathname === "/marketplace/courses") return "courses"
    if (pathname === "/marketplace/workshops") return "workshops"
    if (pathname === "/marketplace/sessions") return "sessions"
    if (pathname === "/marketplace/practitioners") return "practitioners"
    return "all"
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    // Get the base path without query parameters
    const basePath = pathname.split("?")[0]
    router.push(`${basePath}?q=${encodeURIComponent(searchQuery)}`)
  }

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      all: "/marketplace",
      courses: "/marketplace/courses",
      workshops: "/marketplace/workshops",
      sessions: "/marketplace/sessions",
      practitioners: "/marketplace/practitioners",
    }
    router.push(routes[value])
  }

  // Configure pattern based on page type
  const getPatternConfig = () => {
    if (pathname.includes("/courses")) {
      return {
        type: "leaf" as PatternType,
        position: "top-right",
        scale: 0.9,
        rotate: 0,
        opacity: 0.04,
      }
    } else if (pathname.includes("/workshops")) {
      return {
        type: "flow" as PatternType,
        position: "bottom",
        scale: 1.2,
        rotate: 0,
        opacity: 0.04,
      }
    } else if (pathname.includes("/sessions")) {
      return {
        type: "wave" as PatternType,
        position: "bottom-left",
        scale: 0.8,
        rotate: 0,
        opacity: 0.04,
      }
    } else if (pathname.includes("/practitioners")) {
      return {
        type: "leaf" as PatternType,
        position: "top-left",
        scale: 0.7,
        rotate: 15,
        opacity: 0.04,
      }
    } else {
      // Default for main marketplace page
      return {
        type: patternType,
        position: "bottom-right",
        scale: 1,
        rotate: 0,
        opacity: 0.04,
      }
    }
  }

  const patternConfig = getPatternConfig()

  return (
    <div className="w-full pb-8">
      {/* Header Section - Immersive and warm */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-sage-100 via-terracotta-100 to-blush-100 pt-16 pb-32">
        {/* Decorative elements */}
        <div className="absolute inset-0 texture-grain opacity-10" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-terracotta-200/30 rounded-full blur-3xl" />
        
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]">
          <BackgroundPattern
            pattern={patternConfig.type}
            position={patternConfig.position as any}
            scale={patternConfig.scale}
            rotate={patternConfig.rotate}
            opacity={0.02}
            color="#000000"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
              <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
              <span className="text-sm text-olive-700 font-medium">Wellness Services</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-olive-900 mb-4">{title}</h1>
            {description && (
              <p className="mx-auto max-w-2xl text-lg text-olive-600 leading-relaxed mb-8">
                {description}
              </p>
            )}
          </div>

          {/* Service Type Toggle Navigation - Warm design */}
          <div className="mx-auto mb-8 max-w-3xl">
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-lg border border-sage-200">
                <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  All Services
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex-1 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  Courses
                </TabsTrigger>
                <TabsTrigger value="workshops" className="flex-1 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  Workshops
                </TabsTrigger>
                <TabsTrigger value="sessions" className="flex-1 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  Sessions
                </TabsTrigger>
                <TabsTrigger value="practitioners" className="flex-1 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  Practitioners
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar - Immersive design overlapping the gradient */}
          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-2xl relative z-20 translate-y-12 items-center overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-sage-200"
          >
            <Input
              className="flex-1 border-0 bg-transparent px-6 py-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-olive-800 placeholder:text-olive-500"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="lg" className="m-2 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 rounded-xl">
              <Search className="h-5 w-5 mr-2" strokeWidth="1.5" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto mt-8 px-4 pb-16 relative bg-gradient-to-b from-cream-50 to-white">
        {/* Subtle background texture */}
        <div className="absolute inset-0 texture-grain opacity-5" />
        
        {/* Mobile Filters Toggle Button */}
        {sidebar && (
          <div className="mb-6 lg:hidden relative z-10">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full border-sage-300 text-sage-700 hover:bg-sage-50" size="default">
                  <Filter className="mr-2 h-4 w-4" strokeWidth="1.5" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-[350px] p-6">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-xl">Filters</SheetTitle>
                </SheetHeader>
                <Separator className="mb-6" />
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Main Content Area with generous spacing */}
        <div className="flex gap-8 relative z-10">
          {/* Desktop Sidebar */}
          {sidebar && (
            <aside className="hidden w-[280px] shrink-0 lg:block">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-sage-200 sticky top-6">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </div>
  )
}
