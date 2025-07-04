"use client"

import { useState } from "react"
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

export default function SettingsPageV2() {
  const [activeTab, setActiveTab] = useState("billing")

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