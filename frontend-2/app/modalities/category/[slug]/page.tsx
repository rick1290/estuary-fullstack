import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { SITE_URL } from "@/lib/seo"
import { breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import ModalityCategoryPageContent from "@/components/modalities/modality-category-page-content"

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

async function fetchCategory(slug: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/modality-categories/?page_size=50`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const results = json?.data?.results || json?.results || []
    return results.find((c: any) => c.slug === slug) || null
  } catch {
    return null
  }
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/api/v1/modality-categories/?page_size=50`)
    if (!res.ok) return []
    const json = await res.json()
    const results = json?.data?.results || json?.results || []
    return results.map((c: any) => ({ slug: c.slug })).filter((p: any) => p.slug)
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await fetchCategory(slug)

  const name = category?.name || toTitleCase(slug)
  const description =
    category?.seo_meta_description ||
    category?.short_description ||
    `Explore ${name} modalities on Estuary. Find practitioners and services in ${name.toLowerCase()}.`

  return createMetadata({
    title: `${name} Modalities`,
    description,
    path: `/modalities/category/${slug}`,
  })
}

export default async function ModalityCategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const category = await fetchCategory(slug)
  const name = category?.name || toTitleCase(slug)

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Modalities", url: `${SITE_URL}/modalities` },
          { name, url: `${SITE_URL}/modalities/category/${slug}` },
        ])}
      />
      <ModalityCategoryPageContent slug={slug} />
    </>
  )
}
