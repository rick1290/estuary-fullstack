"use client"

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { messagesUnreadCountRetrieveOptions } from '@/src/client/@tanstack/react-query.gen'
import { toast } from 'sonner'

interface UseMessageNotificationsProps {
  enabled?: boolean
  showBrowserNotifications?: boolean
  showToastNotifications?: boolean
}

export function useMessageNotifications({
  enabled = true,
  showBrowserNotifications = false,
  showToastNotifications = true
}: UseMessageNotificationsProps = {}) {
  const previousUnreadCount = useRef<number>(0)
  const hasPermission = useRef<boolean>(false)

  // Request browser notification permission
  useEffect(() => {
    if (showBrowserNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          hasPermission.current = permission === 'granted'
        })
      } else {
        hasPermission.current = Notification.permission === 'granted'
      }
    }
  }, [showBrowserNotifications])

  // Fetch unread message count
  const { data: unreadData } = useQuery({
    ...messagesUnreadCountRetrieveOptions(),
    enabled,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true
  })

  const unreadCount = unreadData?.unread_count || 0

  // Show notifications when unread count increases
  useEffect(() => {
    if (unreadCount > previousUnreadCount.current && previousUnreadCount.current > 0) {
      const newMessages = unreadCount - previousUnreadCount.current
      
      // Show toast notification
      if (showToastNotifications) {
        toast.info(`You have ${newMessages} new message${newMessages > 1 ? 's' : ''}`, {
          duration: 5000,
        })
      }

      // Show browser notification
      if (showBrowserNotifications && hasPermission.current) {
        new Notification(`${newMessages} new message${newMessages > 1 ? 's' : ''}`, {
          body: 'You have new messages from your clients',
          icon: '/favicon.ico',
          tag: 'estuary-messages', // Replaces previous notifications
        })
      }
    }

    previousUnreadCount.current = unreadCount
  }, [unreadCount, showBrowserNotifications, showToastNotifications])

  return {
    unreadCount,
    hasNotificationPermission: hasPermission.current
  }
}