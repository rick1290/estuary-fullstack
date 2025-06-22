"use client"

import type * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useMessageNotifications } from "@/hooks/use-message-notifications"
import PractitionerDashboardBreadcrumb from "@/components/dashboard/practitioner/practitioner-dashboard-breadcrumb"
import {
  Menu,
  Home,
  Bell,
  LogOut,
  RefreshCw,
  User,
  Settings,
  BarChart,
  Calendar,
  MessageSquare,
  Users,
  SpadeIcon as Spa,
  Clock,
  Copy,
  ExternalLink,
  Gift,
  ChevronDown,
  ChevronRight,
  DollarSign,
  CreditCard,
  Receipt,
  ChevronUp,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PractitionerDashboardLayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  text: string
  icon: React.ReactNode
  path: string
  submenu?: {
    text: string
    icon: React.ReactNode
    path: string
  }[]
}

export default function PractitionerDashboardLayout({ children }: PractitionerDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, switchRole } = useAuth()
  const { unreadCount } = useMessageNotifications({
    enabled: !!user && user.is_practitioner
  })

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleSwitchToUser = () => {
    switchRole()
    router.push("/")
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleSubmenu = (text: string) => {
    setOpenSubmenu(openSubmenu === text ? null : text)
  }

  const menuItems: MenuItem[] = [
    { text: "Dashboard", icon: <BarChart className="h-4 w-4" />, path: "/dashboard/practitioner" },
    { text: "Manage Services", icon: <Spa className="h-4 w-4" />, path: "/dashboard/practitioner/services" },
    { text: "Streams", icon: <MessageSquare className="h-4 w-4" />, path: "/dashboard/practitioner/streams" },
    { text: "Availability", icon: <Clock className="h-4 w-4" />, path: "/dashboard/practitioner/availability" },
    { text: "Schedule", icon: <Calendar className="h-4 w-4" />, path: "/dashboard/practitioner/schedule" },
    { text: "Clients", icon: <Users className="h-4 w-4" />, path: "/dashboard/practitioner/clients" },
    { 
      text: "Messages", 
      icon: (
        <div className="relative">
          <MessageSquare className="h-4 w-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
          )}
        </div>
      ), 
      path: "/dashboard/practitioner/messages" 
    },
    {
      text: "Manage Finances",
      icon: <DollarSign className="h-4 w-4" />,
      path: "/dashboard/practitioner/finances",
      submenu: [
        {
          text: "Financial Overview",
          icon: <BarChart className="h-4 w-4" />,
          path: "/dashboard/practitioner/finances/overview",
        },
        {
          text: "Billings and Earnings",
          icon: <CreditCard className="h-4 w-4" />,
          path: "/dashboard/practitioner/finances/earnings",
        },
        {
          text: "Transactions and Invoices",
          icon: <Receipt className="h-4 w-4" />,
          path: "/dashboard/practitioner/finances/transactions",
        },
        {
          text: "Payouts",
          icon: <CreditCard className="h-4 w-4" />,
          path: "/dashboard/practitioner/finances/payouts",
        },
      ],
    },
    { text: "Profile", icon: <User className="h-4 w-4" />, path: "/dashboard/practitioner/profile" },
    { text: "Analytics", icon: <BarChart className="h-4 w-4" />, path: "/dashboard/practitioner/analytics" },
  ]

  const isSubmenuActive = (item: MenuItem) => {
    if (!item.submenu) return false
    return item.submenu.some((subItem) => pathname === subItem.path || pathname.startsWith(subItem.path))
  }

  const renderMenuItem = (item: MenuItem) => {
    const isActive =
      pathname === item.path ||
      (item.path !== "/dashboard/practitioner" && pathname.startsWith(item.path)) ||
      isSubmenuActive(item)

    if (item.submenu) {
      const isOpen = openSubmenu === item.text || isSubmenuActive(item)

      return (
        <div key={item.text} className="space-y-1">
          <button
            onClick={() => toggleSubmenu(item.text)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sage-50 hover:text-sage-700 text-olive-700",
              isActive && "bg-sage-100 text-sage-700",
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {item.text}
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {isOpen && (
            <div className="pl-6 pt-1 space-y-1">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.text}
                  href={subItem.path}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    (pathname === subItem.path || pathname.startsWith(subItem.path)) && "text-primary",
                  )}
                >
                  {subItem.icon}
                  {subItem.text}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.text}
        href={item.path}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-primary/10 text-primary",
        )}
      >
        {item.icon}
        {item.text}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-cream-50 to-cream-100 relative">
      {/* Subtle background texture */}
      <div className="absolute inset-0 texture-grain opacity-20" />
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sage-200 bg-white/90 backdrop-blur-lg shadow-lg transition-transform md:flex rounded-r-2xl",
          !sidebarOpen && "md:-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sage-200 px-4">
          <Link href="/" className="flex items-center font-bold text-xl tracking-widest text-olive-900">
            ESTUARY
          </Link>
        </div>
        <ScrollArea className="flex-1 py-2 flex flex-col h-[calc(100vh-4rem)]">
          <nav className="space-y-1 px-2">{menuItems.map(renderMenuItem)}</nav>
        </ScrollArea>
        <div className="px-2 py-2 border-t">
          <nav className="space-y-1">
            <Link
              href={`/practitioners/${user?.practitioner_slug || user?.practitionerPublicId || user?.id || "1"}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              View Public Profile Page
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto font-medium"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/practitioners/${user?.practitioner_slug || user?.practitionerPublicId || user?.id || "1"}`)
              }}
            >
              <Copy className="h-4 w-4" />
              Copy Public Profile Link
            </Button>
            <Link
              href="/dashboard/practitioner/referrals"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Gift className="h-4 w-4" />
              Earn 20% Referral
            </Link>
            <Link
              href="/dashboard/practitioner/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            {/* Account Menu Button */}
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-3">
                <User className="h-4 w-4" />
                <span>Account</span>
              </div>
              {accountMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {/* Account Menu Dropdown */}
            {accountMenuOpen && (
              <div className="mt-1 rounded-md border bg-background shadow-sm">
                <div className="p-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt={user?.firstName || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.firstName?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">{user?.email || "practitioner@example.com"}</span>
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <Link
                    href="/dashboard/practitioner/profile"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute left-4 top-3 z-50 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="h-16 border-b px-4">
            <SheetTitle className="flex items-center justify-start text-left">Estuary</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="flex flex-col h-[calc(100vh-4rem)]">
              <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                  <nav className="space-y-1">{menuItems.map(renderMenuItem)}</nav>
                </div>
              </div>

              <div className="mt-auto px-3 py-4 border-t">
                <nav className="space-y-1">
                  <Link
                    href={`/practitioners/${user?.practitioner_slug || user?.practitionerPublicId || user?.id || "1"}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Public Profile Page
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 px-3 py-2 h-auto font-medium"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/practitioners/${user?.practitioner_slug || user?.practitionerPublicId || user?.id || "1"}`)
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Public Profile Link
                  </Button>
                  <Link
                    href="/dashboard/practitioner/referrals"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Gift className="h-4 w-4" />
                    Earn 20% Referral
                  </Link>
                  <Link
                    href="/dashboard/practitioner/settings"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>

                  {/* Account Menu Button */}
                  <button
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4" />
                      <span>Account</span>
                    </div>
                    {accountMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {/* Account Menu Dropdown */}
                  {accountMenuOpen && (
                    <div className="mt-1 rounded-md border bg-background shadow-sm">
                      <div className="p-3 border-b">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="/placeholder-user.jpg" alt={user?.firstName || "User"} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {user?.firstName?.charAt(0) || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {user?.firstName} {user?.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user?.email || "practitioner@example.com"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/dashboard/practitioner/profile"
                          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </nav>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={cn("flex-1 transition-all", sidebarOpen ? "md:ml-64" : "md:ml-0")}>
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sage-200 bg-white/90 backdrop-blur-lg shadow-sm px-4 md:px-6 relative">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden md:flex">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
            <h1 className="text-lg font-medium text-olive-900">Practitioner Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Home button */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Home className="h-5 w-5" />
                <span className="sr-only">Home</span>
              </Link>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center"
                  >
                    4
                  </Badge>
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-2">
                  <p className="text-sm">New booking confirmation</p>
                </div>
                <div className="p-2">
                  <p className="text-sm">You have a new message</p>
                </div>
                <div className="p-2">
                  <p className="text-sm">Upcoming session reminder</p>
                </div>
                <div className="p-2">
                  <p className="text-sm">New client inquiry</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="justify-center">
                  <Link href="/dashboard/notifications" className="text-primary">
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
                      {user?.firstName?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/practitioner/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/practitioner/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSwitchToUser} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Switch to User View</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 relative z-0 overflow-x-hidden">
          <PractitionerDashboardBreadcrumb />
          {children}
        </main>
      </div>
    </div>
  )
}
