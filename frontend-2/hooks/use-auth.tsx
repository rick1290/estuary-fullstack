"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { UserProfileReadable } from "@/src/client/types.gen"

// Define user types
type UserRole = "user" | "practitioner"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  hasPractitionerAccount: boolean
  practitionerId?: number | null
  practitionerPublicId?: string | null
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
    firstName: apiUser.first_name || "",
    lastName: apiUser.last_name || "",
    email: apiUser.email,
    role: role,
    hasPractitionerAccount: hasPractitionerProfile,
    practitionerId: apiUser.practitioner_id || null,
    practitionerPublicId: apiUser.practitioner_public_id || null,
  }
}

// Custom hook to use auth with NextAuth
export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Convert session user to our User type
  useEffect(() => {
    if (session?.user && typeof session.user === 'object' && 'id' in session.user) {
      setUser(convertAPIUser(session.user as UserProfileReadable))
    } else {
      setUser(null)
    }
  }, [session])

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

  const logout = async () => {
    try {
      localStorage.removeItem("userRole")
      await signOut({ redirect: false })
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
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