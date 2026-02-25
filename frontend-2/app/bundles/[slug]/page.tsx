import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { serviceSchema, breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE_URL } from "@/lib/seo"
import { publicServicesBySlugRetrieve } from "@/src/client/sdk.gen"
import BundleDetailsPage from "./bundle-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const { data } = await publicServicesBySlugRetrieve({ path: { slug } })
    return createMetadata({
      title: data?.title || "Bundle",
      description: data?.description || "",
      path: `/bundles/${slug}`,
      ogImage: data?.cover_image_url || undefined,
    })
  } catch {
    return createMetadata({ title: "Bundle", path: `/bundles/${slug}` })
  }
}

export default async function BundleServerPage({ params }: PageProps) {
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
          <JsonLd data={serviceSchema(serviceData, "bundle")} />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Sessions", url: `${SITE_URL}/marketplace/sessions` },
              { name: serviceData.title || "Bundle", url: `${SITE_URL}/bundles/${slug}` },
            ])}
          />
        </>
      )}
      <BundleDetailsPage params={params} />
    </>
  )
}
