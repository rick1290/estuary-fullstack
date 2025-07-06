import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import PractitionerReferrals from "@/components/dashboard/practitioner/referrals/practitioner-referrals"

export const metadata: Metadata = {
  title: "Referrals | Practitioner Portal",
  description: "Manage your referral program and track referral earnings",
}

export default function PractitionerReferralsPage() {
  return (
    <PractitionerDashboardPageLayout 
      title="Referral Program" 
      description="Invite other practitioners and earn rewards"
    >
      <PractitionerReferrals />
    </PractitionerDashboardPageLayout>
  )
}