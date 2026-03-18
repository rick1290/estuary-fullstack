"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiUrl}/api/v1/auth/password/reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
      } else {
        setError(data.message || "Something went wrong. Please try again.")
      }
    } catch {
      setError("Unable to connect to the server. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

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
          {isSuccess ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-sage-600" />
              </div>
              <h2 className="text-2xl font-serif font-semibold text-olive-800">
                Check your email
              </h2>
              <p className="text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-olive-700">{email}</span>,
                we&apos;ve sent a password reset link. It may take a few minutes to
                arrive.
              </p>
              <p className="text-sm text-muted-foreground">
                Don&apos;t see it? Check your spam folder.
              </p>
              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false)
                    setEmail("")
                  }}
                >
                  Try a different email
                </Button>
                <Link href="/" className="block">
                  <Button
                    variant="ghost"
                    className="w-full text-sage-700 hover:text-sage-800"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to home
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-sage-600" />
                </div>
                <h2 className="text-2xl font-serif font-semibold text-olive-800">
                  Forgot your password?
                </h2>
                <p className="text-muted-foreground mt-2">
                  Enter your email and we&apos;ll send you a link to reset your
                  password.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-sage-600 hover:bg-sage-700 text-white"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/" className="inline-flex items-center text-sm text-sage-700 hover:text-sage-800">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
