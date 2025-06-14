export interface StreamPost {
  id: string
  practitionerId: string
  title: string
  content: string
  mediaUrls: string[]
  mediaType?: "image" | "video" | "document"
  tier: "free" | "entry" | "premium"
  status: "draft" | "scheduled" | "published"
  scheduledAt?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
  tags: string[]
  attachments?: StreamAttachment[]
  stats: {
    views: number
    likes: number
    comments: number
    unlocks: number
  }
}

export interface StreamAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export interface StreamSubscriber {
  id: string
  userId: string
  practitionerId: string
  tier: "entry" | "premium"
  startDate: string
  endDate: string
  isActive: boolean
  autoRenew: boolean
  userInfo: {
    firstName: string
    lastName: string
    email: string
    profilePicture?: string
  }
}

export interface StreamAnalytics {
  totalSubscribers: number
  subscribersByTier: {
    entry: number
    premium: number
  }
  recentSubscribers: StreamSubscriber[]
  revenue: {
    monthly: number
    total: number
  }
  topPosts: StreamPost[]
  engagementStats: {
    totalViews: number
    totalLikes: number
    totalComments: number
    averageEngagement: number
  }
}

export interface CreatePostFormData {
  title: string
  content: string
  tier: "free" | "entry" | "premium"
  mediaFiles: File[]
  attachments: File[]
  tags: string[]
  scheduledAt?: string
  status: "draft" | "scheduled" | "published"
}
