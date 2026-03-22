"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { modalitiesBySlugRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { getModalityContent } from "@/lib/modality-content"
import type { ModalityDetailReadable } from "@/src/client/types.gen"
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
import ModalityRelatedSection from "./modality-related-section"

interface ModalityPageContentProps {
  slug: string
}

export default function ModalityPageContent({ slug }: ModalityPageContentProps) {
  const { data: modality, isLoading } = useQuery({
    ...modalitiesBySlugRetrieveOptions({ path: { slug } }),
  })

  // Cast once to access all fields cleanly
  const mod = modality as ModalityDetailReadable | undefined

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

  const modalityName = mod?.name || slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  const editorial = getModalityContent(slug, modalityName, mod?.description)

  // API data takes precedence over editorial content
  const apiBenefits = mod?.benefits as string[] | undefined
  const apiFaqs = mod?.faqs as { question: string; answer: string }[] | undefined

  const benefits = apiBenefits?.length
    ? apiBenefits.map((b) => ({ title: b, description: "" }))
    : editorial.benefits

  const faqs = apiFaqs?.length ? apiFaqs : editorial.faqs
  const longDescription = mod?.long_description || editorial.longDescription
  const relatedSlugs = (mod?.related_modality_slugs || []).filter(Boolean) as string[]

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
            {mod?.category_name && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/modalities#${mod.category_slug}`}>
                      {mod.category_name}
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
      {mod?.gray_zone && (
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
        practitionerCount={mod?.practitioner_count ?? 0}
        serviceCount={mod?.service_count ?? 0}
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

      {relatedSlugs.length > 0 && (
        <>
          <div className="h-px bg-sage-200/60 mx-6" />
          <ModalityRelatedSection slugs={relatedSlugs} />
        </>
      )}

      <div className="h-px bg-sage-200/60 mx-6" />

      <ModalityCtaSection
        heading={editorial.ctaHeading}
        description={editorial.ctaDescription}
        slug={slug}
      />
    </main>
  )
}
