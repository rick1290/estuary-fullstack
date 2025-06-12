"use client"

import { useState } from "react"
import { User, Lock, Mail, CreditCard, Receipt, Calendar, Bell, Trash2 } from "lucide-react"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
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
    <UserDashboardLayout>
      <div className="min-h-screen bg-gray-50/50">
        <div className="container max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-medium text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your account settings and preferences</p>
          </div>

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
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50",
                        tab.danger && activeTab !== tab.id && "text-red-600 hover:text-red-700"
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 sm:p-8">
                  {renderTabContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  )
}