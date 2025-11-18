export interface StreamPost {
  id: string
  practitionerId: string
  practitionerSlug: string
  practitionerName: string
  practitionerImage: string
  streamId?: string
  streamTitle?: string
  content: string
  mediaUrls: string[]
  contentType: "video" | "image" | "article" | "audio"
  isPremium: boolean
  tierLevel?: "free" | "entry" | "premium"
  createdAt: string
  likes: number
  comments: number
  views: number
  tags: string[]
  isLiked?: boolean
  isSaved?: boolean
  commentsList?: StreamComment[]
  // User's subscription status to this stream
  userSubscriptionTier?: "free" | "entry" | "premium" | null
  hasAccess?: boolean
}

export interface StreamComment {
  id: string
  postId: string
  userId: string
  userName: string
  userImage: string
  content: string
  createdAt: string
  likes: number
}

export interface FeaturedPractitioner {
  id: string
  name: string
  image: string
  coverImage: string
  title: string
  tags: string[]
  subscriberCount: number
  postCount: number
  streamId?: string
  entryPrice?: number
  premiumPrice?: number
  userSubscriptionTier?: "free" | "entry" | "premium" | null
}
