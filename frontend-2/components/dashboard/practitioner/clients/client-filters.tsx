"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, X, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Define the filter options type
export type ClientFilters = {
  searchTerm: string
  sessionTypes: string[]
  sortBy: string
  sortDirection: "asc" | "desc"
  showFavoritesOnly: boolean
}

// Define the props type
type ClientFiltersProps = {
  onFilterChange: (filters: ClientFilters) => void
}

// Update the component to accept props and return filter state
export default function ClientFilters({ onFilterChange }: ClientFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sessionTypes, setSessionTypes] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Update the filter change handler to notify parent component
  const handleFilterChange = () => {
    onFilterChange({
      searchTerm,
      sessionTypes,
      sortBy,
      sortDirection,
      showFavoritesOnly,
    })
  }

  // Update handlers to call handleFilterChange
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setTimeout(() => handleFilterChange(), 300)
  }

  const handleSessionTypeChange = (value: string) => {
    setSessionTypes((prev) => {
      const newTypes = prev.includes(value) ? prev.filter((type) => type !== value) : [...prev, value]

      setTimeout(() => handleFilterChange(), 0)
      return newTypes
    })
  }

  const handleSortByChange = (value: string) => {
    setSortBy(value)
    setTimeout(() => handleFilterChange(), 0)
  }

  const handleSortDirectionToggle = () => {
    setSortDirection((prev) => {
      const newDirection = prev === "asc" ? "desc" : "asc"
      setTimeout(() => handleFilterChange(), 0)
      return newDirection
    })
  }

  const handleFavoritesToggle = () => {
    setShowFavoritesOnly((prev) => {
      const newValue = !prev
      setTimeout(() => handleFilterChange(), 0)
      return newValue
    })
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSessionTypes([])
    setSortBy("name")
    setSortDirection("asc")
    setShowFavoritesOnly(false)
    setTimeout(() => handleFilterChange(), 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchTerm("")
                handleFilterChange()
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="hidden md:flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>

          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
            <Filter className="h-4 w-4" />
          </Button>

          <Select value={sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="lastBooking">Last Booking</SelectItem>
              <SelectItem value="nextBooking">Next Booking</SelectItem>
              <SelectItem value="totalBookings">Total Bookings</SelectItem>
              <SelectItem value="totalSpent">Total Spent</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={handleSortDirectionToggle}>
            {sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="mt-2">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Session Types</Label>
                <div className="flex flex-wrap gap-2">
                  {["Coaching", "Therapy", "Workshop", "Course"].map((type) => (
                    <Badge
                      key={type}
                      variant={sessionTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleSessionTypeChange(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Other Filters</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant={showFavoritesOnly ? "default" : "outline"} size="sm" onClick={handleFavoritesToggle}>
                    Favorites Only
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
