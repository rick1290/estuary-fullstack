"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Filter, TrendingUp, Clock, Users, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

interface StreamsLayoutProps {
  children: ReactNode
  title: string
  description?: string
  searchPlaceholder?: string
  initialSearchQuery?: string
  sidebar?: ReactNode
  rightSidebar?: ReactNode
}

export default function StreamsLayout({
  children,
  title,
  description,
  searchPlaceholder = "Search streams, practitioners, or topics...",
  initialSearchQuery = "",
  sidebar,
  rightSidebar,
}: StreamsLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileRightSidebarOpen, setMobileRightSidebarOpen] = useState(false)

  // Determine which tab is active based on the current path
  const getActiveTab = () => {
    if (pathname === "/streams") return "all"
    if (pathname === "/streams/following") return "following"
    if (pathname === "/streams/trending") return "trending"
    if (pathname === "/streams/recent") return "recent"
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
      all: "/streams",
      following: "/streams/following",
      trending: "/streams/trending",
      recent: "/streams/recent",
    }
    router.push(routes[value])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white">
      {/* Header Section - Immersive and warm */}
      <div className="bg-gradient-to-br from-sage-100 via-terracotta-100 to-blush-100 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 texture-grain opacity-10" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-terracotta-200/30 rounded-full blur-3xl" />
        
        <div className="container max-w-7xl py-16 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
              <Sparkles className="h-4 w-4 text-blush-600" strokeWidth="1.5" />
              <span className="text-sm text-olive-700 font-medium">Community Content</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-olive-900 mb-4">{title}</h1>
            {description && (
              <p className="text-lg text-olive-600 max-w-2xl mx-auto mb-8 leading-relaxed">{description}</p>
            )}
          </div>

          {/* Tabs Navigation - Warm design */}
          <div className="max-w-2xl mx-auto mb-8">
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-lg border border-sage-200">
                <TabsTrigger value="all" className="flex-1 flex items-center gap-2 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  <span className="hidden sm:inline">All</span> Streams
                </TabsTrigger>
                <TabsTrigger value="following" className="flex-1 flex items-center gap-2 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  <Users className="h-4 w-4" strokeWidth="1.5" />
                  <span className="hidden sm:inline">Following</span>
                </TabsTrigger>
                <TabsTrigger value="trending" className="flex-1 flex items-center gap-2 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  <TrendingUp className="h-4 w-4" strokeWidth="1.5" />
                  <span className="hidden sm:inline">Trending</span>
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex-1 flex items-center gap-2 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl">
                  <Clock className="h-4 w-4" strokeWidth="1.5" />
                  <span className="hidden sm:inline">Recent</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar - Immersive design */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto flex items-center overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-sage-200"
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
      <div className="container max-w-7xl py-8 relative">
        {/* Subtle background texture */}
        <div className="absolute inset-0 texture-grain opacity-5" />
        {/* Mobile Filter/Featured Buttons */}
        <div className="flex gap-3 mb-6 lg:hidden relative z-10">
          {sidebar && (
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 border-sage-300 text-sage-700 hover:bg-sage-50">
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
          )}

          {rightSidebar && (
            <Sheet open={mobileRightSidebarOpen} onOpenChange={setMobileRightSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 border-sage-300 text-sage-700 hover:bg-sage-50">
                  <Users className="mr-2 h-4 w-4" strokeWidth="1.5" />
                  Featured
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] max-w-[350px] p-6">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-xl">Featured</SheetTitle>
                </SheetHeader>
                <Separator className="mb-6" />
                {rightSidebar}
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Three Column Layout with generous spacing */}
        <div className="flex gap-8 relative z-10">
          {/* Left Sidebar - Filters */}
          {sidebar && (
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-sage-200">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>

          {/* Right Sidebar - Featured */}
          {rightSidebar && (
            <aside className="hidden xl:block w-[300px] shrink-0">
              <div className="sticky top-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-sage-200">
                {rightSidebar}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}