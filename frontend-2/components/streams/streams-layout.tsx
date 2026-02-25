"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Filter, Users } from "lucide-react"
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
    if (pathname === "/streams/following") return "following"
    return "foryou"
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
      foryou: "/streams",
      following: "/streams/following",
    }
    router.push(routes[value])
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header Section */}
      <div className="border-b border-sage-200/60 bg-white">
        <div className="container max-w-7xl py-16">
          <div className="text-center mb-8">
            <span className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-4 block">Community Content</span>
            <h1 className="font-serif text-4xl md:text-5xl font-light text-olive-900 mb-4">{title}</h1>
            {description && (
              <p className="text-lg font-light text-olive-600 max-w-2xl mx-auto mb-8 leading-relaxed">{description}</p>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="max-w-md mx-auto mb-8">
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
              <TabsList className="inline-flex w-full gap-1 bg-transparent p-0 justify-center">
                <TabsTrigger value="foryou" className="flex-1 flex items-center justify-center gap-2 rounded-full border border-sage-200/60 bg-cream-50 px-4 py-2 text-sm font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800">
                  For You
                </TabsTrigger>
                <TabsTrigger value="following" className="flex-1 flex items-center justify-center gap-2 rounded-full border border-sage-200/60 bg-cream-50 px-4 py-2 text-sm font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800">
                  <Users className="h-4 w-4" strokeWidth="1.5" />
                  Following
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto flex items-center overflow-hidden rounded-full bg-white border border-sage-200/60"
          >
            <Input
              className="flex-1 border-0 bg-transparent px-6 py-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-olive-800 placeholder:text-olive-500"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="lg" className="m-1.5 bg-olive-800 hover:bg-olive-700 rounded-full">
              <Search className="h-5 w-5 mr-2" strokeWidth="1.5" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-7xl py-8 relative">
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

        {/* Three Column Layout */}
        <div className="flex gap-8 relative z-10">
          {/* Left Sidebar - Filters */}
          {sidebar && (
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-6 bg-white rounded-2xl p-6 border border-sage-200/60">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>

          {/* Right Sidebar - Featured */}
          {rightSidebar && (
            <aside className="hidden xl:block w-[300px] shrink-0">
              <div className="sticky top-6 bg-white rounded-2xl p-6 border border-sage-200/60">
                {rightSidebar}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}