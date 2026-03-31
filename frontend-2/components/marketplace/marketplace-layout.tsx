"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import MarketplaceFilterChips from "./marketplace-filter-chips"

interface MarketplaceLayoutProps {
  children: ReactNode
  title: ReactNode
  description?: string
  eyebrow?: string
  searchPlaceholder?: string
  initialSearchQuery?: string
  sidebar?: ReactNode
  patternType?: string
}

export default function MarketplaceLayout({
  children,
  title,
  description,
  searchPlaceholder = "Search for services, practitioners, or keywords...",
  initialSearchQuery = "",
}: MarketplaceLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

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

  const activeTab = getActiveTab()

  const tabs = [
    { value: "all", label: "All" },
    { value: "sessions", label: "Sessions" },
    { value: "workshops", label: "Workshops" },
    { value: "courses", label: "Courses" },
    { value: "practitioners", label: "Practitioners" },
  ]

  return (
    <div className="w-full bg-[#f8f5f0] min-h-screen">
      {/* Header — not sticky, clean and compact */}
      <div className="bg-[#f8f5f0] border-b border-[rgba(74,63,53,0.06)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title + Search row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-6 pb-4">
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#4A3F35] shrink-0">
              {title}
            </h1>

            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-xl flex items-center bg-white/80 backdrop-blur-sm rounded-full border border-[rgba(74,63,53,0.08)] overflow-hidden"
            >
              <div className="pl-4">
                <Search className="h-4 w-4 text-[#9B9590]" strokeWidth="1.5" />
              </div>
              <Input
                className="flex-1 border-0 bg-transparent px-3 py-2.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 text-[#4A3F35] placeholder:text-[#9B9590]"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1.5 mr-1 text-[#9B9590] hover:text-[#4A3F35]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                className="m-1 bg-[#4A3F35] hover:bg-[#5c4f42] text-white rounded-full px-5 text-xs"
              >
                Search
              </Button>
            </form>
          </div>

          {/* Tabs row */}
          <div
            className="flex gap-1 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  activeTab === tab.value
                    ? "bg-[#4A3F35] text-white shadow-sm"
                    : "text-[#6B6560] hover:bg-white/80 hover:text-[#4A3F35]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky filter chips bar */}
      <div className="sticky top-[64px] z-30 bg-[#f8f5f0]/95 backdrop-blur-md border-b border-[rgba(74,63,53,0.04)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <MarketplaceFilterChips />
        </div>
      </div>

      {/* Content — full width, no sidebar */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <main className="w-full">{children}</main>
      </div>
    </div>
  )
}
