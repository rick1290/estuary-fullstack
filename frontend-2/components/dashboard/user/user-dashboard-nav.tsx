"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Heart, Home, MessageSquare, MoreHorizontal, RssIcon, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

export default function UserDashboardNav() {
  const pathname = usePathname()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const navItems: NavItem[] = [
    { label: "Home", path: "/dashboard/user", icon: <Home className="h-4 w-4 shrink-0" /> },
    { label: "Messages", path: "/dashboard/user/messages", icon: <MessageSquare className="h-4 w-4 shrink-0" /> },
    { label: "My Journeys", path: "/dashboard/user/journeys", icon: <Calendar className="h-4 w-4 shrink-0" /> },
    { label: "My Streams", path: "/dashboard/user/streams", icon: <RssIcon className="h-4 w-4 shrink-0" /> },
    { label: "My Favorites", path: "/dashboard/user/favorites", icon: <Heart className="h-4 w-4 shrink-0" /> },
    { label: "Settings", path: "/dashboard/user/profile", icon: <Settings className="h-4 w-4 shrink-0" /> },
  ]

  // For mobile view, we'll show fewer tabs and put the rest in a "More" dropdown
  const visibleItems = isMobile ? navItems.slice(0, 3) : navItems
  const moreItems = isMobile ? navItems.slice(3) : []

  // Find the active tab value
  const activeTab =
    navItems.find(
      (item) => pathname === item.path || (item.path !== "/dashboard/user" && pathname.startsWith(item.path)),
    )?.path || "/dashboard/user"

  return (
    <div className="sticky top-0 z-30 w-full border-b border-sage-200/60 bg-cream-50/95 backdrop-blur-sm">
      <div className="container px-2 sm:px-4">
        <div className="flex h-12 sm:h-14 items-center justify-between">
          <Tabs value={activeTab} className="w-full overflow-hidden">
            <TabsList className="h-12 sm:h-14 bg-transparent p-0 overflow-x-auto scrollbar-hide flex w-full">
              {visibleItems.map((item) => (
                <TabsTrigger
                  key={item.path}
                  value={item.path}
                  className={cn(
                    "flex h-12 sm:h-14 items-center gap-x-1.5 sm:gap-x-2 rounded-none border-b-2 border-transparent px-3 sm:px-6 text-olive-700 hover:text-olive-900 data-[state=active]:border-sage-600 data-[state=active]:text-sage-700 transition-all whitespace-nowrap min-w-[44px] min-h-[44px] text-sm",
                    pathname.startsWith(item.path) ? "font-medium" : "font-normal",
                  )}
                  asChild
                >
                  <Link href={item.path}>
                    {item.icon}
                    <span className={isMobile ? "text-xs" : ""}>{item.label}</span>
                  </Link>
                </TabsTrigger>
              ))}

              {isMobile && moreItems.length > 0 && (
                <div className="flex items-center ml-auto shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]">
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {moreItems.map((item) => (
                        <DropdownMenuItem key={item.path} asChild className="min-h-[44px]">
                          <Link
                            href={item.path}
                            className={cn(
                              "flex w-full items-center gap-2",
                              pathname.startsWith(item.path) ? "font-semibold" : "font-normal",
                            )}
                          >
                            {item.icon}
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
