"use client"

import type React from "react"
import { type ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Users, Rss } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
  searchPlaceholder = "Search streams, practitioners, topics...",
  initialSearchQuery = "",
  sidebar,
  rightSidebar,
}: StreamsLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  const isFollowing = pathname === "/streams/following"

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/streams?q=${encodeURIComponent(searchQuery)}`)
  }

  // Get active content type from URL
  const getActiveType = () => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("type") || ""
  }

  const contentTypes = [
    { label: "All", value: "" },
    { label: "Video", value: "video" },
    { label: "Images", value: "image" },
    { label: "Articles", value: "post" },
    { label: "Audio", value: "audio" },
    { label: "Polls", value: "poll" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4">
          {/* Top row: brand + search */}
          <div className="h-14 flex items-center gap-4">
            <div
              className="flex items-center gap-2 shrink-0 cursor-pointer"
              onClick={() => router.push("/streams")}
            >
              <Rss className="h-5 w-5 text-sage-600" />
              <span className="font-serif text-lg font-medium text-olive-900 hidden sm:block">
                Streams
              </span>
            </div>

            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="w-full pl-10 pr-4 h-10 rounded-full bg-gray-100 border-0 text-sm focus-visible:ring-1 focus-visible:ring-sage-300 placeholder:text-gray-400"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          </div>

          {/* Second row: For You / Following + content filters */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as any}>
            {/* Navigation pills */}
            <button
              onClick={() => router.push("/streams")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !isFollowing
                  ? "bg-olive-900 text-white"
                  : "text-olive-600 hover:bg-gray-100"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => router.push("/streams/following")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isFollowing
                  ? "bg-olive-900 text-white"
                  : "text-olive-600 hover:bg-gray-100"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Following
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-gray-200 shrink-0 mx-1" />

            {/* Content type filters */}
            {contentTypes.map((filter) => {
              const activeType = getActiveType()
              const isActive = activeType === filter.value

              return (
                <button
                  key={filter.value}
                  onClick={() => {
                    if (filter.value) {
                      router.push(`/streams?type=${filter.value}`)
                    } else {
                      router.push("/streams")
                    }
                  }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-sage-100 text-sage-800 border border-sage-300"
                      : "text-gray-500 hover:bg-gray-100 border border-transparent"
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Featured practitioners carousel */}
      {rightSidebar && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Suggested for you
            </p>
            <div
              className="overflow-x-auto snap-x snap-mandatory flex gap-4 pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as any}
            >
              {rightSidebar}
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {children}
      </div>
    </div>
  )
}
