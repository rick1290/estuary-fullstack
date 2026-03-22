import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/checkout/", "/room/", "/test-*", "/api/"],
      },
      // Explicitly allow AI crawlers to access public content
      {
        userAgent: "GPTBot",
        allow: ["/", "/modalities/", "/marketplace/", "/practitioners/", "/sessions/", "/workshops/", "/courses/", "/streams/", "/llms.txt"],
        disallow: ["/dashboard/", "/checkout/", "/room/", "/api/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/modalities/", "/marketplace/", "/streams/", "/llms.txt"],
        disallow: ["/dashboard/", "/checkout/", "/room/", "/api/"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/modalities/", "/marketplace/", "/streams/", "/llms.txt"],
        disallow: ["/dashboard/", "/checkout/", "/room/", "/api/"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/dashboard/", "/checkout/", "/room/", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/dashboard/", "/checkout/", "/room/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
