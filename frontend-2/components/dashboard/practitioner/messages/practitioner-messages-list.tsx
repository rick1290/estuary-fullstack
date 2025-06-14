"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, Filter } from "lucide-react"

// Mock data for clients with messages
const mockClients = [
  {
    id: "1",
    name: "Emma Johnson",
    avatar: "/practitioner-1.jpg",
    lastMessage: "Thanks for the session yesterday!",
    timestamp: "10:30 AM",
    unread: true,
    online: true,
    lastActive: "Just now",
  },
  {
    id: "2",
    name: "Michael Chen",
    avatar: "/practitioner-2.jpg",
    lastMessage: "I'd like to reschedule my appointment for next week.",
    timestamp: "Yesterday",
    unread: false,
    online: false,
    lastActive: "2 hours ago",
  },
  {
    id: "3",
    name: "Sophia Rodriguez",
    avatar: "/practitioner-3.jpg",
    lastMessage: "Do you have any availability this weekend?",
    timestamp: "Yesterday",
    unread: true,
    online: false,
    lastActive: "5 hours ago",
  },
  {
    id: "4",
    name: "James Wilson",
    avatar: "/practitioner-4.jpg",
    lastMessage: "I've attached the form you requested.",
    timestamp: "Monday",
    unread: false,
    online: true,
    lastActive: "Just now",
  },
  {
    id: "5",
    name: "Olivia Taylor",
    avatar: "/practitioner-profile.jpg",
    lastMessage: "Looking forward to our session tomorrow!",
    timestamp: "Monday",
    unread: false,
    online: false,
    lastActive: "1 day ago",
  },
]

export default function PractitionerMessagesList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get("clientId")

  const [searchQuery, setSearchQuery] = useState("")
  const [filteredClients, setFilteredClients] = useState(mockClients)
  const [selectedClient, setSelectedClient] = useState<string | null>(clientId)

  useEffect(() => {
    if (searchQuery) {
      const filtered = mockClients.filter((client) => client.name.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredClients(filtered)
    } else {
      setFilteredClients(mockClients)
    }
  }, [searchQuery])

  useEffect(() => {
    if (clientId) {
      setSelectedClient(clientId)
    }
  }, [clientId])

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId)
    router.push(`/dashboard/practitioner/messages?clientId=${clientId}`)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center px-4 py-2">
        <span className="text-sm text-muted-foreground">{filteredClients.length} Conversations</span>
        <Button variant="ghost" size="icon" title="Filter conversations">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => handleClientSelect(client.id)}
              className={`w-full flex items-start p-4 gap-3 text-left hover:bg-accent/50 transition-colors ${
                selectedClient === client.id ? "bg-accent" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <Avatar>
                  <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.name} />
                  <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {client.online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium truncate">{client.name}</span>
                  <span className="text-xs text-muted-foreground">{client.timestamp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm truncate ${
                      client.unread ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {client.lastMessage}
                  </p>
                  {client.unread && <Badge variant="default" className="h-2 w-2 rounded-full p-0" />}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button className="w-full" variant="default">
          New Message
        </Button>
      </div>
    </div>
  )
}
