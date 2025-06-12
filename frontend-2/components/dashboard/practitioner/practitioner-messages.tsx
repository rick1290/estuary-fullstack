"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

// Mock data for messages
const RECENT_MESSAGES = [
  {
    id: 1,
    sender: {
      name: "Emily Johnson",
      avatar: "/diverse-group-city.png",
    },
    message: "Hi, I'd like to reschedule my session for tomorrow if possible.",
    time: "10 min ago",
    unread: true,
  },
  {
    id: 2,
    sender: {
      name: "Michael Chen",
      avatar: "/diverse-group-city.png",
    },
    message: "Thank you for the session yesterday. I feel much better already!",
    time: "2 hours ago",
    unread: false,
  },
  {
    id: 3,
    sender: {
      name: "Sarah Williams",
      avatar: "/diverse-group-city.png",
    },
    message: "I have a question about the breathing techniques you taught me.",
    time: "Yesterday",
    unread: true,
  },
]

export default function PractitionerMessages() {
  return (
    <div className="space-y-4">
      {RECENT_MESSAGES.length > 0 ? (
        <div className="space-y-3">
          {RECENT_MESSAGES.map((message) => (
            <div
              key={message.id}
              className="flex items-start space-x-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={message.sender.avatar || "/placeholder.svg"} alt={message.sender.name} />
                <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium flex items-center gap-2">
                    {message.sender.name}
                    {message.unread && <Badge variant="default" className="h-2 w-2 rounded-full p-0" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{message.time}</span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">No recent messages</p>
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard/practitioner/messages" className="flex items-center gap-1">
            View All Messages
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
