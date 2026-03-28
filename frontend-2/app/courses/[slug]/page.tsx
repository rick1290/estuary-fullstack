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
    const title = data?.title || "Course"
    const sessionCount = data?.sessions_count || data?.total_sessions || ""
    const practitioner = data?.practitioner_name || ""
    const suffix = sessionCount ? `${sessionCount}-Session Course` : "Course"

    const fallbackDesc = [
      `Enroll in this ${suffix.toLowerCase()}`,
      practitioner ? ` with ${practitioner}` : "",
      ". View curriculum, schedule, and pricing on Estuary.",
    ].join("")

    return createMetadata({
      title: `${title} · ${suffix}`,
      description: data?.short_description || data?.description || fallbackDesc,
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
