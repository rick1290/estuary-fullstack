"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [userType] = useState<"client">("client")
  const [error, setError] = useState("")

  // Form fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate first step
      if (!firstName || !lastName || !email) {
        setError("Please fill in all required fields")
        return
      }
      setError("")
      setActiveStep(1)
    } else if (activeStep === 1) {
      // Validate second step
      if (!password || !confirmPassword) {
        setError("Please fill in all required fields")
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      if (!agreeToTerms) {
        setError("You must agree to the terms and conditions")
        return
      }

      // Submit form
      handleSubmit()
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
    setError("")
  }

  const handleSubmit = () => {
    // Mock signup - in a real app, this would call an API
    console.log("Signing up with:", {
      firstName,
      lastName,
      email,
      password,
      userType,
    })

    // Redirect to user dashboard
    router.push("/dashboard/user")
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-sage-50 via-cream-100 to-cream-50 py-8">
      <div className="w-full max-w-md px-4">
        <Card className="border-sage-200 shadow-xl bg-white/95 backdrop-blur-sm relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage-50/30 to-terracotta-50/30" />
          <CardHeader className="text-center pb-4 relative z-10">
            <CardTitle className="text-3xl font-medium text-olive-900">Create an Account</CardTitle>
            <CardDescription className="text-olive-600">Join the Estuary community</CardDescription>
          </CardHeader>
        <CardContent className="relative z-10">
          {/* Remove user type selection - handle this on become-practitioner page */}

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${activeStep >= 0 ? "border-sage-600 bg-sage-600 text-white" : "border-sage-300 text-sage-600"}`}
                >
                  {activeStep > 0 ? "✓" : "1"}
                </div>
                <div className="ml-2 text-sm font-medium text-olive-700">Personal Info</div>
              </div>
              <div className="h-px w-12 bg-sage-200"></div>
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${activeStep >= 1 ? "border-sage-600 bg-sage-600 text-white" : "border-sage-300 text-sage-600"}`}
                >
                  2
                </div>
                <div className="ml-2 text-sm font-medium text-olive-700">Security</div>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            {activeStep === 0 ? (
              // Step 1: Personal Information
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-olive-500" />
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 border-sage-300 focus:border-sage-500 focus:ring-sage-500"
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-olive-500" />
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10 border-sage-300 focus:border-sage-500 focus:ring-sage-500"
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-olive-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-sage-300 focus:border-sage-500 focus:ring-sage-500"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleNext}>Next</Button>
                </div>
              </div>
            ) : (
              // Step 2: Security
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-olive-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 border-sage-300 focus:border-sage-500 focus:ring-sage-500"
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-olive-500 hover:text-olive-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-olive-500" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 border-sage-300 focus:border-sage-500 focus:ring-sage-500"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                  />
                  <Label htmlFor="terms" className="text-sm text-olive-700">
                    I agree to the{" "}
                    <Link href="/terms" className="text-sage-700 hover:text-sage-900 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-sage-700 hover:text-sage-900 hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>Create Account</Button>
                </div>
              </div>
            )}

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                OR
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button variant="outline" type="button" onClick={() => console.log("Google sign up")}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
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
              <Button variant="outline" type="button" onClick={() => console.log("Facebook sign up")}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z" />
                </svg>
                Facebook
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-olive-600">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-sage-700 hover:text-sage-900 hover:underline font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
