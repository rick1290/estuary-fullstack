"use client"

import type React from "react"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, Shield } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  // Check has_password on mount
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
        setHasPassword(true)
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
      setHasPassword(true)
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

  if (hasPassword === null) return null

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-serif text-2xl font-normal text-olive-900 mb-1">
        {hasPassword ? "Change Password" : "Set a Password"}
      </h2>
      <p className="text-olive-500 mb-6">
        {hasPassword
          ? "Update your password to keep your account secure."
          : "You signed in with Google. Setting a password lets you also sign in with your email address."}
      </p>

      <div className="space-y-6">
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
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showCurrentPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showNewPassword ? "Hide password" : "Show password"}</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={newPassword !== confirmPassword && confirmPassword !== "" ? "border-red-500" : ""}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
            </Button>
          </div>
          {newPassword !== confirmPassword && confirmPassword !== "" && (
            <p className="text-sm text-red-500">Passwords do not match</p>
          )}
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
      </div>

      <div className="mt-8 flex justify-end">
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
      </div>
    </form>
  )
}
