import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import PractitionerBookingPanel from "@/components/practitioners/practitioner-booking-panel"
import { getPractitionerById } from "@/lib/practitioners"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight, Star, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import ClientPractitionerProfile from "@/components/practitioners/client-practitioner-profile"

export default async function PractitionerPage({ params }: { params: { id: string } }) {
  const practitioner = await getPractitionerById(params.id)

  if (!practitioner) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Simple gradient header background */}
      <div className="bg-gradient-to-b from-sage-50/50 to-cream-50 pb-8">
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-600 hover:text-olive-800 text-sm">
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-600 hover:text-olive-800 text-sm">
                  <Link href="/marketplace/practitioners">Practitioners</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-800 font-medium text-sm">{practitioner.display_name}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-[1fr,340px] gap-6 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="w-full min-w-0">
            <Suspense fallback={<ProfileSkeleton />}>
              <ClientPractitionerProfile practitioner={practitioner} />
            </Suspense>
          </div>

          {/* Right Column - Booking Panel (Sticky) */}
          <div className="w-full lg:sticky lg:top-24 lg:self-start">
            <PractitionerBookingPanel practitioner={practitioner} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
            <div className="flex gap-4 mt-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6">
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}