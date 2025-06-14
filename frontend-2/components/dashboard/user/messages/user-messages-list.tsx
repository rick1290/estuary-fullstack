"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, ListFilterIcon as FilterList, X, Circle } from "lucide-react"

// Mock data for practitioners with messages
const mockPractitioners = [
  {
    id: "1",
    name: "Dr. Sarah Williams",
    avatar: "/practitioner-1.jpg",
    specialty: "Life Coach",
    lastMessage: "How are you feeling after our session?",
    timestamp: "11:45 AM",
    unread: true,
    online: true,
    lastActive: "Just now",
  },
  {
    id: "2",
    name: "David Thompson",
    avatar: "/practitioner-2.jpg",
    specialty: "Meditation Instructor",
    lastMessage: "Remember to practice the breathing technique we discussed.",
    timestamp: "Yesterday",
    unread: false,
    online: false,
    lastActive: "3 hours ago",
  },
  {
    id: "3",
    name: "Lisa Chen",
    avatar: "/practitioner-3.jpg",
    specialty: "Nutritionist",
    lastMessage: "Here's the meal plan we talked about.",
    timestamp: "Monday",
    unread: false,
    online: true,
    lastActive: "Just now",
  },
]

export default function UserMessagesList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const practitionerId = searchParams.get("practitionerId")

  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPractitioners, setFilteredPractitioners] = useState(mockPractitioners)
  const [selectedPractitioner, setSelectedPractitioner] = useState<string | null>(practitionerId)

  useEffect(() => {
    if (searchQuery) {
      const filtered = mockPractitioners.filter(
        (practitioner) =>
          practitioner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          practitioner.specialty.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredPractitioners(filtered)
    } else {
      setFilteredPractitioners(mockPractitioners)
    }
  }, [searchQuery])

  useEffect(() => {
    if (practitionerId) {
      setSelectedPractitioner(practitionerId)
    }
  }, [practitionerId])

  const handlePractitionerSelect = (practitionerId: string) => {
    setSelectedPractitioner(practitionerId)
    router.push(`/dashboard/user/messages?practitionerId=${practitionerId}`)
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search practitioners..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center px-4 py-2">
        <span className="text-sm text-muted-foreground">{filteredPractitioners.length} Conversations</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <FilterList className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Filter conversations</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator />

      <div className="flex-grow overflow-auto">
        <ul className="divide-y divide-border">
          {filteredPractitioners.map((practitioner) => (
            <li
              key={practitioner.id}
              className={`
                py-3 px-4 cursor-pointer
                ${selectedPractitioner === practitioner.id ? "bg-accent" : "hover:bg-accent/50"}
                ${selectedPractitioner === practitioner.id ? "border-l-4 border-primary" : "border-l-4 border-transparent"}
              `}
              onClick={() => handlePractitionerSelect(practitioner.id)}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={practitioner.avatar || "/placeholder.svg"} alt={practitioner.name} />
                    <AvatarFallback>{practitioner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {practitioner.online && (
                    <Badge className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 p-0 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate">{practitioner.name}</span>
                    <span className="text-xs text-muted-foreground">{practitioner.timestamp}</span>
                  </div>
                  <span className="text-xs text-muted-foreground block">{practitioner.specialty}</span>
                  <div className="flex items-center mt-1">
                    <span
                      className={`text-sm truncate ${practitioner.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}
                    >
                      {practitioner.lastMessage}
                    </span>
                    {practitioner.unread && <Circle className="ml-1 h-2 w-2 fill-primary text-primary" />}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div className="p-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className="w-full" onClick={() => router.push("/marketplace/practitioners")}>
                Find Practitioners
              </Button>
            </TooltipTrigger>
            <TooltipContent>Find a practitioner to message</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
