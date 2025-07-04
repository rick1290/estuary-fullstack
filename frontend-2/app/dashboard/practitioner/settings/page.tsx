import type { Metadata } from "next"
import SettingsClient from "./settings-client"

export const metadata: Metadata = {
  title: "Settings | Practitioner Dashboard",
  description: "Manage your account settings, payment integrations, and notification preferences.",
}

export default function SettingsPage() {
  return <SettingsClient />
}