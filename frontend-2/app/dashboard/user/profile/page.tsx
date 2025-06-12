"use client"

import { useState } from "react"
import { User, Lock, Mail, CreditCard, Receipt, Calendar, Bell, Trash2 } from "lucide-react"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import AccountTab from "@/components/dashboard/user/settings/account-tab"
import PasswordTab from "@/components/dashboard/user/settings/password-tab"
import EmailTab from "@/components/dashboard/user/settings/email-tab"
import PaymentMethodsTab from "@/components/dashboard/user/settings/payment-methods-tab"
import PaymentHistoryTab from "@/components/dashboard/user/settings/payment-history-tab"
import AutoconfirmationTab from "@/components/dashboard/user/settings/autoconfirmation-tab"
import CalendarTab from "@/components/dashboard/user/settings/calendar-tab"
import NotificationsTab from "@/components/dashboard/user/settings/notifications-tab"
import DeleteAccountTab from "@/components/dashboard/user/settings/delete-account-tab"
import { cn } from "@/lib/utils"

const settingsTabs = [
  { id: "account", label: "Account", icon: User },
  { id: "password", label: "Password", icon: Lock },
  { id: "email", label: "Email", icon: Mail },
  { id: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { id: "payment-history", label: "Payment History", icon: Receipt },
  { id: "autoconfirmation", label: "Auto-confirmation", icon: Calendar },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "delete-account", label: "Delete Account", icon: Trash2, danger: true },
]

export default function UserProfilePage() {
  const [activeTab, setActiveTab] = useState("account")

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountTab />
      case "password":
        return <PasswordTab />
      case "email":
        return <EmailTab />
      case "payment-methods":
        return <PaymentMethodsTab />
      case "payment-history":
        return <PaymentHistoryTab />
      case "autoconfirmation":
        return <AutoconfirmationTab />
      case "calendar":
        return <CalendarTab />
      case "notifications":
        return <NotificationsTab />
      case "delete-account":
        return <DeleteAccountTab />
      default:
        return <AccountTab />
    }
  }

  return (
    <UserDashboardLayout title="Settings">
      <p className="text-olive-600 mb-8 -mt-4">Manage your account settings and preferences</p>

      {/* Main content container with clean layout */}
      <div className="grid gap-8 lg:grid-cols-4">
            {/* Navigation sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-1" aria-label="Settings navigation">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all",
                        activeTab === tab.id
                          ? "bg-white text-olive-900 shadow-sm border-2 border-sage-200"
                          : "text-olive-600 hover:text-olive-900 hover:bg-white/50",
                        tab.danger && activeTab !== tab.id && "text-terracotta-600 hover:text-terracotta-700"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </UserDashboardLayout>
  )
}