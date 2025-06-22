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
import { Search, ListFilterIcon as FilterList, X, Circle, AlertCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { conversationsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function UserMessagesList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversationId")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId)

  // Fetch conversations
  const { data: conversations, isLoading, error, refetch } = useQuery({
    ...conversationsListOptions({
      query: {
        unread_only: false
      }
    }),
    retry: 3,
    staleTime: 1000 * 60 * 2, // 2 minutes for messages
  })

  // Extract conversations from paginated response
  const conversationArray = conversations?.results || []
  
  // Filter conversations based on search
  const filteredConversations = conversationArray.filter((conversation) => {
    if (!searchQuery) return true
    const otherUser = conversation.other_user
    if (!otherUser) return false
    const fullName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.toLowerCase()
    const email = otherUser.email?.toLowerCase() || ''
    const searchLower = searchQuery.toLowerCase()
    // Check if the other user is a practitioner
    if (otherUser.is_practitioner) {
      return fullName.includes(searchLower) || email.includes(searchLower)
    }
    return false
  })

  useEffect(() => {
    if (conversationId) {
      setSelectedConversation(conversationId)
    }
  }, [conversationId])

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId)
    router.push(`/dashboard/user/messages?conversationId=${conversationId}`)
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
        <span className="text-sm text-muted-foreground">{filteredConversations.length} Conversations</span>
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
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </li>
            ))
          ) : filteredConversations.length === 0 ? (
            <li className="text-center py-8 px-4">
              <p className="text-muted-foreground text-sm">No conversations with practitioners found</p>
            </li>
          ) : (
            filteredConversations.map((conversation) => {
              const otherUser = conversation.other_user
              const lastMessage = conversation.last_message
              const hasUnread = (conversation.unread_count || 0) > 0
              
              return (
                <li
                  key={conversation.id}
                  className={`
                    py-3 px-4 cursor-pointer
                    ${selectedConversation === conversation.id.toString() ? "bg-accent" : "hover:bg-accent/50"}
                    ${selectedConversation === conversation.id.toString() ? "border-l-4 border-primary" : "border-l-4 border-transparent"}
                  `}
                  onClick={() => handleConversationSelect(conversation.id.toString())}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage 
                          src={otherUser?.avatar_url || "/placeholder.svg"} 
                          alt={`${otherUser?.first_name} ${otherUser?.last_name}`} 
                        />
                        <AvatarFallback>
                          {otherUser?.first_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate">
                          {otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Unknown Practitioner'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {lastMessage?.created_at ? 
                            formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true }) : 
                            'No messages'
                          }
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground block">Practitioner</span>
                      <div className="flex items-center mt-1">
                        <span
                          className={`text-sm truncate ${hasUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}
                        >
                          {lastMessage?.content || 'Start a conversation'}
                        </span>
                        {hasUnread && <Circle className="ml-1 h-2 w-2 fill-primary text-primary" />}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })
          )}
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
