import { createMetadata, SITE_URL } from "@/lib/seo"
import { itemListSchema, breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import ModalityIndexContent from "@/components/modalities/modality-index-content"

export const metadata = createMetadata({
  title: "Wellness Modalities",
  description:
    "Explore 113 wellness modalities across 13 categories on Estuary — yoga, breathwork, meditation, energy healing, coaching, and more. Find the practice that resonates with your journey.",
  path: "/modalities",
})

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

export default async function ModalitiesPage() {
  // Server-side fetch for JSON-LD structured data
  let modalityItems: { name: string; url: string; description?: string }[] = []
  try {
    const res = await fetch(`${API_URL}/api/v1/modalities/?page_size=200&is_active=true`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const json = await res.json()
      const results = json?.data?.results || json?.results || []
      modalityItems = results.map((m: any) => ({
        name: m.name,
        url: `${SITE_URL}/modalities/${m.slug}`,
        description: m.short_description || m.description,
      }))
    }
  } catch {
    // API unavailable — render without JSON-LD
  }

  return (
    <>
      {modalityItems.length > 0 && (
        <JsonLd data={itemListSchema("Wellness Modalities on Estuary", modalityItems)} />
      )}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Modalities", url: `${SITE_URL}/modalities` },
        ])}
      />
      <ModalityIndexContent />
    </>
  )
}
