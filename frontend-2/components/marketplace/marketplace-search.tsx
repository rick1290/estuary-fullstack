"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function MarketplaceSearch() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    if (searchTerm.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(searchTerm)}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for services or practitioners..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-20"
        />
        <Button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 h-8" size="sm">
          Search
        </Button>
      </div>
    </form>
  )
}
