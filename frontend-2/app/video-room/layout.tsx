import type React from "react"
import { Quicksand } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-quicksand",
})

export default function VideoRoomLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${quicksand.className} font-sans h-screen w-screen overflow-hidden bg-background`}>
      <ThemeProvider>
        {/* No navigation or footer here - just the content */}
        <main className="h-full w-full">{children}</main>
      </ThemeProvider>
    </div>
  )
}
