import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import ServiceDetails from "@/components/services/service-details"
import ServiceBookingPanel from "@/components/services/service-booking-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { publicServicesRetrieve } from "@/src/client/sdk.gen"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default async function ServicePage({ params }: { params: { id: string } }) {
  const serviceId = params.id

  // Try fetching by numeric ID from the real API
  let service: any = null
  try {
    const numericId = parseInt(serviceId)
    if (!isNaN(numericId)) {
      const response = await publicServicesRetrieve({ path: { public_uuid: serviceId } })
      service = response.data
    }
  } catch {
    // If UUID lookup fails, try as numeric PK via fetch
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseUrl}/api/v1/public-services/${serviceId}/`, { next: { revalidate: 60 } })
      if (res.ok) {
        service = await res.json()
      }
    } catch {
      // Service not found
    }
  }

  // If the service has a slug, redirect to the canonical URL
  if (service?.slug && service?.service_type_code) {
    const typeMap: Record<string, string> = {
      session: 'sessions',
      workshop: 'workshops',
      course: 'courses',
    }
    const typePath = typeMap[service.service_type_code]
    if (typePath) {
      redirect(`/${typePath}/${service.slug}`)
    }
  }

  if (!service) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white">
      <div className="container px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <Breadcrumb className="mb-4 sm:mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="text-olive-600 hover:text-olive-900">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-olive-500" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/marketplace" className="text-olive-600 hover:text-olive-900">Marketplace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-olive-500" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-olive-900 font-medium">{service.name}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          <div className="flex-1 w-full lg:w-2/3">
            <Suspense fallback={<ServiceDetailsSkeleton />}>
              <ServiceDetails service={service} />
            </Suspense>
          </div>

          <div className="w-full lg:w-1/3 lg:sticky lg:top-24 lg:self-start">
            <ServiceBookingPanel service={service} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ServiceDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
