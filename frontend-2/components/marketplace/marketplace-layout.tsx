"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import type { PatternType } from "@/components/ui/background-pattern"

interface MarketplaceLayoutProps {
  children: ReactNode
  title: ReactNode
  description?: string
  eyebrow?: string
  searchPlaceholder?: string
  initialSearchQuery?: string
  sidebar?: ReactNode
  patternType?: PatternType
}

export default function MarketplaceLayout({
  children,
  title,
  description,
  eyebrow = "Wellness Services",
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

  return (
    <div className="w-full bg-cream-50 pb-8">
      {/* Header Section */}
      <div className="w-full pt-10 sm:pt-16 pb-16 sm:pb-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-8">
            <span className="block text-[10px] sm:text-xs font-medium tracking-wide sm:tracking-widest uppercase text-sage-600 mb-3 sm:mb-4">
              {eyebrow}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-olive-900 mb-3 sm:mb-4">
              {title}
            </h1>
            {description && (
              <p className="mx-auto max-w-2xl text-sm sm:text-base font-light text-olive-600 leading-relaxed mb-6 sm:mb-8">
                {description}
              </p>
            )}
          </div>

          {/* Service Type Toggle Navigation */}
          <div className="mx-auto mb-6 sm:mb-8 max-w-3xl">
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
              <TabsList
                className="w-full bg-white p-1 rounded-2xl border border-sage-200/60 flex overflow-x-auto no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as any}
              >
                <TabsTrigger value="all" className="flex-1 flex-shrink-0 min-w-0 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-[11px] sm:text-sm px-1.5 sm:px-4">
                  All
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex-1 flex-shrink-0 min-w-0 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-[11px] sm:text-sm px-1.5 sm:px-4">
                  Courses
                </TabsTrigger>
                <TabsTrigger value="workshops" className="flex-1 flex-shrink-0 min-w-0 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-[11px] sm:text-sm px-1.5 sm:px-4">
                  Workshops
                </TabsTrigger>
                <TabsTrigger value="sessions" className="flex-1 flex-shrink-0 min-w-0 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-[11px] sm:text-sm px-1.5 sm:px-4">
                  Sessions
                </TabsTrigger>
                <TabsTrigger value="practitioners" className="flex-1 flex-shrink-0 min-w-0 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-[11px] sm:text-sm px-1.5 sm:px-4">
                  Practitioners
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-2xl items-center overflow-hidden rounded-2xl bg-white border border-sage-200/60 shadow-sm"
          >
            <div className="flex items-center justify-center pl-4 sm:pl-5">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-sage-500" strokeWidth="1.5" />
            </div>
            <Input
              className="flex-1 border-0 bg-transparent px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-olive-800 placeholder:text-olive-500/70"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="sm" className="m-1.5 sm:m-2 bg-olive-800 hover:bg-olive-700 text-white rounded-full px-4 sm:px-6 text-xs sm:text-sm">
              Search
            </Button>
          </form>
        </div>
      </div>

      <div className="h-px bg-sage-200/60 mx-4 sm:mx-6" />

      {/* Main Content Area */}
      <div className="container mx-auto mt-6 sm:mt-8 px-4 sm:px-6 lg:px-8 pb-16">
        {/* Mobile Filters Toggle Button */}
        {sidebar && (
          <div className="mb-6 lg:hidden">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full border-sage-200/60 text-olive-700 hover:bg-sage-50 rounded-xl" size="default">
                  <Filter className="mr-2 h-4 w-4" strokeWidth="1.5" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-[350px] p-6">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-xl font-normal font-serif">Filters</SheetTitle>
                </SheetHeader>
                <Separator className="mb-6" />
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          {sidebar && (
            <aside className="hidden w-[280px] shrink-0 lg:block">
              <div className="bg-white rounded-2xl p-6 border border-sage-200/60 sticky top-6">
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
