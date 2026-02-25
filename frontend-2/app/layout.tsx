import type React from "react"
import type { Metadata } from "next"
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
      <body className={`${dmSans.className} ${dmSans.variable} font-sans`}>
        <Providers>
          <ThemeProvider>
            <ClientLayout>{children}</ClientLayout>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
