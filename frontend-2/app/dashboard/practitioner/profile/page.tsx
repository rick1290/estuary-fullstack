import type { Metadata } from "next"
import ProfilePageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Profile | Practitioner Dashboard",
  description: "Manage your professional profile information.",
}

export default function ProfilePage() {
  return <ProfilePageV2 />
}