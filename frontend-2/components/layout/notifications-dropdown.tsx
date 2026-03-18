"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  notificationsListOptions,
  notificationsUnreadCountRetrieveOptions,
  notificationsListQueryKey,
  notificationsUnreadCountRetrieveQueryKey,
  notificationsMarkAsReadCreateMutation,
  notificationsMarkReadCreateMutation,
} from "@/src/client/@tanstack/react-query.gen"
import type { NotificationList, NotificationTypeEnum } from "@/src/client"
import {
  Bell,
  Check,
  MessageSquare,
  Calendar,
  CreditCard,
  Star,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  booking: Calendar,
  payment: CreditCard,
  session: Calendar,
  review: Star,
  system: AlertCircle,
  message: MessageSquare,
  reminder: Bell,
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  return new Date(String(value))
}

export function NotificationsDropdown() {
  const queryClient = useQueryClient()

  const { data: unreadCountData } = useQuery({
    ...notificationsUnreadCountRetrieveOptions(),
    refetchInterval: 30000,
  })

  const { data: notificationsData } = useQuery({
    ...notificationsListOptions({
      query: {
        page_size: 10,
        ordering: "-created_at",
      },
    }),
    refetchInterval: 30000,
  })

  const unreadCount = (unreadCountData as any)?.unread_count ?? 0
  const notifications: NotificationList[] = (notificationsData as any)?.results ?? []

  const markAsReadMutation = useMutation({
    ...notificationsMarkAsReadCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsListQueryKey() })
      queryClient.invalidateQueries({ queryKey: notificationsUnreadCountRetrieveQueryKey() })
    },
  })

  const markAllReadMutation = useMutation({
    ...notificationsMarkReadCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsListQueryKey() })
      queryClient.invalidateQueries({ queryKey: notificationsUnreadCountRetrieveQueryKey() })
    },
  })

  const handleMarkAsRead = (notification: NotificationList) => {
    if (notification.is_read) return
    markAsReadMutation.mutate({
      path: { id: String(notification.id) },
      body: {
        title: notification.title ?? "",
        message: notification.message ?? "",
        notification_type: notification.notification_type ?? "system",
        delivery_channel: "in_app",
      },
    })
  }

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    markAllReadMutation.mutate({
      body: {
        title: "",
        message: "",
        notification_type: "system",
        delivery_channel: "in_app",
        is_read: true,
        metadata: { notification_ids: unreadIds },
      },
    })
  }

  const getIcon = (type?: NotificationTypeEnum) => {
    const Icon = TYPE_ICONS[type ?? "system"] ?? Bell
    return <Icon className="h-4 w-4 shrink-0 text-olive-500" />
  }

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
            >
              {displayCount}
            </Badge>
          )}
          <Bell className="h-5 w-5 text-olive-600" />
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-olive-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-primary hover:text-primary/80"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 border-b border-sage-100 px-4 py-3 text-left transition-colors hover:bg-sage-50 last:border-0",
                  !notification.is_read ? "bg-sage-50" : "bg-white"
                )}
                onClick={() => handleMarkAsRead(notification)}
              >
                <div className="mt-0.5">{getIcon(notification.notification_type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm text-olive-900",
                        !notification.is_read && "font-medium"
                      )}
                    >
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-olive-600">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-sage-500">
                    {notification.created_at
                      ? formatDistanceToNow(toDate(notification.created_at), { addSuffix: true })
                      : ""}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-sage-300" />
              <p className="text-sm text-olive-600">No notifications yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 text-center">
          <Link
            href="/dashboard/user/notifications"
            className="text-sm text-primary hover:text-primary/80"
          >
            View All
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
