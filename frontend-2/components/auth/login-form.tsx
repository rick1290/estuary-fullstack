"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Eye, EyeOff, Mail, Lock, User, GraduationCap } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

// Test accounts for easy login
const TEST_ACCOUNTS = [
  {
    name: "John Doe",
    email: "user@example.com",
    password: "password123",
    role: "user",
    avatar: "J",
    description: "Regular user account",
  },
  {
    name: "Dr. Sarah Johnson",
    email: "practitioner@example.com",
    password: "password123",
    role: "practitioner",
    avatar: "S",
    description: "Practitioner account",
  },
  // Add the new test account
  {
    name: "Test User",
    email: "testuser@example.com",
    password: "test1234",
    role: "user",
    avatar: "T",
    description: "Test user account",
  },
]

export default function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTestAccounts, setShowTestAccounts] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Call login function from auth context
      await login(email, password)

      // Redirect to dashboard based on role
      const isPractitioner = email === "practitioner@example.com"
      router.push(isPractitioner ? "/dashboard/practitioner" : "/dashboard/user")
    } catch (err) {
      setError("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  const handleTestAccountSelect = (account: (typeof TEST_ACCOUNTS)[0]) => {
    setEmail(account.email)
    setPassword(account.password)
    setShowTestAccounts(false)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2 mb-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowTestAccounts(!showTestAccounts)}>
          {showTestAccounts ? "Hide Test Accounts" : "Show Test Accounts"}
        </Button>
        <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      {showTestAccounts && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h4 className="text-base font-medium mb-2">Test Accounts</h4>
            <p className="text-sm text-muted-foreground mb-4">Click on an account to auto-fill the login form:</p>
            <div className="space-y-2">
              {TEST_ACCOUNTS.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => handleTestAccountSelect(account)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className={account.role === "practitioner" ? "bg-primary" : "bg-secondary"}>
                        {account.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.description}</p>
                    </div>
                  </div>
                  {account.role === "practitioner" ? (
                    <GraduationCap className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full mb-4" disabled={loading}>
        {loading ? (
          <>
            <span className="mr-2">Signing in</span>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          OR
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button variant="outline" type="button" onClick={() => console.log("Google sign in")}>
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </Button>
        <Button variant="outline" type="button" onClick={() => console.log("Facebook sign in")}>
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z" />
          </svg>
          Facebook
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  )
}
