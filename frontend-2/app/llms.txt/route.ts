import { SITE_URL } from "@/lib/seo"

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

export async function GET() {
  let modalityLines = ""
  let categoryLines = ""

  try {
    const [modRes, catRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/modalities/?page_size=200&is_active=true`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/api/v1/modality-categories/?page_size=50`, { next: { revalidate: 3600 } }),
    ])

    if (modRes.ok) {
      const modJson = await modRes.json()
      const modalities = modJson?.data?.results || modJson?.results || []
      modalityLines = modalities
        .map((m: any) => `- [${m.name}](${SITE_URL}/modalities/${m.slug}): ${m.short_description || m.description || ""}`)
        .join("\n")
    }

    if (catRes.ok) {
      const catJson = await catRes.json()
      const categories = catJson?.data?.results || catJson?.results || []
      categoryLines = categories
        .map((c: any) => `- [${c.name}](${SITE_URL}/modalities/category/${c.slug}): ${c.short_description || ""}`)
        .join("\n")
    }
  } catch {
    // API unavailable — serve static content only
  }

  const content = `# Estuary Wellness Marketplace

> Estuary is an online wellness marketplace connecting people with expert practitioners across 113+ modalities — from yoga and breathwork to energy healing and life coaching. Users can book one-on-one sessions, group workshops, multi-week courses, and session packages.

## What Estuary Offers

- **One-on-one sessions**: Private appointments with individual practitioners
- **Workshops**: Group experiences with specific dates and times
- **Courses**: Structured multi-session learning journeys
- **Packages & Bundles**: Discounted session bundles for committed practice
- **Streams**: Free and premium wellness content (articles, videos, audio)

## Key Pages

- [Homepage](${SITE_URL}): Main landing page
- [Marketplace](${SITE_URL}/marketplace): Browse all services
- [Sessions](${SITE_URL}/marketplace/sessions): One-on-one sessions
- [Workshops](${SITE_URL}/marketplace/workshops): Group workshops
- [Courses](${SITE_URL}/marketplace/courses): Multi-session courses
- [Practitioners](${SITE_URL}/marketplace/practitioners): Browse practitioners
- [Modalities](${SITE_URL}/modalities): Browse all 113 wellness modalities
- [Streams](${SITE_URL}/streams): Wellness content platform
- [Become a Practitioner](${SITE_URL}/become-practitioner): Practitioner signup

## Modality Categories (${categoryLines ? "13 categories" : ""})

${categoryLines || "Categories are available at " + SITE_URL + "/modalities"}

## All Modalities (113)

${modalityLines || "Full modality listing available at " + SITE_URL + "/modalities"}

## API

- Sitemap: ${SITE_URL}/sitemap.xml
- OpenAPI Schema: ${SITE_URL.replace("www.estuarywellness.com", "api.estuarywellness.com")}/api/v1/schema/

## About

Estuary is a two-sided wellness marketplace. Practitioners create profiles, set availability, and offer services. Clients discover practitioners through modality-based search, book services, and attend sessions (virtual or in-person). The platform handles scheduling, payments, and video conferencing.

## Contact

- Website: ${SITE_URL}
- Email: hello@estuarywellness.com
`

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
