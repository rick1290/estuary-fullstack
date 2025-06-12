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
    { label: "Home", path: "/dashboard/user", icon: <Home className="h-4 w-4 mr-2" /> },
    { label: "Messages", path: "/dashboard/user/messages", icon: <MessageSquare className="h-4 w-4 mr-2" /> },
    { label: "My Bookings", path: "/dashboard/user/bookings", icon: <Calendar className="h-4 w-4 mr-2" /> },
    { label: "My Streams", path: "/dashboard/user/streams", icon: <RssIcon className="h-4 w-4 mr-2" /> },
    { label: "My Favorites", path: "/dashboard/user/favorites", icon: <Heart className="h-4 w-4 mr-2" /> },
    { label: "Settings", path: "/dashboard/user/profile", icon: <Settings className="h-4 w-4 mr-2" /> },
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
    <div className="sticky top-0 z-30 w-full border-b bg-background">
      <div className="container px-4">
        <div className="flex h-12 items-center justify-between">
          <Tabs value={activeTab} className="w-full">
            <TabsList className="h-12 bg-transparent p-0">
              {visibleItems.map((item) => (
                <TabsTrigger
                  key={item.path}
                  value={item.path}
                  className={cn(
                    "flex h-12 items-center gap-x-2 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary",
                    pathname.startsWith(item.path) ? "font-semibold" : "font-normal",
                  )}
                  asChild
                >
                  <Link href={item.path}>
                    {item.icon}
                    {item.label}
                  </Link>
                </TabsTrigger>
              ))}

              {isMobile && moreItems.length > 0 && (
                <div className="flex items-center ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {moreItems.map((item) => (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            href={item.path}
                            className={cn(
                              "flex w-full items-center",
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
