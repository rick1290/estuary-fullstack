"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react"

interface ScheduleFiltersProps {
  onFilterChange?: (filters: {
    searchTerm: string
    eventType: string
    location: string
    dateRange: string
  }) => void
  filter: string
  setFilter: (filter: string) => void
}

export default function ScheduleFilters({ onFilterChange, filter, setFilter }: ScheduleFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [eventType, setEventType] = useState("all")
  const [location, setLocation] = useState("all")
  const [dateRange, setDateRange] = useState("upcoming")

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value
    setSearchTerm(newSearchTerm)
    applyFilters(newSearchTerm, eventType, location, dateRange)
  }

  const handleEventTypeChange = (value: string) => {
    setEventType(value)
    applyFilters(searchTerm, value, location, dateRange)
  }

  const handleLocationChange = (value: string) => {
    setLocation(value)
    applyFilters(searchTerm, eventType, value, dateRange)
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    applyFilters(searchTerm, eventType, location, value)
  }

  const applyFilters = (search: string, type: string, loc: string, date: string) => {
    onFilterChange &&
      onFilterChange({
        searchTerm: search,
        eventType: type,
        location: loc,
        dateRange: date,
      })
  }

  const handleToggleFilters = () => {
    setShowFilters(!showFilters)
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setEventType("all")
    setLocation("all")
    setDateRange("upcoming")
    applyFilters("", "all", "all", "upcoming")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events or clients"
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchTerm("")
                applyFilters("", eventType, location, dateRange)
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={handleToggleFilters}
          className="whitespace-nowrap"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={eventType} onValueChange={handleEventTypeChange}>
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="session">Sessions</SelectItem>
                    <SelectItem value="workshop">Workshops</SelectItem>
                    <SelectItem value="course">Courses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select value={location} onValueChange={handleLocationChange}>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="Virtual">Virtual</SelectItem>
                    <SelectItem value="In-Person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Select value={dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger id="date-range">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="nextWeek">Next Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={handleClearFilters} className="w-full">
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          <Calendar className="h-4 w-4 mr-2" />
          All
        </Button>
        <Button variant={filter === "upcoming" ? "default" : "outline"} size="sm" onClick={() => setFilter("upcoming")}>
          <Clock className="h-4 w-4 mr-2" />
          Upcoming
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Completed
        </Button>
        <Button variant={filter === "canceled" ? "default" : "outline"} size="sm" onClick={() => setFilter("canceled")}>
          <XCircle className="h-4 w-4 mr-2" />
          Canceled
        </Button>
      </div>
    </div>
  )
}
