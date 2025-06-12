import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import ClientLayout from "./client-layout"
import { Providers } from "./providers"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-inter",
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
      <body className={`${inter.className} font-sans`}>
        <Providers>
          <ThemeProvider>
            <ClientLayout>{children}</ClientLayout>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
