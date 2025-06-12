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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [userType, setUserType] = useState<"client" | "practitioner">("client")
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

    // Redirect to dashboard based on user type
    if (userType === "client") {
      router.push("/dashboard/client")
    } else {
      router.push("/dashboard/practitioner")
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-warm-50 to-white py-8">
      <div className="w-full max-w-md px-4">
        <Card className="border-gray-100 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-medium">Create an Account</CardTitle>
            <CardDescription className="text-gray-600">Join the Estuary community</CardDescription>
          </CardHeader>
        <CardContent>
          <Tabs
            value={userType}
            onValueChange={(value) => setUserType(value as "client" | "practitioner")}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="client" className="data-[state=active]:bg-white">Client</TabsTrigger>
              <TabsTrigger value="practitioner" className="data-[state=active]:bg-white">Practitioner</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${activeStep >= 0 ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground"}`}
                >
                  {activeStep > 0 ? "✓" : "1"}
                </div>
                <div className="ml-2 text-sm font-medium">Personal Info</div>
              </div>
              <div className="h-px w-12 bg-muted"></div>
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${activeStep >= 1 ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground"}`}
                >
                  2
                </div>
                <div className="ml-2 text-sm font-medium">Security</div>
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
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10"
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                </div>

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
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Create a password"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
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
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
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
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline">
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
