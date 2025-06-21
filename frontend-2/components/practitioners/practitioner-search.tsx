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

  const updateSearchParams = () => {
    const params = new URLSearchParams(window.location.search)
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search practitioners..."
        className="flex-1 px-4 py-2 border rounded-md"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
      >
        Search
      </button>
    </form>
  )
}
