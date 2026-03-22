import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"
import { publicServicesList, publicPractitionersList, modalitiesList, modalityCategoriesList } from "@/src/client/sdk.gen"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/marketplace`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/marketplace/sessions`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/marketplace/workshops`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/marketplace/courses`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/marketplace/bundles`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/marketplace/practitioners`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/modalities`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/mission`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/become-practitioner`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/streams`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/careers`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ]

  let servicePages: MetadataRoute.Sitemap = []
  let practitionerPages: MetadataRoute.Sitemap = []
  let modalityPages: MetadataRoute.Sitemap = []
  let modalityCategoryPages: MetadataRoute.Sitemap = []

  try {
    const { data: servicesData } = await publicServicesList({
      query: { page_size: 1000, is_active: true },
    })
    const services = servicesData?.results || []
    servicePages = services.map((service: any) => {
      const serviceType = service.service_type?.name?.toLowerCase() || "session"
      const prefix =
        serviceType === "workshop"
          ? "workshops"
          : serviceType === "course"
            ? "courses"
            : serviceType === "bundle"
              ? "bundles"
              : serviceType === "package"
                ? "packages"
                : "sessions"
      return {
        url: `${SITE_URL}/${prefix}/${service.slug}`,
        lastModified: service.updated_at ? new Date(service.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }
    })
  } catch {
    // API may be unavailable during build
  }

  try {
    const { data: practitionersData } = await publicPractitionersList({
      query: { page_size: 1000 },
    })
    const practitioners = practitionersData?.results || []
    practitionerPages = practitioners.map((p: any) => ({
      url: `${SITE_URL}/practitioners/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  } catch {
    // API may be unavailable during build
  }

  try {
    const { data: modalitiesData } = await modalitiesList({
      query: { page_size: 100 },
    })
    const modalities = modalitiesData?.results || []
    modalityPages = modalities.map((m: any) => ({
      url: `${SITE_URL}/modalities/${m.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  } catch {
    // API may be unavailable during build
  }

  try {
    const { data: categoriesData } = await modalityCategoriesList({
      query: { page_size: 50 },
    })
    const categories = categoriesData?.results || []
    modalityCategoryPages = categories.map((c: any) => ({
      url: `${SITE_URL}/modalities/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  } catch {
    // API may be unavailable during build
  }

  return [...staticPages, ...servicePages, ...practitionerPages, ...modalityPages, ...modalityCategoryPages]
}
