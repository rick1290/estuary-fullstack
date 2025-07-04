import type { Metadata } from "next"
import SettingsPageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Settings | Practitioner Dashboard",
  description: "Manage your account settings, payment integrations, and notification preferences.",
}

export default function SettingsPage() {
  return <SettingsPageV2 />
}