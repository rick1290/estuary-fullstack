import type { Metadata } from "next"

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.estuarywellness.com"
export const SITE_NAME = "Estuary"
export const SITE_DESCRIPTION =
  "Connect with expert practitioners and book transformative wellness services — sessions, workshops, and courses — all in one place."
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

export function buildTitle(pageTitle: string): string {
  return `${pageTitle} | ${SITE_NAME}`
}

export function truncateDescription(text: string, maxLen = 155): string {
  if (!text) return SITE_DESCRIPTION
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLen) return cleaned
  const truncated = cleaned.slice(0, maxLen)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "..."
}

interface CreateMetadataOptions {
  title: string
  description?: string
  path?: string
  ogImage?: string
  type?: "website" | "article" | "profile"
  noIndex?: boolean
}

export function createMetadata({
  title,
  description,
  path,
  ogImage,
  type = "website",
  noIndex = false,
}: CreateMetadataOptions): Metadata {
  const desc = description ? truncateDescription(description) : SITE_DESCRIPTION
  const url = path ? `${SITE_URL}${path}` : SITE_URL
  const image = ogImage || DEFAULT_OG_IMAGE

  return {
    title,
    description: desc,
    openGraph: {
      title: buildTitle(title),
      description: desc,
      url,
      siteName: SITE_NAME,
      type,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: buildTitle(title),
      description: desc,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
    ...(noIndex && {
      robots: { index: false, follow: false },
    }),
  }
}
