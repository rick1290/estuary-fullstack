"use client"

import { useAuth } from "@/hooks/use-auth"

export default function UserDashboardWelcome() {
  const { user } = useAuth()
  const firstName = user?.firstName || "there"

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900 mb-1">
        Welcome back, <em className="italic text-terracotta-600">{firstName}</em>
      </h1>
      <p className="text-base font-light text-olive-600">
        Your wellness journey at a glance
      </p>
    </div>
  )
}
