"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import type { UserProfileReadable } from "@/src/client/types.gen"

// Define user types
type UserRole = "user" | "practitioner"

interface User {
  id: string
  numericId?: number
  firstName: string
  lastName: string
  email: string
  role: UserRole
  hasPractitionerAccount: boolean
  practitionerId?: number | null
  practitionerPublicId?: string | null
  practitioner_slug?: string | null
}

// Helper function to convert API user to our User type
function convertAPIUser(apiUser: UserProfileReadable): User {
  // Determine role based on practitioner profile existence and localStorage preference
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null
  const hasPractitionerProfile = !!apiUser.practitioner_id

  let role: UserRole = "user"
  if (hasPractitionerProfile) {
    // If user has practitioner profile, use stored preference or default to practitioner
    role = (storedRole as UserRole) || "practitioner"
  } else {
    role = "user"
  }

  return {
    id: apiUser.id.toString(),
    numericId: apiUser.id,
    firstName: apiUser.first_name || "",
    lastName: apiUser.last_name || "",
    email: apiUser.email,
    role: role,
    hasPractitionerAccount: hasPractitionerProfile,
    practitionerId: apiUser.practitioner_id || null,
    practitionerPublicId: apiUser.practitioner_public_id || null,
    practitioner_slug: apiUser.practitioner_slug || null,
  }
}

// Custom hook to use auth with NextAuth
export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 1

  // Guard against re-entrant logout/refresh calls
  const isHandlingErrorRef = useRef(false)

  // Handle logout using useCallback to avoid dependency issues
  const logout = useCallback(async () => {
    if (isHandlingErrorRef.current) return // Prevent re-entrant calls
    try {
      isHandlingErrorRef.current = true
      localStorage.removeItem("userRole")
      retryCountRef.current = 0
      await signOut({ redirect: false })
      router.push("/")
    } catch (error) {
      // Silently fail — don't log or retry, prevents cascade
    } finally {
      isHandlingErrorRef.current = false
    }
  }, [router])

  // Handle session refresh with retry logic — guarded against infinite loops
  const handleSessionError = useCallback(async () => {
    if (isHandlingErrorRef.current) return false // Already handling
    isHandlingErrorRef.current = true

    try {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        try {
          const newSession = await update()
          if (newSession && !newSession.error) {
            retryCountRef.current = 0
            return true
          }
        } catch {
          // Refresh failed — don't cascade
        }
      }

      // Exhausted retries — logout silently
      localStorage.removeItem("userRole")
      retryCountRef.current = 0
      try {
        await signOut({ redirect: false })
        router.push("/")
      } catch {
        // If even signOut fails (network down), just redirect
        router.push("/")
      }
      return false
    } finally {
      isHandlingErrorRef.current = false
    }
  }, [update, router])

  // Listen for 401 errors from API calls — debounced to prevent floods
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null

    const handleUnauthorized = () => {
      // Debounce: only handle once per 5 seconds
      if (debounceTimer) return
      debounceTimer = setTimeout(() => {
        debounceTimer = null
      }, 5000)

      // Don't call update() directly — it can trigger more 401s
      // Instead, just let the session effect handle it on next render
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [])

  // Convert session user to our User type and handle errors
  useEffect(() => {
    // Check for session errors
    if (session?.error === "RefreshAccessTokenError") {
      // Don't immediately logout - try to handle gracefully
      handleSessionError()
      return
    }

    // Reset retry count on successful session
    if (session && !session.error) {
      retryCountRef.current = 0
    }

    if (session?.user && typeof session.user === 'object' && 'id' in session.user) {
      setUser(convertAPIUser(session.user as UserProfileReadable))
    } else {
      setUser(null)
    }
  }, [session, handleSessionError])

  const login = async (email: string, password: string) => {
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        throw new Error(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error)
      }

      if (result?.ok) {
        // Reset retry count on successful login
        retryCountRef.current = 0

        // Store role preference based on practitioner profile
        const updatedSession = await update()
        if (updatedSession?.user && 'practitioner_id' in updatedSession.user) {
          const role = updatedSession.user.practitioner_id ? "practitioner" : "user"
          localStorage.setItem("userRole", role)
        }
        return
      }

      throw new Error("Login failed")
    } catch (err: any) {
      throw err
    } finally {
      setIsLoading(false)
    }
  }


  const refreshUser = async () => {
    await update()
  }

  const switchRole = () => {
    if (!user || !user.hasPractitionerAccount) return

    const newRole = user.role === "user" ? "practitioner" : "user"

    // Update stored role
    localStorage.setItem("userRole", newRole)

    // Update user state
    setUser({
      ...user,
      role: newRole,
    })
  }

  return {
    user,
    isAuthenticated: status === "authenticated",
    isPractitioner: user?.role === "practitioner",
    isLoading: status === "loading" || isLoading,
    login,
    logout,
    switchRole,
    refreshUser,
  }
}
