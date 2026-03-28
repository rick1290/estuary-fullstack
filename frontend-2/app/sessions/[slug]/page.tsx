import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { serviceSchema, breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE_URL } from "@/lib/seo"
import { publicServicesBySlugRetrieve } from "@/src/client/sdk.gen"
import SessionDetailsPage from "./session-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const { data } = await publicServicesBySlugRetrieve({ path: { slug } })
    const title = data?.title || "Session"
    const duration = data?.duration_minutes ? `${data.duration_minutes} min` : ""
    const locationType = data?.location_type === "virtual" ? "Virtual" : data?.location_type === "in_person" ? "In-Person" : ""
    const practitioner = data?.practitioner_name || ""
    const titleParts = [title, duration, locationType].filter(Boolean).join(" · ")

    const fallbackDesc = [
      `Book this ${duration || ""} session`,
      practitioner ? ` with ${practitioner}` : "",
      ". View availability, pricing, and reviews on Estuary.",
    ].join("")

    return createMetadata({
      title: titleParts,
      description: data?.short_description || data?.description || fallbackDesc,
      path: `/sessions/${slug}`,
      ogImage: data?.cover_image_url || undefined,
    })
  } catch {
    return createMetadata({ title: "Session", path: `/sessions/${slug}` })
  }
}

export default async function SessionServerPage({ params }: PageProps) {
  const { slug } = await params

  let serviceData: any = null
  try {
    const { data } = await publicServicesBySlugRetrieve({ path: { slug } })
    serviceData = data
  } catch {
    // Client component will handle loading
  }

  return (
    <>
      {serviceData && (
        <>
          <JsonLd data={serviceSchema(serviceData, "one-on-one")} />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Sessions", url: `${SITE_URL}/marketplace/sessions` },
              { name: serviceData.title || "Session", url: `${SITE_URL}/sessions/${slug}` },
            ])}
          />
        </>
      )}
      <SessionDetailsPage params={params} />
    </>
  )
}
