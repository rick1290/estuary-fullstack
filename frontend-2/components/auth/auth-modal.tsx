"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { X, Check, Users, Star, Shield, ArrowRight, Eye, EyeOff, Sparkles, Heart } from "lucide-react"
import { signIn } from "next-auth/react"
import { useAuth } from "@/hooks/use-auth"
import { authRegisterCreate } from "@/src/client/sdk.gen"
import type { UserRegisterRequest } from "@/src/client/types.gen"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSignupRole(null)
      setError(null)
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
    console.log('handleEmailLogin called with:', { email, password })
    setError(null)
    setIsLoading(true)
    setLoginSuccessful(false)

    try {
      console.log('Calling login function...')
      console.log('login function:', login)
      console.log('typeof login:', typeof login)
      await login(email, password)
      console.log('Login completed successfully')
      setLoginSuccessful(true)
      onClose()

      if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } catch (err: any) {
      console.error('Login error caught in handleEmailLogin:', err)
      console.error('Error stack:', err?.stack)
      
      // Extract error message
      let errorMessage = "Login failed. Please try again."
      
      if (err?.message) {
        errorMessage = err.message
      }
      
      console.log('Setting error message:', errorMessage)
      setError(errorMessage)
    } finally {
      console.log('Setting isLoading to false')
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
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden">
        <div className="grid lg:grid-cols-2 h-full">
          {/* Left Side - Image and Stats */}
          <div className="relative hidden lg:block bg-gradient-to-br from-sage-600 to-terracotta-600 p-8 text-white">
            {/* Background Image */}
            <div className="absolute inset-0 opacity-30">
              <Image
                src="/auth-modal-background.png"
                alt="Peaceful wellness meditation"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 to-gray-900/40"></div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col [&_*]:drop-shadow-lg">
              <div className="flex-1 flex flex-col justify-center">
                <h2 className="text-3xl font-bold mb-6 text-white">
                  {title || "Join Our Wellness Community"}
                </h2>
                <p className="text-lg mb-8 text-white">
                  {description || "Connect with top practitioners and transform your wellness journey"}
                </p>

                {/* Stats */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">500+</p>
                      <p className="text-sm text-white">Verified Practitioners</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">4.9/5</p>
                      <p className="text-sm text-white">Average Rating</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">100%</p>
                      <p className="text-sm text-white">Secure & Private</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-white" />
                    <span className="text-sm text-white">Access top wellness practitioners</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-white" />
                    <span className="text-sm text-white">Book sessions, workshops & courses</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-white" />
                    <span className="text-sm text-white">Track your wellness journey</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-white" />
                    <span className="text-sm text-white">Connect with a supportive community</span>
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="mt-8">
                <p className="text-xl font-bold tracking-widest text-white">ESTUARY</p>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="p-8 lg:p-12">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-4 top-4 h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>

            <div className="max-w-sm mx-auto">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

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
                  {/* Role Selection Step */}
                  {signupRole === null ? (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">What brings you to Estuary?</h3>
                        <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to use the platform</p>
                      </div>

                      <div className="space-y-3">
                        {/* Client Option */}
                        <button
                          type="button"
                          onClick={() => setSignupRole('client')}
                          className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-sage-500 hover:bg-sage-50 transition-all text-left group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center group-hover:bg-sage-200 transition-colors">
                              <Heart className="h-6 w-6 text-sage-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">I'm looking for wellness services</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Find and book sessions with top practitioners, join workshops, and explore courses
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-sage-600 mt-1" />
                          </div>
                        </button>

                        {/* Practitioner Option */}
                        <button
                          type="button"
                          onClick={() => setSignupRole('practitioner')}
                          className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-terracotta-500 hover:bg-terracotta-50 transition-all text-left group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-terracotta-100 flex items-center justify-center group-hover:bg-terracotta-200 transition-colors">
                              <Sparkles className="h-6 w-6 text-terracotta-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">I'm a wellness practitioner</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Offer your services, manage bookings, and grow your wellness business
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-terracotta-600 mt-1" />
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                  /* Signup Form */
                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* Role indicator with back button */}
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                      <button
                        type="button"
                        onClick={() => setSignupRole(null)}
                        className="text-sm text-muted-foreground hover:text-gray-900 flex items-center gap-1"
                      >
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        Back
                      </button>
                      <span className="text-sm text-muted-foreground">|</span>
                      <span className="text-sm font-medium">
                        {signupRole === 'practitioner' ? (
                          <span className="text-terracotta-600">Signing up as a Practitioner</span>
                        ) : (
                          <span className="text-sage-600">Signing up to find services</span>
                        )}
                      </span>
                    </div>

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

                {/* Social Auth */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                      className="w-full max-w-xs"
                    >
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
                      Google
                    </Button>
                  </div>
                </div>

                {/* Testing Info */}
                <div className="mt-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    For testing: testuser@example.com / test1234
                  </p>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}