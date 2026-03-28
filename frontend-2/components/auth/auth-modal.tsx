"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { X, Check, CheckCircle2, Users, Star, Shield, ArrowRight, Eye, EyeOff, Sparkles, Heart } from "lucide-react"
import { signIn } from "next-auth/react"
import { useAuth } from "@/hooks/use-auth"
import { authRegisterCreate } from "@/src/client/sdk.gen"
import type { UserRegisterRequest } from "@/src/client/types.gen"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface AuthModalProps {
  open: boolean
  onClose: () => void
  redirectUrl?: string
  serviceType?: string
  defaultTab?: "login" | "signup"
  title?: string
  description?: string
}

export default function AuthModal({ 
  open, 
  onClose, 
  redirectUrl, 
  serviceType = "service",
  defaultTab = "login",
  title,
  description
}: AuthModalProps) {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()

  // Form states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginSuccessful, setLoginSuccessful] = useState(false)
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Signup role selection: null = not selected, 'client' = finding services, 'practitioner' = offering services
  const [signupRole, setSignupRole] = useState<'client' | 'practitioner' | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(false)

  // Password validation
  const validatePassword = (pwd: string) => {
    const minLength = pwd.length >= 8
    const hasUppercase = /[A-Z]/.test(pwd)
    const hasLowercase = /[a-z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    return { minLength, hasUppercase, hasLowercase, hasNumber, isValid: minLength && hasUppercase && hasLowercase && hasNumber }
  }

  const passwordValidation = validatePassword(password)

  // Sync activeTab when defaultTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  // Reset signupRole when switching tabs or closing modal
  useEffect(() => {
    if (activeTab === 'login') {
      setSignupRole(null)
    }
  }, [activeTab])

  // Auto-select practitioner role when opened from practitioner landing pages
  useEffect(() => {
    if (open && serviceType === 'practitioner-application') {
      setSignupRole('practitioner')
    }
  }, [open, serviceType, defaultTab])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSignupRole(null)
      setError(null)
      setShowEmailForm(false)
    }
  }, [open])

  // Handle redirection after successful login
  // Skip this effect for practitioners - they have a dedicated redirect to onboarding
  useEffect(() => {
    if (loginSuccessful && redirectUrl && signupRole !== 'practitioner') {
      const redirectTimer = setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
      return () => clearTimeout(redirectTimer)
    }
  }, [loginSuccessful, redirectUrl, signupRole])

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
      case "message":
        return "send messages"
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
      await login(email, password)
      setLoginSuccessful(true)
      onClose()

      if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (!passwordValidation.isValid) {
      setError("Password must be at least 8 characters with uppercase, lowercase, and a number")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions")
      setIsLoading(false)
      return
    }

    try {
      // Register the user
      const registerData: UserRegisterRequest = {
        email,
        password,
        password_confirm: confirmPassword,
        first_name: firstName,
        last_name: lastName,
      }
      
      const response = await authRegisterCreate({ body: registerData })
      
      if (response.data) {
        // After successful registration, log them in
        await login(email, password)
        setLoginSuccessful(true)
        onClose()

        // Redirect based on role selection
        if (signupRole === 'practitioner') {
          // Send practitioners to onboarding flow
          window.location.href = '/become-practitioner/onboarding'
        } else if (redirectUrl) {
          window.location.href = redirectUrl
        }
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      let errorMessage = "Signup failed. Please try again."

      // Handle different error response formats from OpenAPI client
      // Format 1: err.error.errors (nested in error object)
      if (err?.error?.errors) {
        const errors = err.error.errors
        const fieldErrors: string[] = []

        Object.keys(errors).forEach(field => {
          const fieldErrorArray = errors[field]
          if (Array.isArray(fieldErrorArray) && fieldErrorArray.length > 0) {
            fieldErrors.push(fieldErrorArray[0])
          }
        })

        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('. ')
        } else if (err.error.message) {
          errorMessage = err.error.message
        }
      }
      // Format 2: err.errors (direct errors object)
      else if (err?.errors) {
        const errors = err.errors
        const fieldErrors: string[] = []

        Object.keys(errors).forEach(field => {
          const fieldErrorArray = errors[field]
          if (Array.isArray(fieldErrorArray) && fieldErrorArray.length > 0) {
            fieldErrors.push(fieldErrorArray[0])
          }
        })

        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('. ')
        }
      }
      // Format 3: err.error.message or err.message
      else if (err?.error?.message) {
        errorMessage = err.error.message
      } else if (err?.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Determine callback URL based on role selection (for signup tab)
      let callbackUrl = redirectUrl || "/"

      if (activeTab === "signup" && signupRole === "practitioner") {
        // Store role preference for after OAuth completes
        localStorage.setItem("pendingPractitionerOnboarding", "true")
        callbackUrl = "/become-practitioner/onboarding"
      }

      // Google OAuth requires a full page redirect
      await signIn("google", {
        callbackUrl,
      })
    } catch (err) {
      setError("Google authentication failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-sage-200/60 [&_button[class*=absolute]]:hidden">
        {/* Branded header */}
        <div className="bg-gradient-to-br from-sage-50 via-cream-50 to-terracotta-50/30 px-8 pt-7 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center text-olive-500 hover:text-olive-600 hover:bg-white/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="font-serif text-lg font-semibold text-olive-900 tracking-[0.25em]">ESTUARY</span>
          <DialogTitle className="text-xl font-serif font-normal text-olive-900 mt-3 mb-1">
            {title || (activeTab === "login" ? "Welcome back" : "Join Estuary")}
          </DialogTitle>
          <p className="text-sm text-olive-600">
            {description || (activeTab === "login"
              ? `Sign in to ${getActionText()}`
              : "Create your account to get started")}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-sage-100">
          <button
            onClick={() => { setActiveTab("login"); setError(null); setSignupRole(null) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "login" ? "text-olive-900" : "text-olive-500 hover:text-olive-600"
            }`}
          >
            Sign In
            {activeTab === "login" && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-olive-900 rounded-full" />}
          </button>
          <button
            onClick={() => { setActiveTab("signup"); setError(null) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "signup" ? "text-olive-900" : "text-olive-500 hover:text-olive-600"
            }`}
          >
            Create Account
            {activeTab === "signup" && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-olive-900 rounded-full" />}
          </button>
        </div>

        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
          <div className="max-w-sm mx-auto">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email Address</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-sm"
                          onClick={() => {
                            onClose()
                            router.push("/forgot-password")
                          }}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In to {getActionText()}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">
                  {/* Role Selection Step — skip if practitioner is pre-selected */}
                  {signupRole === null ? (
                    <div className="py-2">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Client Option */}
                        <button
                          type="button"
                          onClick={() => setSignupRole('client')}
                          className="relative p-5 rounded-xl border border-sage-200/80 hover:border-sage-400 hover:shadow-md transition-all text-center group bg-white"
                        >
                          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center group-hover:from-sage-100 group-hover:to-sage-200 transition-colors">
                            <Heart className="h-6 w-6 text-sage-600" />
                          </div>
                          <h4 className="font-medium text-olive-900 text-sm mb-1">Find wellness</h4>
                          <p className="text-[11px] text-olive-500 leading-snug">
                            Book sessions, workshops & courses
                          </p>
                        </button>

                        {/* Practitioner Option */}
                        <button
                          type="button"
                          onClick={() => setSignupRole('practitioner')}
                          className="relative p-5 rounded-xl border border-terracotta-200/80 hover:border-terracotta-400 hover:shadow-md transition-all text-center group bg-white"
                        >
                          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-terracotta-50 to-terracotta-100 flex items-center justify-center group-hover:from-terracotta-100 group-hover:to-terracotta-200 transition-colors">
                            <Sparkles className="h-6 w-6 text-terracotta-600" />
                          </div>
                          <h4 className="font-medium text-olive-900 text-sm mb-1">I'm a practitioner</h4>
                          <p className="text-[11px] text-olive-500 leading-snug">
                            Offer services & grow your business
                          </p>
                        </button>
                      </div>
                    </div>

                  ) : serviceType === 'practitioner-application' && !showEmailForm ? (
                    /* Practitioner fast-track: Google SSO first */
                    <div className="py-1 space-y-4">
                      <Button
                        variant="outline"
                        onClick={handleGoogleAuth}
                        disabled={isLoading}
                        className="w-full h-12 border-sage-200 hover:bg-sage-50 text-olive-800 font-medium text-base"
                      >
                        <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </Button>

                      <div className="flex items-center gap-3 text-xs text-olive-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-sage-500 shrink-0" />
                        <span>One click signup — no password needed</span>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-sage-100" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-background px-3 text-xs text-olive-400">or</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowEmailForm(true)}
                        className="w-full text-sm text-olive-600 hover:text-olive-800 font-medium transition-colors py-2"
                      >
                        Sign up with email instead
                      </button>

                      <p className="text-[11px] text-olive-400 text-center leading-relaxed">
                        By continuing, you agree to our{" "}
                        <a href="/terms" className="underline hover:text-olive-600">Terms</a>
                        {" "}and{" "}
                        <a href="/privacy" className="underline hover:text-olive-600">Privacy Policy</a>
                      </p>
                    </div>

                  ) : (
                  /* Signup Form (email) */
                  <form onSubmit={handleSignup} className="space-y-3">
                    {/* Role indicator with back */}
                    {serviceType !== 'practitioner-application' ? (
                      <button
                        type="button"
                        onClick={() => setSignupRole(null)}
                        className="flex items-center gap-1.5 text-xs text-olive-500 hover:text-olive-700 transition-colors mb-1"
                      >
                        <ArrowRight className="h-3 w-3 rotate-180" />
                        <span>
                          {signupRole === 'practitioner' ? 'Practitioner' : 'Client'} account
                        </span>
                        <span className="text-olive-300">· Change</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowEmailForm(false)}
                        className="flex items-center gap-1.5 text-xs text-olive-500 hover:text-olive-700 transition-colors mb-1"
                      >
                        <ArrowRight className="h-3 w-3 rotate-180" />
                        <span>Back to Google signup</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email Address</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {/* Password requirements */}
                      {password && !passwordValidation.isValid && (
                        <div className="text-xs space-y-1 mt-2 p-2 bg-muted/50 rounded">
                          <p className="text-muted-foreground font-medium">Password must have:</p>
                          <ul className="space-y-0.5 text-muted-foreground">
                            <li className={passwordValidation.minLength ? "text-green-600" : ""}>
                              {passwordValidation.minLength ? "✓" : "○"} At least 8 characters
                            </li>
                            <li className={passwordValidation.hasUppercase ? "text-green-600" : ""}>
                              {passwordValidation.hasUppercase ? "✓" : "○"} One uppercase letter
                            </li>
                            <li className={passwordValidation.hasLowercase ? "text-green-600" : ""}>
                              {passwordValidation.hasLowercase ? "✓" : "○"} One lowercase letter
                            </li>
                            <li className={passwordValidation.hasNumber ? "text-green-600" : ""}>
                              {passwordValidation.hasNumber ? "✓" : "○"} One number
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                      />
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree to the{" "}
                        <Button variant="link" className="p-0 h-auto">
                          Terms of Service
                        </Button>{" "}
                        and{" "}
                        <Button variant="link" className="p-0 h-auto">
                          Privacy Policy
                        </Button>
                      </label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800" 
                      disabled={isLoading || !acceptTerms}
                    >
                      {isLoading ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                  )}
                </TabsContent>

                {/* Google Auth — below both tabs (hidden when practitioner fast-track shows its own) */}
                {!(serviceType === 'practitioner-application' && activeTab === 'signup' && signupRole === 'practitioner' && !showEmailForm) && (
                <div className="mt-5">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-sage-100" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-background px-3 text-xs text-olive-500">or</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full h-11 border-sage-200 hover:bg-sage-50 text-olive-800 font-medium"
                  >
                    <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
                )}
              </Tabs>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}