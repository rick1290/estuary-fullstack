"use client"

import type React from "react"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Shield } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export function PasswordSettings() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user signed up with Google (no password set)
  // We derive this from whether the user has a usable password.
  // For now, we check via the API by trying to use the endpoint.
  // The backend returns has_password on the user profile.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  // Fetch has_password on mount
  useState(() => {
    const check = async () => {
      try {
        const session = await getSession()
        if (!session?.accessToken) return
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const res = await fetch(`${baseUrl}/api/v1/auth/user/`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          setHasPassword(data.has_password ?? true)
        }
      } catch {
        setHasPassword(true) // Default to showing current password field
      }
    }
    check()
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const session = await getSession()
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${baseUrl}/api/v1/drf/auth/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        const firstError = Object.values(data).flat()[0]
        throw new Error(typeof firstError === "string" ? firstError : "Failed to update password")
      }
      return res.json()
    },
    onSuccess: () => {
      setSuccess(true)
      setError(null)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setHasPassword(true) // They now have a password
    },
    onError: (err: Error) => {
      setError(err.message)
      setSuccess(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (hasPassword && !currentPassword) {
      setError("Current password is required")
      return
    }
    if (!newPassword || !confirmPassword) {
      setError("New password and confirmation are required")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match")
      return
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: confirmPassword,
    })
  }

  // Still loading has_password check
  if (hasPassword === null) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPassword ? "Change Password" : "Set a Password"}</CardTitle>
        <CardDescription>
          {hasPassword
            ? "Update your password to keep your account secure."
            : "You signed in with Google. Setting a password lets you also sign in with your email address."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {success && (
            <Alert className="bg-sage-50 text-sage-800 border-sage-200">
              <CheckCircle2 className="h-4 w-4 text-sage-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                {hasPassword ? "Your password has been updated." : "Password set! You can now sign in with your email and password."}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!hasPassword && (
            <Alert className="bg-sage-50 border-sage-200">
              <Shield className="h-4 w-4 text-sage-600" />
              <AlertDescription className="text-olive-700">
                Your account uses Google sign-in. Adding a password is optional but gives you a second way to log in.
              </AlertDescription>
            </Alert>
          )}

          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
          </div>

          <div className="text-sm text-olive-500">
            <p>Password requirements:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>At least 8 characters long</li>
              <li>Include at least one uppercase letter</li>
              <li>Include at least one number</li>
              <li>Include at least one special character</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {hasPassword ? "Updating..." : "Setting Password..."}
              </>
            ) : (
              hasPassword ? "Update Password" : "Set Password"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
