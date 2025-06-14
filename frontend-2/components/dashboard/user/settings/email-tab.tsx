"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function EmailTab() {
  const [currentEmail, setCurrentEmail] = useState("rick.nielsen@example.com")
  const [newEmail, setNewEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!newEmail || !password) {
      setError("All fields are required")
      return
    }

    // Simulate API call
    setTimeout(() => {
      setSuccess("Verification email sent to " + newEmail)
      setPassword("")
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-semibold mb-4">Email Settings</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-500 text-green-500">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="currentEmail">Current Email</Label>
          <Input id="currentEmail" value={currentEmail} disabled />
          <p className="text-sm text-muted-foreground">Your current email address</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="newEmail">New Email</Label>
          <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-sm text-muted-foreground">Enter your password to confirm this change</p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button type="submit">Update Email</Button>
      </div>
    </form>
  )
}
