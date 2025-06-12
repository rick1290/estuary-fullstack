import type React from "react"
import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import ClientLayout from "./client-layout"
import { Providers } from "./providers"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "Estuary Marketplace",
  description: "Connect with practitioners and book wellness services",
    generator: 'v0.dev'
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
