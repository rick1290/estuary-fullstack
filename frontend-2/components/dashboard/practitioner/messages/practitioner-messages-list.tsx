"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, Filter, MessageSquarePlus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { conversationsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

export default function PractitionerMessagesList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversationId")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId)

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery({
    ...conversationsListOptions({
      query: {
        unread_only: false
      }
    })
  })

  // Filter conversations based on search
  const filteredConversations = conversations?.filter((conversation) => {
    if (!searchQuery) return true
    const otherUser = conversation.other_user
    if (!otherUser) return false
    const fullName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.toLowerCase()
    const email = otherUser.email?.toLowerCase() || ''
    const searchLower = searchQuery.toLowerCase()
    return fullName.includes(searchLower) || email.includes(searchLower)
  }) || []

  useEffect(() => {
    if (conversationId) {
      setSelectedConversation(conversationId)
    }
  }, [conversationId])

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId)
    router.push(`/dashboard/practitioner/messages?conversationId=${conversationId}`)
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
        <span className="text-sm text-muted-foreground">{filteredConversations.length} Conversations</span>
        <Button variant="ghost" size="icon" title="Filter conversations">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start p-4 gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-muted-foreground text-sm">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherUser = conversation.other_user
              const lastMessage = conversation.last_message
              const hasUnread = (conversation.unread_count || 0) > 0
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation.id.toString())}
                  className={`w-full flex items-start p-4 gap-3 text-left hover:bg-accent/50 transition-colors ${
                    selectedConversation === conversation.id.toString() ? "bg-accent" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar>
                      <AvatarImage 
                        src={otherUser?.avatar_url || "/placeholder.svg"} 
                        alt={`${otherUser?.first_name} ${otherUser?.last_name}`} 
                      />
                      <AvatarFallback>
                        {otherUser?.first_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium truncate">
                        {otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lastMessage?.created_at ? 
                          formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true }) : 
                          'No messages'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm truncate ${
                          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {lastMessage?.content || 'Start a conversation'}
                      </p>
                      {hasUnread && (
                        <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button className="w-full" variant="default">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>
    </div>
  )
}
