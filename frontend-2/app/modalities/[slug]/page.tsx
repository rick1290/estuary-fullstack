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

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

async function fetchModality(slug: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/modalities/by-slug/${slug}/`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json?.data || json || null
  } catch {
    return null
  }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/api/v1/modalities/?page_size=200&is_active=true`)
    if (!res.ok) return []
    const json = await res.json()
    const results = json?.data?.results || json?.results || []
    return results.map((m: any) => ({ slug: m.slug })).filter((p: any) => p.slug)
  } catch {
    return []
  }
}

interface ModalityPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ModalityPageProps): Promise<Metadata> {
  const { slug } = await params
  const modality = await fetchModality(slug)

  const name = modality?.name || toTitleCase(slug)
  const seoTitle = modality?.seo_meta_title || `${name} Services & Practitioners`
  const seoDescription =
    modality?.seo_meta_description ||
    `Explore ${name.toLowerCase()} sessions, workshops, and courses on Estuary. Connect with experienced ${name.toLowerCase()} practitioners and start your wellness journey.`

  return createMetadata({
    title: seoTitle,
    description: seoDescription,
    path: `/modalities/${slug}`,
  })
}

export default async function ModalityPage({ params }: ModalityPageProps) {
  const { slug } = await params
  const modality = await fetchModality(slug)

  const name = modality?.name || toTitleCase(slug)
  const editorial = getModalityContent(slug, name, modality?.description)

  // Use API FAQs if available, otherwise editorial
  const faqs =
    modality?.faqs?.length > 0 ? modality.faqs : editorial.faqs

  const breadcrumbs = [
    { name: "Home", url: SITE_URL },
    { name: "Modalities", url: `${SITE_URL}/modalities` },
  ]
  if (modality?.category_name) {
    breadcrumbs.push({
      name: modality.category_name,
      url: `${SITE_URL}/modalities#${modality.category_slug}`,
    })
  }
  breadcrumbs.push({ name, url: `${SITE_URL}/modalities/${slug}` })

  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <ModalityPageContent slug={slug} />
    </>
  )
}
