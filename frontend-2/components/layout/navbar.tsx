"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { cn } from "@/lib/utils"
import {
  Menu,
  User,
  Search,
  Calendar,
  MessageSquare,
  LogOut,
  LogIn,
  UserPlus,
  Bell,
  RefreshCw,
  Users,
  GraduationCap,
  Rss,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  notificationsUnreadCountRetrieveOptions,
  notificationsListOptions
} from "@/src/client/@tanstack/react-query.gen"
import { formatDistanceToNow } from "date-fns"

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isPractitioner, logout, switchRole } = useAuth()
  const { openAuthModal } = useAuthModal()

  // Check if we're in the practitioner dashboard or checkout pages
  const isInPractitionerDashboard = pathname.startsWith("/dashboard/practitioner")
  const isInCheckout = pathname.startsWith("/checkout")

  // Fetch notifications data
  const { data: unreadCountData } = useQuery({
    ...notificationsUnreadCountRetrieveOptions(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: notificationsData } = useQuery({
    ...notificationsListOptions({
      query: {
        page_size: 5,
        ordering: '-created_at'
      }
    }),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const unreadCount = unreadCountData?.unread_count || 0
  const recentNotifications = notificationsData?.results || []

  // If we're in the practitioner dashboard or checkout, don't show the main navbar
  if (isInPractitionerDashboard || isInCheckout) {
    return null
  }

  const handleLogout = () => {
    logout()
  }

  const handleSwitchRole = () => {
    switchRole()
    // Redirect to the appropriate dashboard
    if (isPractitioner) {
      router.push("/dashboard/user")
    } else {
      router.push("/dashboard/practitioner")
    }
  }

  // Define navigation items based on user state
  const getNavItems = () => {
    if (!isAuthenticated) {
      // Logged-out navigation
      return [
        {
          label: "Marketplace",
          href: "#",
          icon: <Search className="h-4 w-4" />,
          subItems: [
            { label: "Courses", href: "/marketplace/courses", icon: <GraduationCap className="h-4 w-4" /> },
            { label: "Workshops", href: "/marketplace/workshops", icon: <Users className="h-4 w-4" /> },
            { label: "Sessions", href: "/marketplace/sessions", icon: <User className="h-4 w-4" /> },
          ],
        },
        { label: "Practitioners", href: "/marketplace/practitioners", icon: <User className="h-4 w-4" /> },
        { label: "Streams", href: "/streams", icon: <Rss className="h-4 w-4" /> },
        { label: "Become a Practitioner", href: "/become-practitioner", icon: <UserPlus className="h-4 w-4" /> },
      ]
    } else {
      // General user navigation (no practitioner dashboard items here)
      return [
        {
          label: "Marketplace",
          href: "#",
          icon: <Search className="h-4 w-4" />,
          subItems: [
            { label: "Courses", href: "/marketplace/courses", icon: <GraduationCap className="h-4 w-4" /> },
            { label: "Workshops", href: "/marketplace/workshops", icon: <Users className="h-4 w-4" /> },
            { label: "Sessions", href: "/marketplace/sessions", icon: <User className="h-4 w-4" /> },
          ],
        },
        { label: "Practitioners", href: "/marketplace/practitioners", icon: <User className="h-4 w-4" /> },
        { label: "Streams", href: "/streams", icon: <Rss className="h-4 w-4" /> },
      ]
    }
  }

  const navItems = getNavItems()

  // Check if we're on the homepage for transparent navbar
  const isHomepage = pathname === '/'
  
  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
      isHomepage 
        ? 'bg-white/10 backdrop-blur-lg border-white/20' 
        : 'bg-white/95 backdrop-blur-md border-gray-100'
    }`}>
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center font-bold text-xl tracking-widest">
          ESTUARY
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <NavigationMenu>
            <NavigationMenuList>
              {navItems.map((item) => (
                <NavigationMenuItem key={item.label}>
                  {item.subItems ? (
                    <>
                      <NavigationMenuTrigger className="flex items-center gap-1">
                        {item.icon}
                        <span>{item.label}</span>
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[200px] gap-1 p-2">
                          <li>
                            <NavigationMenuLink asChild>
                              <Link
                                href="/marketplace"
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg p-2 text-sm hover:bg-gray-100",
                                  pathname === "/marketplace" && "bg-gray-100 font-medium",
                                )}
                              >
                                <Layers className="h-4 w-4" />
                                All Services
                              </Link>
                            </NavigationMenuLink>
                          </li>
                          {item.subItems.map((subItem) => (
                            <li key={subItem.label}>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={subItem.href}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg p-2 text-sm hover:bg-gray-100",
                                    pathname === subItem.href && "bg-gray-100 font-medium",
                                  )}
                                >
                                  {subItem.icon}
                                  {subItem.label}
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-normal transition-colors hover:bg-gray-100",
                        pathname === item.href ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600",
                        "flex items-center gap-2",
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  )}
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="hidden md:flex md:items-center md:gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/user/bookings" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>My Bookings</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/user/messages" className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                </Link>
              </Button>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {recentNotifications.length > 0 ? (
                    <>
                      <div className="p-2 border-b">
                        <p className="text-sm font-semibold text-olive-900">Recent Notifications</p>
                      </div>
                      {recentNotifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-3 hover:bg-sage-50 cursor-pointer border-b border-sage-100 last:border-0",
                            !notification.is_read && "bg-blush-50"
                          )}
                        >
                          <p className="text-sm font-medium text-olive-900">{notification.title}</p>
                          <p className="text-xs text-olive-600 mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-sage-600 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <Bell className="h-8 w-8 mx-auto text-sage-300 mb-2" />
                      <p className="text-sm text-olive-600">No notifications yet</p>
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="justify-center">
                    <Link href="/dashboard/user/notifications" className="text-primary">
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt={user?.firstName || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.firstName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/user/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/user/bookings" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>My Bookings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/user/messages" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Messages</span>
                    </Link>
                  </DropdownMenuItem>
                  {user?.hasPractitionerAccount && (
                    <DropdownMenuItem onClick={handleSwitchRole} className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>{isPractitioner ? "Switch to Customer View" : "Switch to Practitioner View"}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:flex md:items-center md:gap-3">
              <Button 
                variant="ghost" 
                size="default" 
                onClick={() => openAuthModal({ defaultTab: "login" })}
                className="flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Button>
              <Button 
                size="default" 
                onClick={() => openAuthModal({ defaultTab: "signup" })}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Sign Up</span>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle className="text-left font-bold tracking-widest">ESTUARY</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 py-4">
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <React.Fragment key={item.label}>
                      {item.subItems ? (
                        <>
                          <div className="px-2 py-1 text-sm font-medium">{item.label}</div>
                          {item.subItems.map((subItem) => (
                            <SheetClose asChild key={subItem.label}>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-4 py-2 text-sm hover:bg-accent",
                                  pathname === subItem.href && "bg-accent font-medium",
                                )}
                              >
                                {subItem.icon}
                                {subItem.label}
                              </Link>
                            </SheetClose>
                          ))}
                        </>
                      ) : (
                        <SheetClose asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
                              pathname === item.href && "bg-accent font-medium",
                            )}
                          >
                            {item.icon}
                            {item.label}
                          </Link>
                        </SheetClose>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
                <Separator />
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Link
                        href="/dashboard/user/bookings"
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>My Bookings</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/dashboard/user/messages"
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Messages</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/dashboard/user/profile"
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </SheetClose>
                    <Separator />
                    {user?.hasPractitionerAccount && (
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 px-2"
                        onClick={() => {
                          handleSwitchRole()
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>{isPractitioner ? "Switch to Customer View" : "Switch to Practitioner View"}</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="justify-start gap-2 px-2"
                      onClick={() => {
                        handleLogout()
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        onClick={() => openAuthModal({ defaultTab: "login" })}
                      >
                        <LogIn className="h-4 w-4" />
                        <span>Login</span>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button 
                        className="w-full justify-start gap-2"
                        onClick={() => openAuthModal({ defaultTab: "signup" })}
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Sign Up</span>
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
