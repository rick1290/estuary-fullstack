import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import ServiceDetails from "@/components/services/service-details"
import ServiceBookingPanel from "@/components/services/service-booking-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { getServiceById } from "@/lib/services"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Update the page component to handle string IDs
export default async function ServicePage({ params }: { params: { id: string } }) {
  const serviceId = params.id

  const service = await getServiceById(serviceId)

  if (!service) {
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
              <span className="text-gray-900 font-medium">{service.name}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
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
