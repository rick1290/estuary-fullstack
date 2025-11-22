"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { PaymentIntegrationSettings } from "@/components/dashboard/practitioner/settings/payment-integration-settings"
import { PasswordSettings } from "@/components/dashboard/practitioner/settings/password-settings"
import { NotificationSettings } from "@/components/dashboard/practitioner/settings/notification-settings"
import { BillingSettings } from "@/components/dashboard/practitioner/settings/billing-settings"

const SETTINGS_TABS = [
  { value: "billing", label: "Billing" },
  { value: "payment", label: "Payment Integration" },
  { value: "password", label: "Password" },
  { value: "notifications", label: "Notifications" },
]

export default function SettingsClient() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState("billing")

  // Set initial tab from URL parameter
  useEffect(() => {
    if (tabParam && SETTINGS_TABS.some(tab => tab.value === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Settings"
        helpLink="/help/practitioner/settings"
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="px-6 py-4">
        {activeTab === "billing" && <BillingSettings />}
        {activeTab === "payment" && <PaymentIntegrationSettings />}
        {activeTab === "password" && <PasswordSettings />}
        {activeTab === "notifications" && <NotificationSettings />}
      </div>
    </>
  )
}