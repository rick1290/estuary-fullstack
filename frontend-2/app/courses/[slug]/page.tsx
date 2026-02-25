import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { eventSchema, breadcrumbSchema } from "@/lib/json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE_URL } from "@/lib/seo"
import { publicServicesBySlugRetrieve } from "@/src/client/sdk.gen"
import CourseDetailsPage from "./course-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const { data } = await publicServicesBySlugRetrieve({ path: { slug } })
    return createMetadata({
      title: data?.title || "Course",
      description: data?.description || "",
      path: `/courses/${slug}`,
      ogImage: data?.cover_image_url || undefined,
    })
  } catch {
    return createMetadata({ title: "Course", path: `/courses/${slug}` })
  }
}

export default async function CourseServerPage({ params }: PageProps) {
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
          <JsonLd data={eventSchema(serviceData, "course")} />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Courses", url: `${SITE_URL}/marketplace/courses` },
              { name: serviceData.title || "Course", url: `${SITE_URL}/courses/${slug}` },
            ])}
          />
        </>
      )}
      <CourseDetailsPage params={params} />
    </>
  )
}
