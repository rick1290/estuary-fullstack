"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { modalitiesBySlugRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
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
import ModalityStatsBar from "./modality-stats-bar"
import ModalityAboutSection from "./modality-about-section"
import ModalityServicesSection from "./modality-services-section"
import ModalityPractitionersSection from "./modality-practitioners-section"
import ModalityFaqSection from "./modality-faq-section"
import ModalityCtaSection from "./modality-cta-section"

interface ModalityPageContentProps {
  slug: string
}

export default function ModalityPageContent({ slug }: ModalityPageContentProps) {
  const { data: modality, isLoading } = useQuery({
    ...modalitiesBySlugRetrieveOptions({ path: { slug } }),
  })

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
  const editorial = getModalityContent(slug, modalityName, modality?.description)

  // Merge backend data with editorial content — backend data takes precedence when available
  const apiBenefits = (modality as any)?.benefits
  const apiFaqs = (modality as any)?.faqs
  const apiLongDesc = (modality as any)?.long_description

  const benefits = apiBenefits?.length > 0
    ? apiBenefits.map((b: string) => ({ title: b, description: "" }))
    : editorial.benefits

  const faqs = apiFaqs?.length > 0 ? apiFaqs : editorial.faqs
  const longDescription = apiLongDesc || editorial.longDescription

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
            {(modality as any)?.category_name && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/modalities#${(modality as any).category_slug}`}>
                      {(modality as any).category_name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{modalityName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <ModalityHeroSection content={editorial} />

      {/* Gray zone disclaimer for modalities that overlap with licensed therapy */}
      {(modality as any)?.gray_zone && (
        <div className="container max-w-3xl px-4 sm:px-6 mt-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            <p className="font-medium mb-1">Important note</p>
            <p className="font-light leading-relaxed">
              {modalityName} may overlap with licensed mental health practices. Practitioners on
              Estuary offering {modalityName.toLowerCase()} are wellness providers, not licensed
              therapists, unless specifically stated in their profile. If you are experiencing a
              mental health crisis, please contact a licensed professional.
            </p>
          </div>
        </div>
      )}

      <ModalityStatsBar
        practitionerCount={modality?.practitioner_count ?? 0}
        serviceCount={modality?.service_count ?? 0}
        modalityName={modalityName}
      />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityAboutSection
        modalityName={modalityName}
        longDescription={longDescription}
        benefits={benefits}
      />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityServicesSection slug={slug} modalityName={modalityName} />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityPractitionersSection slug={slug} modalityName={modalityName} />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityFaqSection faqs={faqs} />

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityCtaSection
        heading={editorial.ctaHeading}
        description={editorial.ctaDescription}
        slug={slug}
      />
    </main>
  )
}
