"use client"

import { Suspense } from "react"
import { AuthModalProvider } from "./auth-provider"

export function AuthModalProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthModalProvider>{children}</AuthModalProvider>
    </Suspense>
  )
}