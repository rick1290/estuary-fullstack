"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

interface PractitionerSearchProps {
  initialQuery?: string
}

export default function PractitionerSearch({ initialQuery = "" }: PractitionerSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(initialQuery)

  // Update local state when props change
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParams()
  }
