export interface FeedPost {
  id: string
  practitionerId: string
  content: string
  mediaUrls: string[]
  mediaType?: "image" | "video" | "document"
  isPremium: boolean
  createdAt: string
  likes: number
  comments: number
  attachments?: Attachment[]
  tags?: string[]
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export interface Comment {
  id: string
  postId: string
  userId: string
  userFullName: string
  userProfilePicture?: string
  content: string
  createdAt: string
  likes: number
}

export interface SubscriptionTier {
  id: string
  practitionerId: string
  name: string
  description: string
  price: number
  billingCycle: "monthly" | "quarterly" | "annual"
  features: string[]
  isPopular?: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  practitionerId: string
  tierId: string
  startDate: string
  endDate: string
  isActive: boolean
  autoRenew: boolean
}
