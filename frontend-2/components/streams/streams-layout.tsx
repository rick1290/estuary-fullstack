"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Filter, TrendingUp, Clock, Users } from "lucide-react"
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
    <div className="min-h-screen bg-white">
      {/* Header Section - Clean and minimal */}
      <div className="bg-gradient-to-b from-warm-50 to-white">
        <div className="container max-w-7xl py-12">
          <h1 className="text-center text-4xl md:text-5xl font-medium tracking-tight mb-4">{title}</h1>
          {description && (
            <p className="text-center text-lg text-gray-600 max-w-2xl mx-auto mb-8">{description}</p>
          )}

          {/* Tabs Navigation - Clean design */}
          <div className="max-w-2xl mx-auto mb-8">
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full bg-gray-100 p-1">
                <TabsTrigger value="all" className="flex-1 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <span className="hidden sm:inline">All</span> Streams
                </TabsTrigger>
                <TabsTrigger value="following" className="flex-1 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Following</span>
                </TabsTrigger>
                <TabsTrigger value="trending" className="flex-1 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Trending</span>
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex-1 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Recent</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar - Clean minimal design */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto flex items-center overflow-hidden rounded-xl bg-white shadow-lg border border-gray-100"
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
      <div className="container max-w-7xl py-8">
        {/* Mobile Filter/Featured Buttons */}
        <div className="flex gap-3 mb-6 lg:hidden">
          {sidebar && (
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1">
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
          )}

          {rightSidebar && (
            <Sheet open={mobileRightSidebarOpen} onOpenChange={setMobileRightSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Users className="mr-2 h-4 w-4" />
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
        <div className="flex gap-8">
          {/* Left Sidebar - Filters */}
          {sidebar && (
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-6">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>

          {/* Right Sidebar - Featured */}
          {rightSidebar && (
            <aside className="hidden xl:block w-[300px] shrink-0">
              <div className="sticky top-6">
                {rightSidebar}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}