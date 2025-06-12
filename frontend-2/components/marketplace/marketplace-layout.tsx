"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Search, Filter } from "lucide-react"
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
      {/* Header Section - Clean and minimal */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-warm-50 to-white pt-12 pb-16">
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

        <div className="container mx-auto px-4">
          <h1 className="relative z-10 mb-4 text-center text-4xl md:text-5xl font-medium tracking-tight">{title}</h1>

          {description && (
            <p className="relative z-10 mx-auto mb-8 max-w-2xl text-center text-lg text-gray-600">
              {description}
            </p>
          )}

          {/* Service Type Toggle Navigation - Clean tabs */}
          <div className="relative z-10 mx-auto mb-8 max-w-3xl">
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full bg-gray-100 p-1">
                <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  All Services
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Courses
                </TabsTrigger>
                <TabsTrigger value="workshops" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Workshops
                </TabsTrigger>
                <TabsTrigger value="sessions" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Sessions
                </TabsTrigger>
                <TabsTrigger value="practitioners" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Practitioners
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar - Clean minimal design */}
          <form
            onSubmit={handleSearch}
            className="relative z-10 mx-auto flex max-w-2xl translate-y-1/2 items-center overflow-hidden rounded-xl bg-white shadow-lg border border-gray-100"
          >
            <Input
              className="flex-1 border-0 bg-transparent px-6 py-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="lg" className="m-2">
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto mt-16 px-4 pb-16">
        {/* Mobile Filters Toggle Button */}
        {sidebar && (
          <div className="mb-6 lg:hidden">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full" size="default">
                  <Filter className="mr-2 h-4 w-4" />
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
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          {sidebar && <aside className="hidden w-[280px] shrink-0 lg:block">{sidebar}</aside>}

          {/* Main Content */}
          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </div>
  )
}
