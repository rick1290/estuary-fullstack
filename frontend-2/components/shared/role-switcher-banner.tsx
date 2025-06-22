"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter, usePathname } from "next/navigation"
import { ArrowRight, Sparkles, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function RoleSwitcherBanner() {
  const { user, isPractitioner, switchRole } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Only show banner if user has practitioner account
  if (!user?.hasPractitionerAccount) {
    return null
  }

  const isDashboard = pathname.startsWith("/dashboard")
  const isPractitionerDashboard = pathname.startsWith("/dashboard/practitioner")
  const isUserDashboard = pathname.startsWith("/dashboard/user")

  const handleSwitch = () => {
    switchRole()
    
    // Redirect based on current view
    if (isPractitioner) {
      // Switching to user view
      router.push("/dashboard/user")
    } else {
      // Switching to practitioner view
      router.push("/dashboard/practitioner")
    }
  }

  // Different styles based on current role
  const bannerStyles = isPractitioner
    ? "bg-gradient-to-r from-terracotta-500 to-terracotta-600"
    : "bg-gradient-to-r from-sage-600 to-sage-700"

  const currentView = isPractitioner ? "Practitioner" : "Client"
  const switchToView = isPractitioner ? "Client" : "Practitioner"

  return (
    <div className={cn("relative z-50", bannerStyles)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-white">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">
                You're viewing as: <span className="font-semibold">{currentView}</span>
              </span>
            </div>
            
            {/* Optional: Show notifications/stats - placeholder for now */}
            {isPractitioner && (
              <div className="hidden sm:flex items-center space-x-2 text-white/90 text-sm">
                <Bell className="h-3.5 w-3.5" />
                <span>View dashboard for updates</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleSwitch}
            variant="ghost"
            size="sm"
            className="text-white hover:text-white hover:bg-white/20 transition-colors"
          >
            Switch to {switchToView} View
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}