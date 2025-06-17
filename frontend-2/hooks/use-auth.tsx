"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { AuthService } from "@/lib/auth-service"
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
}

// Define auth context type
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isPractitioner: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchRole: () => void
  refreshUser: () => Promise<void>
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isPractitioner: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  switchRole: () => {},
  refreshUser: async () => {},
})

// Helper function to convert API user to our User type
function convertAPIUser(apiUser: UserProfileReadable): User {
  const role = localStorage.getItem("userRole") || "user"
  
  return {
    id: apiUser.id.toString(),
    firstName: apiUser.first_name || "",
    lastName: apiUser.last_name || "",
    email: apiUser.email,
    role: role as UserRole,
    hasPractitionerAccount: apiUser.is_practitioner || false,
  }
}

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const apiUser = await AuthService.getCurrentUser()
        
        if (apiUser) {
          setUser(convertAPIUser(apiUser))
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Authentication check failed:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    console.log('useAuth.login called with:', { email, password })
    try {
      const { user: apiUser } = await AuthService.login({ email, password })
      
      // Store role preference
      const role = apiUser.is_practitioner ? "practitioner" : "user"
      localStorage.setItem("userRole", role)
      
      setUser(convertAPIUser(apiUser))
    } catch (error: any) {
      console.error("Login failed:", error)
      
      // Extract error message from API response
      let errorMessage = "Login failed"
      
      if (error?.error?.detail) {
        errorMessage = error.error.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await AuthService.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("userRole")
      setUser(null)
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    try {
      const apiUser = await AuthService.getCurrentUser()
      
      if (apiUser) {
        setUser(convertAPIUser(apiUser))
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to refresh user:", error)
      setUser(null)
    }
  }

  // Switch between user and practitioner roles
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

  // Compute derived state
  const isAuthenticated = !!user
  const isPractitioner = user?.role === "practitioner"

  // Provide auth context - always render children even while loading
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isPractitioner,
        isLoading,
        login,
        logout,
        switchRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}