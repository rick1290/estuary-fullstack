"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { modalitiesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { getModalityContent } from "@/lib/modality-content"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import ModalityHeroSection from "./modality-hero-section"
import ModalityServicesSection from "./modality-services-section"
import ModalityPractitionersSection from "./modality-practitioners-section"
import ModalityFaqSection from "./modality-faq-section"
import ModalityCtaSection from "./modality-cta-section"

interface ModalityPageContentProps {
  slug: string
}

export default function ModalityPageContent({ slug }: ModalityPageContentProps) {
  const { data: modalitiesData, isLoading } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 100 } }),
  })

  const modalities = modalitiesData?.results || []
  const modality = modalities.find((m: any) => m.slug === slug)

  if (isLoading) {
    return (
      <main className="bg-cream-50 min-h-screen">
        <div className="container max-w-7xl py-8 px-4">
          <div className="h-8 w-48 bg-sage-100 rounded animate-pulse mb-8" />
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="h-6 w-32 bg-sage-100 rounded-full animate-pulse mx-auto" />
            <div className="h-12 w-full bg-sage-100 rounded animate-pulse" />
            <div className="h-20 w-full bg-sage-100 rounded animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  const modalityName = modality?.name || slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  const content = getModalityContent(slug, modalityName, modality?.description)

  return (
    <main className="bg-cream-50 min-h-screen">
      {/* Breadcrumbs */}
      <div className="container max-w-7xl pt-6 px-4 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/modalities">Modalities</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{modalityName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <ModalityHeroSection content={content} />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityServicesSection slug={slug} modalityName={modalityName} />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityPractitionersSection slug={slug} modalityName={modalityName} />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityFaqSection faqs={content.faqs} />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityCtaSection
        heading={content.ctaHeading}
        description={content.ctaDescription}
        slug={slug}
      />
    </main>
  )
}
