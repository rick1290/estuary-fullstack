import type { Metadata } from "next"
import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import PractitionerProfileForm from "@/components/dashboard/practitioner/practitioner-profile-form"
import PractitionerAvailabilityForm from "@/components/dashboard/practitioner/practitioner-availability-form"
import PractitionerCredentialsForm from "@/components/dashboard/practitioner/practitioner-credentials-form"
import PractitionerQuestionsForm from "@/components/dashboard/practitioner/practitioner-questions-form"
import PractitionerProfilePreview from "@/components/dashboard/practitioner/practitioner-profile-preview"
import LoadingSpinner from "@/components/ui/loading-spinner"

export const metadata: Metadata = {
  title: "Profile | Practitioner Portal",
  description: "Manage your professional profile information",
}

export default function PractitionerProfilePage() {
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Profile</h1>

      <Card className="w-full border border-border rounded-lg overflow-hidden">
        <Tabs defaultValue="basic-info" className="w-full">
          <div className="border-b">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger
                value="basic-info"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3"
              >
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="professional-details"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3"
              >
                Professional Details
              </TabsTrigger>
              <TabsTrigger
                value="credentials"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3"
              >
                Credentials & Education
              </TabsTrigger>
              <TabsTrigger
                value="questions"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3"
              >
                Common Questions
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3"
              >
                Preview Profile
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic-info" className="p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <PractitionerProfileForm />
            </Suspense>
          </TabsContent>

          <TabsContent value="professional-details" className="p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <PractitionerAvailabilityForm />
            </Suspense>
          </TabsContent>

          <TabsContent value="credentials" className="p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <PractitionerCredentialsForm />
            </Suspense>
          </TabsContent>

          <TabsContent value="questions" className="p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <PractitionerQuestionsForm />
            </Suspense>
          </TabsContent>

          <TabsContent value="preview" className="p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <PractitionerProfilePreview />
            </Suspense>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
