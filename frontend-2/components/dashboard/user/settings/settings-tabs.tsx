"use client"

interface SettingsTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "account", label: "Account" },
  { id: "password", label: "Password" },
  { id: "email", label: "Email" },
  { id: "payment-methods", label: "Payment methods" },
  { id: "payment-history", label: "Payment history" },
  { id: "autoconfirmation", label: "Autoconfirmation" },
  { id: "calendar", label: "Calendar" },
  { id: "notifications", label: "Notifications" },
  { id: "delete-account", label: "Delete account" },
]

export default function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="w-full bg-background max-h-[300px] md:max-h-[calc(100vh-200px)] overflow-y-auto">
      <nav className="p-0">
        <ul className="space-y-px">
          {tabs.map((tab) => (
            <li key={tab.id} className="block w-full">
              <button
                onClick={() => onTabChange(tab.id)}
                className={`w-full text-left py-3 px-4 transition-colors border-l-4 ${
                  activeTab === tab.id ? "border-l-primary bg-muted/50" : "border-l-transparent hover:bg-muted/30"
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
