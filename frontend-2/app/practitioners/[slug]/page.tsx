import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { personSchema, breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE_URL } from "@/lib/seo"
import { publicPractitionersBySlugRetrieve } from "@/src/client/sdk.gen"
import PractitionerPage from "./practitioner-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const { data } = await publicPractitionersBySlugRetrieve({ path: { slug } })
    const name = data?.display_name || data?.full_name || "Practitioner"
    const bio = data?.bio || ""

    return createMetadata({
      title: name,
      description: bio || `View ${name}'s profile, services, and availability on Estuary.`,
      path: `/practitioners/${slug}`,
      type: "profile",
    })
  } catch {
    return createMetadata({
      title: "Practitioner",
      path: `/practitioners/${slug}`,
    })
  }
}

export default async function PractitionerServerPage({ params }: PageProps) {
  const { slug } = await params

  let practitionerData: any = null
  try {
    const { data } = await publicPractitionersBySlugRetrieve({ path: { slug } })
    practitionerData = data
  } catch {
    // Client component will handle loading
  }

  return (
    <>
      {practitionerData && (
        <>
          <JsonLd data={personSchema(practitionerData)} />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Practitioners", url: `${SITE_URL}/marketplace/practitioners` },
              { name: practitionerData.display_name || practitionerData.full_name || "Practitioner", url: `${SITE_URL}/practitioners/${slug}` },
            ])}
          />
        </>
      )}
      <PractitionerPage params={params} />
    </>
  )
}
