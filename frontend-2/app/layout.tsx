import type React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import ClientLayout from "./client-layout"
import { Providers } from "./providers"
import { SITE_URL, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from "@/lib/seo"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Estuary | Wellness Marketplace",
    template: "%s | Estuary",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Estuary",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-friendly site description" />
      </head>
      <body className={`${dmSans.className} ${dmSans.variable} font-sans`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-olive-900">
          Skip to main content
        </a>
        <Providers>
          <ThemeProvider>
            <ClientLayout><main id="main-content">{children}</main></ClientLayout>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
