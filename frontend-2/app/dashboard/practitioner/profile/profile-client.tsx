"use client"

import { useState, Suspense } from "react"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import PractitionerProfileForm from "@/components/dashboard/practitioner/practitioner-profile-form"
import PractitionerAvailabilityForm from "@/components/dashboard/practitioner/practitioner-availability-form"
import PractitionerCredentialsForm from "@/components/dashboard/practitioner/practitioner-credentials-form"
import PractitionerQuestionsForm from "@/components/dashboard/practitioner/practitioner-questions-form"
import PractitionerProfilePreview from "@/components/dashboard/practitioner/practitioner-profile-preview"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { Eye } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

const PROFILE_TABS = [
  { value: "basic-info", label: "Basic Info" },
  { value: "professional-details", label: "Professional Details" },
  { value: "credentials", label: "Credentials & Education" },
  { value: "questions", label: "Common Questions" },
  { value: "preview", label: "Preview Profile" },
]

export default function ProfileClient() {
  const [activeTab, setActiveTab] = useState("basic-info")
  const { user } = useAuth()
  const router = useRouter()

  const handleViewPublicProfile = () => {
    if (user?.practitioner_slug || user?.practitionerPublicId) {
      const profileId = user.practitioner_slug || user.practitionerPublicId
      router.push(`/practitioners/${profileId}`)
    }
  }

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Profile"
        helpLink="/help/practitioner/profile"
        action={{
          label: "View Public Profile",
          icon: <Eye className="h-4 w-4" />,
          onClick: handleViewPublicProfile
        }}
        tabs={PROFILE_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="px-6 py-4">
        {activeTab === "basic-info" && (
          <Suspense fallback={<LoadingSpinner />}>
            <PractitionerProfileForm />
          </Suspense>
        )}

        {activeTab === "professional-details" && (
          <Suspense fallback={<LoadingSpinner />}>
            <PractitionerAvailabilityForm />
          </Suspense>
        )}

        {activeTab === "credentials" && (
          <Suspense fallback={<LoadingSpinner />}>
            <PractitionerCredentialsForm />
          </Suspense>
        )}

        {activeTab === "questions" && (
          <Suspense fallback={<LoadingSpinner />}>
            <PractitionerQuestionsForm />
          </Suspense>
        )}

        {activeTab === "preview" && (
          <Suspense fallback={<LoadingSpinner />}>
            <PractitionerProfilePreview />
          </Suspense>
        )}
      </div>
    </>
  )
}