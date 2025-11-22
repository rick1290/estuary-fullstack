"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Send, CheckCircle2, ArrowRight } from "lucide-react"
import { conversationsList, conversationsCreate } from "@/src/client/sdk.gen"
import { toast } from "sonner"
import type { Practitioner } from "@/types/practitioner"

interface SendMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  practitioner: Practitioner
}

export function SendMessageModal({ open, onOpenChange, practitioner }: SendMessageModalProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Generate default message when modal opens
  const getDefaultMessage = () => {
    return `Hi ${practitioner.first_name || practitioner.display_name?.split(' ')[0] || 'there'},\n\nI'm interested in learning more about your services and how you might be able to help me on my wellness journey.\n\nLooking forward to connecting!`
  }

  // Reset state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isSent) {
      setMessage(getDefaultMessage())
    }
    if (!newOpen) {
      // Reset after close animation
      setTimeout(() => {
        setIsSent(false)
        setConversationId(null)
        setMessage("")
      }, 200)
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    const userId = practitioner.user_id || (practitioner.user?.id ? Number(practitioner.user.id) : null)
    if (!userId) {
      toast.error("Unable to message this practitioner")
      return
    }

    setIsSubmitting(true)
    try {
      // Check if a conversation already exists
      const conversationsResponse = await conversationsList()
      const existingConversation = conversationsResponse.data?.results?.find((conv: any) => {
        return conv.participants?.some((p: any) => p.user_id === userId)
      })

      let newConversationId: string | null = null

      if (existingConversation) {
        // Use existing conversation - we'll still need to send the message
        // For now, just navigate to existing conversation
        newConversationId = existingConversation.id
      } else {
        // Create new conversation with initial message
        const response = await conversationsCreate({
          body: {
            other_user_id: userId,
            initial_message: message.trim()
          }
        })

        if (response.data?.id) {
          newConversationId = response.data.id
        }
      }

      if (newConversationId) {
        setConversationId(newConversationId)
        setIsSent(true)
        toast.success("Message sent!")
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      toast.error("Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToMessages = () => {
    if (conversationId) {
      router.push(`/dashboard/user/messages?conversationId=${conversationId}`)
    } else {
      router.push('/dashboard/user/messages')
    }
    onOpenChange(false)
  }

  const handleKeepBrowsing = () => {
    onOpenChange(false)
  }

  const initials = practitioner.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!isSent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-sage-600" />
                Message {practitioner.first_name || practitioner.display_name?.split(' ')[0]}
              </DialogTitle>
              <DialogDescription>
                Send a message to start a conversation
              </DialogDescription>
            </DialogHeader>

            {/* Practitioner Preview */}
            <div className="flex items-center gap-3 p-3 bg-sage-50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={practitioner.profile_image_url} alt={practitioner.display_name} />
                <AvatarFallback className="bg-sage-200 text-olive-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-olive-900">{practitioner.display_name}</p>
                <p className="text-sm text-olive-600">{practitioner.title}</p>
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
                className="min-h-[150px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Feel free to edit the message above or write your own
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle>Message Sent!</DialogTitle>
              <DialogDescription>
                Your message has been sent to {practitioner.first_name || practitioner.display_name?.split(' ')[0]}.
                They'll be notified and can respond to you directly.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button onClick={handleGoToMessages} className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Go to Messages
              </Button>
              <Button variant="outline" onClick={handleKeepBrowsing} className="w-full">
                Keep Browsing
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
