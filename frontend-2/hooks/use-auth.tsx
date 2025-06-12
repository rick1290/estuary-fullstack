"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

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
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  switchRole: () => void
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isPractitioner: false,
  login: async () => {},
  logout: () => {},
  switchRole: () => {},
})

// Mock user data for demonstration
const MOCK_USERS = {
  "user@example.com": {
    id: "user-123",
    firstName: "John",
    lastName: "Doe",
    email: "user@example.com",
    role: "user",
    hasPractitionerAccount: true,
  },
  "practitioner@example.com": {
    id: "practitioner-456",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "practitioner@example.com",
    role: "practitioner",
    hasPractitionerAccount: true,
  },
  "testuser@example.com": {
    id: "test-789",
    firstName: "Test",
    lastName: "User",
    email: "testuser@example.com",
    role: "user",
    hasPractitionerAccount: false,
  },
}

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is authenticated on mount
  useEffect(() => {
    // In a real app, this would check for a token in localStorage or cookies
    // and validate it with the server
    const checkAuth = async () => {
      try {
        // Mock authentication check
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"

        if (isLoggedIn) {
          // Get stored email and role
          const storedEmail = localStorage.getItem("userEmail") || ""
          const storedRole = localStorage.getItem("userRole") || "user"

          // Set user based on email or default to the first mock user
          const mockUser = MOCK_USERS[storedEmail as keyof typeof MOCK_USERS] || MOCK_USERS["user@example.com"]

          setUser({
            ...mockUser,
            role: storedRole as UserRole,
          })
        }
      } catch (error) {
        console.error("Authentication check failed:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    try {
      // Mock login - in a real app, this would call an API
      console.log("Logging in with:", email, password)

      // Check if password is correct for test user
      if (email === "testuser@example.com" && password !== "test1234") {
        throw new Error("Invalid password")
      }

      // Determine if this is a practitioner login
      const isPractitioner = email === "practitioner@example.com"
      const role = isPractitioner ? "practitioner" : "user"

      // Get the mock user data
      const mockUser = MOCK_USERS[email as keyof typeof MOCK_USERS]

      if (!mockUser) {
        throw new Error("User not found")
      }

      // Store auth state
      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("userEmail", email)
      localStorage.setItem("userRole", role)

      // Set user
      setUser({
        ...mockUser,
        role: role as UserRole,
      })
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  // Logout function
  const logout = () => {
    // Clear auth state
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userRole")

    // Clear user
    setUser(null)
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

  // Provide auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isPractitioner,
        login,
        logout,
        switchRole,
      }}
    >
      {!loading && children}
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
