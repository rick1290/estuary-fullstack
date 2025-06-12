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
import { ChevronRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import ClientPractitionerProfile from "@/components/practitioners/client-practitioner-profile"

export default async function PractitionerPage({ params }: { params: { id: string } }) {
  const practitioner = await getPractitionerById(params.id)

  if (!practitioner) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white">
      <div className="container py-12">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/marketplace" className="text-gray-600 hover:text-gray-900">Marketplace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-gray-900 font-medium">{practitioner.display_name}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 w-full lg:w-2/3">
            <Suspense fallback={<ProfileSkeleton />}>
              <ClientPractitionerProfile practitioner={practitioner} />
            </Suspense>
          </div>

          <div className="w-full lg:w-1/3 lg:sticky lg:top-24 lg:self-start">
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
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
