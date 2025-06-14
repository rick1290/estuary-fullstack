"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import PractitionerApplicationForm from "@/components/practitioners/practitioner-application-form"

export default function PractitionerApplicationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const tier = searchParams.get("tier") || "flow"

  // Check authentication on mount and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const isLoggedInFromStorage = localStorage.getItem("isLoggedIn") === "true"
      console.log("Checking auth from localStorage:", isLoggedInFromStorage)
      setIsLoggedIn(isLoggedInFromStorage)
      setIsLoading(false)

      if (!isLoggedInFromStorage) {
        openAuthModal({
          defaultTab: "login",
          redirectUrl: `/become-practitioner/application?tier=${tier}`,
          serviceType: "practitioner-application",
          title: "Sign in to Apply",
          description: "Please sign in to complete your practitioner application"
        })
      }
    }

    // Check immediately
    checkAuth()

    // Also set up a listener for storage changes (in case another tab logs in/out)
    const handleStorageChange = () => {
      checkAuth()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <>
      {isLoggedIn ? (
        <div className="container max-w-5xl mx-auto py-8 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Practitioner Application</h1>
            <p className="text-muted-foreground mb-6">
              Complete the following steps to set up your practitioner profile on Estuary.
            </p>

            {tier && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                <h2 className="font-semibold text-lg mb-1">
                  Selected Plan: {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  You've selected the {tier.charAt(0).toUpperCase() + tier.slice(1)} plan. You can change your
                  subscription tier later in your account settings.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <PractitionerApplicationForm selectedTier={tier} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-6">Please sign in to access the practitioner application.</p>
            <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={() => openAuthModal({
              defaultTab: "login",
              redirectUrl: `/become-practitioner/application?tier=${tier}`,
              serviceType: "practitioner-application",
              title: "Sign in to Apply",
              description: "Please sign in to complete your practitioner application"
            })}>
              Sign In
            </button>
            <div className="mt-4 text-sm text-muted-foreground">
              Auth state: {isLoggedIn ? "Logged in" : "Not logged in"}
              <br />
              <button
                className="text-primary underline mt-2"
                onClick={() => {
                  // Force login for testing
                  localStorage.setItem("isLoggedIn", "true")
                  localStorage.setItem("userEmail", "user@example.com")
                  localStorage.setItem("userRole", "user")
                  setIsLoggedIn(true)
                }}
              >
                Force login (for testing)
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
