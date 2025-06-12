import type { Metadata } from "next"
import { Suspense } from "react"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
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
    <PractitionerDashboardPageLayout 
      title="Profile" 
      description="Manage your professional profile information"
    >
      <Card className="w-full border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden">
        <Tabs defaultValue="basic-info" className="w-full">
          <div className="border-b border-sage-200">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger
                value="basic-info"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-sage-600 data-[state=active]:shadow-none data-[state=active]:text-sage-700 rounded-none px-4 py-3 text-olive-600"
              >
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="professional-details"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-sage-600 data-[state=active]:shadow-none data-[state=active]:text-sage-700 rounded-none px-4 py-3 text-olive-600"
              >
                Professional Details
              </TabsTrigger>
              <TabsTrigger
                value="credentials"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-sage-600 data-[state=active]:shadow-none data-[state=active]:text-sage-700 rounded-none px-4 py-3 text-olive-600"
              >
                Credentials & Education
              </TabsTrigger>
              <TabsTrigger
                value="questions"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-sage-600 data-[state=active]:shadow-none data-[state=active]:text-sage-700 rounded-none px-4 py-3 text-olive-600"
              >
                Common Questions
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-sage-600 data-[state=active]:shadow-none data-[state=active]:text-sage-700 rounded-none px-4 py-3 text-olive-600"
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
    </PractitionerDashboardPageLayout>
  )
}
