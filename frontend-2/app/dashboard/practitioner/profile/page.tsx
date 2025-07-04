import type { Metadata } from "next"
import ProfileClient from "./profile-client"

export const metadata: Metadata = {
  title: "Profile | Practitioner Dashboard",
  description: "Manage your professional profile information.",
}

export default function ProfilePage() {
  return <ProfileClient />
}