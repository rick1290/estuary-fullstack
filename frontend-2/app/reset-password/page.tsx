"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const validation = useMemo(() => {
    const minLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    return {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      isValid: minLength && hasUppercase && hasLowercase && hasNumber,
    }
  }, [password])

  const passwordsMatch = password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validation.isValid) {
      setError(
        "Password must be at least 8 characters with uppercase, lowercase, and a number."
      )
      return
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.")
      return
    }

    if (!token) {
      setError("Missing reset token. Please use the link from your email.")
      return
    }

    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(
        `${apiUrl}/api/v1/auth/password/reset/confirm/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, new_password: password }),
        }
      )

      const data = await response.json()

      if (response.ok && data.success) {
        setIsSuccess(true)
      } else {
        setError(data.message || "Failed to reset password. The link may have expired.")
      }
    } catch {
      setError("Unable to connect to the server. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <KeyRound className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-serif font-semibold text-olive-800">
          Invalid Reset Link
        </h2>
        <p className="text-muted-foreground">
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
        <div className="pt-4">
          <Link href="/forgot-password">
            <Button className="bg-sage-600 hover:bg-sage-700 text-white">
              Request New Link
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-sage-600" />
        </div>
        <h2 className="text-2xl font-serif font-semibold text-olive-800">
          Password Reset!
        </h2>
        <p className="text-muted-foreground">
          Your password has been successfully reset. You can now log in with your
          new password.
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button className="bg-sage-600 hover:bg-sage-700 text-white">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mb-4">
          <KeyRound className="h-8 w-8 text-sage-600" />
        </div>
        <h2 className="text-2xl font-serif font-semibold text-olive-800">
          Set a new password
        </h2>
        <p className="text-muted-foreground mt-2">
          Choose a strong password for your account.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              autoFocus
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {/* Password requirements */}
          {password && !validation.isValid && (
            <div className="text-xs space-y-1 mt-2 p-2 bg-muted/50 rounded">
              <p className="text-muted-foreground font-medium">
                Password must have:
              </p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li className={validation.minLength ? "text-green-600" : ""}>
                  {validation.minLength ? "\u2713" : "\u25CB"} At least 8
                  characters
                </li>
                <li className={validation.hasUppercase ? "text-green-600" : ""}>
                  {validation.hasUppercase ? "\u2713" : "\u25CB"} One uppercase
                  letter
                </li>
                <li className={validation.hasLowercase ? "text-green-600" : ""}>
                  {validation.hasLowercase ? "\u2713" : "\u25CB"} One lowercase
                  letter
                </li>
                <li className={validation.hasNumber ? "text-green-600" : ""}>
                  {validation.hasNumber ? "\u2713" : "\u25CB"} One number
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-500">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-sage-600 hover:bg-sage-700 text-white"
          disabled={isLoading || !validation.isValid || !passwordsMatch}
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-sage-700 hover:text-sage-800"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to home
        </Link>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-serif font-bold tracking-widest text-olive-800">
              ESTUARY
            </h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-8">
          <Suspense
            fallback={
              <div className="text-center py-8">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-600 inline-block" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
