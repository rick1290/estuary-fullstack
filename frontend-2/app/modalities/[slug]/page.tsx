import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { faqSchema, breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import { getModalityContent } from "@/lib/modality-content"
import { SITE_URL } from "@/lib/seo"
import ModalityPageContent from "@/components/modalities/modality-page-content"

function toTitleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

interface ModalityPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ModalityPageProps): Promise<Metadata> {
  const { slug } = await params
  const name = toTitleCase(slug)

  return createMetadata({
    title: `${name} Services & Practitioners`,
    description: `Explore ${name.toLowerCase()} sessions, workshops, and courses on Estuary. Connect with experienced ${name.toLowerCase()} practitioners and start your wellness journey.`,
    path: `/modalities/${slug}`,
  })
}

export default async function ModalityPage({ params }: ModalityPageProps) {
  const { slug } = await params
  const name = toTitleCase(slug)
  const content = getModalityContent(slug, name)

  return (
    <>
      <JsonLd data={faqSchema(content.faqs)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Modalities", url: `${SITE_URL}/modalities` },
          { name, url: `${SITE_URL}/modalities/${slug}` },
        ])}
      />
      <ModalityPageContent slug={slug} />
    </>
  )
}
