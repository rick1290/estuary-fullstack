"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuthNextAuth"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react"

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultTab?: "login" | "signup"
  redirectUrl?: string
  serviceType?: string
  title?: string
  description?: string
}

export default function AuthModalNextAuth({
  open,
  onClose,
  defaultTab = "login",
  redirectUrl,
  serviceType,
  title,
  description,
}: AuthModalProps) {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setActiveTab(defaultTab)
    setError(null)
  }, [defaultTab, open])

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await login({ email, password })
      toast.success("Welcome back!")
      onClose()
      if (redirectUrl) {
        router.push(redirectUrl)
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await signIn("google", {
        callbackUrl: redirectUrl || "/dashboard",
      })
    } catch (err) {
      toast.error("Google login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      setIsLoading(false)
      return
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/v1/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.email?.[0] || 'Registration failed')
      }

      await login({ email, password })

      toast.success("Welcome to Estuary!")
      onClose()
      if (redirectUrl) {
        router.push(redirectUrl)
      }
    } catch (err: any) {
      setError(err.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden border-sage-200/60">
        {/* Header — branded gradient */}
        <div className="bg-gradient-to-br from-sage-50 via-cream-50 to-terracotta-50/30 px-8 pt-8 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-serif text-lg font-semibold text-olive-900 tracking-[0.25em]">
              ESTUARY
            </span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-olive-900 mb-1">
            {title || (activeTab === "login" ? "Welcome back" : "Join Estuary")}
          </h2>
          <p className="text-sm text-olive-600">
            {serviceType
              ? `Sign in to book this ${serviceType}`
              : description || (activeTab === "login"
                ? "Sign in to continue your wellness journey"
                : "Create your account to get started")}
          </p>
        </div>

        {/* Tab switcher — minimal */}
        <div className="flex border-b border-sage-100">
          <button
            onClick={() => { setActiveTab("login"); setError(null) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "login"
                ? "text-olive-900"
                : "text-olive-500 hover:text-olive-600"
            }`}
          >
            Sign In
            {activeTab === "login" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-olive-900 rounded-full" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab("signup"); setError(null) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "signup"
                ? "text-olive-900"
                : "text-olive-500 hover:text-olive-600"
            }`}
          >
            Create Account
            {activeTab === "signup" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-olive-900 rounded-full" />
            )}
          </button>
        </div>

        {/* Form area */}
        <div className="px-8 py-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {activeTab === "login" ? (
            <>
              {/* Google button first — lowest friction */}
              <Button
                variant="outline"
                className="w-full h-11 mb-4 border-sage-200 hover:bg-sage-50 text-olive-800 font-medium"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-sage-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-olive-500">or</span>
                </div>
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <Label htmlFor="email" className="text-xs font-medium text-olive-600 mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-xs font-medium text-olive-600 mb-1.5 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-olive-500 hover:text-olive-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-olive-900 hover:bg-olive-800 text-white font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <button
                onClick={() => {
                  onClose()
                  router.push('/forgot-password')
                }}
                className="w-full mt-3 text-center text-xs text-olive-500 hover:text-olive-700 transition-colors"
              >
                Forgot your password?
              </button>
            </>
          ) : (
            <>
              {/* Google button */}
              <Button
                variant="outline"
                className="w-full h-11 mb-4 border-sage-200 hover:bg-sage-50 text-olive-800 font-medium"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-sage-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-olive-500">or</span>
                </div>
              </div>

              {/* Signup form */}
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-xs font-medium text-olive-600 mb-1.5 block">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="Jane"
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs font-medium text-olive-600 mb-1.5 block">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="signupEmail" className="text-xs font-medium text-olive-600 mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    id="signupEmail"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="signupPassword" className="text-xs font-medium text-olive-600 mb-1.5 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signupPassword"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="8+ characters"
                      required
                      minLength={8}
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-olive-500 hover:text-olive-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-olive-600 mb-1.5 block">
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-olive-900 hover:bg-olive-800 text-white font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-4 text-center text-[11px] text-olive-500 leading-relaxed">
                By creating an account, you agree to our{" "}
                <a href="/terms" className="text-olive-600 hover:underline">Terms</a>
                {" "}and{" "}
                <a href="/privacy" className="text-olive-600 hover:underline">Privacy Policy</a>
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
