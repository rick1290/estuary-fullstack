"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, X, Filter, MessageSquarePlus, Users, Heart, BookOpen } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  conversationsListOptions,
  practitionerMessagingEligibleContactsRetrieveOptions,
  conversationsCreateMutation
} from "@/src/client/@tanstack/react-query.gen"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function PractitionerMessagesList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversationId")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId)
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery({
    ...conversationsListOptions({
      query: {
        unread_only: false
      }
    })
  })

  // Fetch eligible contacts for new messages
  const { data: eligibleContactsData, isLoading: contactsLoading } = useQuery({
    ...practitionerMessagingEligibleContactsRetrieveOptions(),
    enabled: showNewMessageDialog
  })

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    ...conversationsCreateMutation(),
    onSuccess: (data) => {
      // Navigate to the new conversation
      handleConversationSelect(data.id.toString())
      setShowNewMessageDialog(false)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success("New conversation started")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to start conversation")
    }
  })

  // Filter conversations based on search
  const conversationsList = conversations?.results || []
  const filteredConversations = conversationsList.filter((conversation) => {
    if (!searchQuery) return true
    const otherUser = conversation.other_user
    if (!otherUser) return false
    const fullName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.toLowerCase()
    const email = otherUser.email?.toLowerCase() || ''
    const searchLower = searchQuery.toLowerCase()
    return fullName.includes(searchLower) || email.includes(searchLower)
  })

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

  const handleStartConversation = (userId: number) => {
    createConversationMutation.mutate({
      body: {
        other_user_id: userId
      }
    })
  }

  const getRelationshipIcon = (relationshipTypes: string[]) => {
    if (relationshipTypes.includes('client')) return <Users className="h-3 w-3" />
    if (relationshipTypes.includes('favorite')) return <Heart className="h-3 w-3" />
    return <BookOpen className="h-3 w-3" />
  }

  const getRelationshipText = (relationshipTypes: string[]) => {
    if (relationshipTypes.includes('client')) return 'Client'
    if (relationshipTypes.includes('favorite')) return 'Favorited You'
    return 'Other'
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
        <Button 
          className="w-full" 
          variant="default"
          onClick={() => setShowNewMessageDialog(true)}
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>
              Select a client or contact to start messaging. You can only message clients and users who have favorited you based on your subscription tier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {contactsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="ml-3 space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : eligibleContactsData?.contacts && eligibleContactsData.contacts.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eligibleContactsData.contacts
                  .filter(contact => !contact.conversation_id) // Only show contacts without existing conversations
                  .map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleStartConversation(contact.id)}
                    disabled={createConversationMutation.isPending}
                    className="w-full flex items-center p-3 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar_url || "/placeholder.svg"} alt={contact.full_name} />
                      <AvatarFallback>
                        {contact.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3 flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{contact.full_name}</p>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {getRelationshipIcon(contact.relationship_types)}
                          <span className="text-xs">{getRelationshipText(contact.relationship_types)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No contacts available to message.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {eligibleContactsData?.subscription_tier === 'basic' 
                    ? "Upgrade to Professional to message users who favorited you."
                    : "Users who book your services or favorite you will appear here."
                  }
                </p>
              </div>
            )}
          </div>

          {eligibleContactsData?.permissions && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">
                Your Messaging Permissions ({eligibleContactsData.subscription_tier})
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {eligibleContactsData.permissions.can_message_clients && (
                  <li>✓ Message clients (users who booked your services)</li>
                )}
                {eligibleContactsData.permissions.can_message_favorites && (
                  <li>✓ Message users who favorited you</li>
                )}
                {eligibleContactsData.permissions.can_message_subscribers && (
                  <li>✓ Message stream subscribers</li>
                )}
                <li>Daily limit: {eligibleContactsData.permissions.message_limit_per_day} messages</li>
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
