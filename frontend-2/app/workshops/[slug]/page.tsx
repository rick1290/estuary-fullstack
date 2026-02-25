import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { eventSchema, breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE_URL } from "@/lib/seo"
import { publicServicesBySlugRetrieve } from "@/src/client/sdk.gen"
import WorkshopPage from "./workshop-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const { data } = await publicServicesBySlugRetrieve({ path: { slug } })
    return createMetadata({
      title: data?.title || "Workshop",
      description: data?.description || "",
      path: `/workshops/${slug}`,
      ogImage: data?.cover_image_url || undefined,
    })
  } catch {
    return createMetadata({ title: "Workshop", path: `/workshops/${slug}` })
  }
}

export default async function WorkshopServerPage({ params }: PageProps) {
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
          <JsonLd data={eventSchema(serviceData, "workshop")} />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Workshops", url: `${SITE_URL}/marketplace/workshops` },
              { name: serviceData.title || "Workshop", url: `${SITE_URL}/workshops/${slug}` },
            ])}
          />
        </>
      )}
      <WorkshopPage params={params} />
    </>
  )
}
