"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DoorClosedIcon as CloseIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface LoginModalProps {
  open: boolean
  onClose: () => void
  redirectUrl?: string
  serviceType?: string
}

export default function LoginModal({ open, onClose, redirectUrl, serviceType = "service" }: LoginModalProps) {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginSuccessful, setLoginSuccessful] = useState(false)

  // Handle redirection after successful login
  useEffect(() => {
    if (loginSuccessful && redirectUrl) {
      // Use a short timeout to ensure state updates have propagated
      const redirectTimer = setTimeout(() => {
        console.log("Redirecting to:", redirectUrl)

        // For testing purposes, we'll force a direct navigation
        window.location.href = redirectUrl
      }, 500)

      return () => clearTimeout(redirectTimer)
    }
  }, [loginSuccessful, redirectUrl])

  const getActionText = () => {
    switch (serviceType) {
      case "course":
        return "enroll in this course"
      case "workshop":
        return "register for this workshop"
      case "package":
        return "purchase this package"
      case "practitioner-application":
        return "complete your application"
      default:
        return "book this session"
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    setLoginSuccessful(false)

    try {
      // Accept any of our test accounts
      const validTestCredentials = [
        { email: "testuser@example.com", password: "test1234" },
        { email: "user@example.com", password: "password123" },
        { email: "practitioner@example.com", password: "password123" },
      ]

      const isValidTestCredential = validTestCredentials.some(
        (cred) => cred.email === email && cred.password === password,
      )

      if (isValidTestCredential) {
        await login(email, password)
        console.log("Login successful, setting state")
        setLoginSuccessful(true)

        // Close the modal
        onClose()

        // For testing purposes, directly set localStorage
        localStorage.setItem("isLoggedIn", "true")
        localStorage.setItem("userEmail", email)
        localStorage.setItem("userRole", "user")

        // Direct redirection for testing purposes
        if (redirectUrl) {
          console.log("Redirecting to:", redirectUrl)
          window.location.href = redirectUrl
        }
      } else {
        setError("Invalid credentials. Try testuser@example.com / test1234")
      }
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)
    setLoginSuccessful(false)

    try {
      // Simulate Google login for demo purposes
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Instead of using the login function which might not update state properly,
      // directly set the localStorage values
      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("userEmail", "user@example.com")
      localStorage.setItem("userRole", "user")

      console.log("Google login successful, setting state")
      setLoginSuccessful(true)

      // Close the modal
      onClose()

      // Direct redirection for testing purposes
      if (redirectUrl) {
        console.log("Redirecting to:", redirectUrl)
        // Add a small delay to ensure localStorage is set
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 100)
      }
    } catch (err) {
      setError("Google login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Sign in to continue</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <CloseIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <DialogDescription>Please sign in or create an account to {getActionText()}.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">OR</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
          <svg
            className="mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="48px"
            height="48px"
          >
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => {
                setEmail("testuser@example.com")
                setPassword("test1234")
              }}
            >
              Sign up
            </Button>
          </p>
        </div>

        <DialogFooter className="justify-center">
          <p className="text-xs text-muted-foreground">For testing purposes, use: testuser@example.com / test1234</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
