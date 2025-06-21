"use client"

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useQueryClient } from '@tanstack/react-query'

interface MessageEvent {
  type: 'chat_message' | 'typing_indicator' | 'read_receipt' | 'message_edited' | 'user_status'
  data: any
}

interface WebSocketMessage {
  id?: string
  conversation_id: string
  sender: {
    id: number
    first_name: string
    last_name: string
    avatar_url?: string
  }
  content: string
  message_type: string
  created_at: string
}

interface TypingEvent {
  conversation_id: string
  user_id: number
  is_typing: boolean
  user_name: string
}

interface UseWebSocketMessagingProps {
  conversationId?: string
  onMessage?: (message: WebSocketMessage) => void
  onTyping?: (event: TypingEvent) => void
  onUserStatus?: (userId: number, isOnline: boolean) => void
}

export function useWebSocketMessaging({
  conversationId,
  onMessage,
  onTyping,
  onUserStatus
}: UseWebSocketMessagingProps) {
  const { user, getAccessToken } = useAuth()
  const queryClient = useQueryClient()
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isMountedRef = useRef(true)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set())
  
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000

  const getWebSocketUrl = useCallback(async () => {
    if (!conversationId || !user) return null
    
    const token = await getAccessToken()
    if (!token) return null

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host.replace(':3001', ':8000')
    
    return `${protocol}//${host}/ws/chat/${conversationId}/?token=${token}`
  }, [conversationId, user, getAccessToken])

  const connect = useCallback(async () => {
    if (!conversationId || !user) return

    try {
      if (isMountedRef.current) {
        setConnectionStatus('connecting')
      }
      const url = await getWebSocketUrl()
      if (!url) {
        if (isMountedRef.current) {
          setConnectionStatus('error')
        }
        return
      }

      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        console.log(`WebSocket connected to conversation ${conversationId}`)
        if (isMountedRef.current) {
          setConnectionStatus('connected')
        }
        reconnectAttempts.current = 0
      }

      ws.current.onmessage = (event) => {
        try {
          const messageEvent: MessageEvent = JSON.parse(event.data)
          
          switch (messageEvent.type) {
            case 'chat_message':
              const message: WebSocketMessage = messageEvent.data
              onMessage?.(message)
              
              // Invalidate queries to update message lists
              queryClient.invalidateQueries({ 
                queryKey: ['conversations', conversationId, 'messages'] 
              })
              queryClient.invalidateQueries({ 
                queryKey: ['conversations'] 
              })
              break

            case 'typing_indicator':
              const typingEvent: TypingEvent = messageEvent.data
              onTyping?.(typingEvent)
              
              if (isMountedRef.current) {
                setTypingUsers(prev => {
                  const newSet = new Set(prev)
                  if (typingEvent.is_typing) {
                    newSet.add(typingEvent.user_id)
                  } else {
                    newSet.delete(typingEvent.user_id)
                  }
                  return newSet
                })
              }
              break

            case 'read_receipt':
              // Update read status in messages
              queryClient.invalidateQueries({ 
                queryKey: ['conversations', conversationId, 'messages'] 
              })
              break

            case 'user_status':
              const { user_id, is_online } = messageEvent.data
              onUserStatus?.(user_id, is_online)
              break

            default:
              console.log('Unknown WebSocket message type:', messageEvent.type)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onclose = (event) => {
        console.log(`WebSocket disconnected from conversation ${conversationId}`, event.code, event.reason)
        if (isMountedRef.current) {
          setConnectionStatus('disconnected')
        }
        
        // Auto-reconnect if not a normal closure and component is still mounted
        if (isMountedRef.current && event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current)
          reconnectAttempts.current++
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect()
            }
          }, delay)
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (isMountedRef.current) {
          setConnectionStatus('error')
        }
      }

    } catch (error) {
      console.error('Error connecting to WebSocket:', error)
      if (isMountedRef.current) {
        setConnectionStatus('error')
      }
    }
  }, [conversationId, user, getWebSocketUrl, onMessage, onTyping, onUserStatus, queryClient])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
    
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close(1000, 'Component unmounting')
      ws.current = null
    }
    
    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setConnectionStatus(prev => {
        if (prev !== 'disconnected') {
          return 'disconnected'
        }
        return prev
      })
      setTypingUsers(new Set())
    }
  }, [])

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'typing_indicator',
        data: {
          conversation_id: conversationId,
          is_typing: isTyping
        }
      }))
    }
  }, [conversationId])

  const markAsRead = useCallback((messageId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'read_receipt',
        data: {
          conversation_id: conversationId,
          message_id: messageId
        }
      }))
    }
  }, [conversationId])

  // Connect when conversation changes
  useEffect(() => {
    if (conversationId && user) {
      connect()
    }

    return () => {
      // Clean disconnect without dependencies
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = undefined
      }
      
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close(1000, 'Component unmounting')
        ws.current = null
      }
    }
  }, [conversationId, user, connect])

  // Set mounted status on mount/unmount
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    connectionStatus,
    typingUsers,
    sendTypingIndicator,
    markAsRead,
    reconnect: connect
  }
}