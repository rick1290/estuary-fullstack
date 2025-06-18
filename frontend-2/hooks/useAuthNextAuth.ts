"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { UserLoginRequest, UserProfileReadable } from "@/src/client/types.gen"

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: UserLoginRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
      })
      
      if (result?.error) {
        setError(result.error)
        throw new Error(result.error)
      }
      
      if (result?.ok) {
        // Trigger a session update to get the latest user data
        await update()
        return true
      }
      
      throw new Error("Login failed")
    } catch (err: any) {
      setError(err.message || "Login failed")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await signOut({ redirect: false })
    router.push("/")
  }

  const refreshSession = async () => {
    await update()
  }

  return {
    user: session?.user as UserProfileReadable | null,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading" || isLoading,
    error,
    login,
    logout,
    refreshSession,
    session,
  }
}