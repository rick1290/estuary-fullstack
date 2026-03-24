"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Lock, Heart, Zap, Crown, Check, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  streamsRetrieveOptions,
  streamsSubscribeCreateMutation,
  streamsSubscriptionChangeTierCreateMutation,
  streamPostsListOptions
} from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Spinner } from "@/components/ui/spinner"
import ContentCard from "./content-card"
import type { StreamPost } from "@/types/stream"

interface StreamDetailContentProps {
  streamId: string
}

type FeedFilter = "all" | "free" | "entry" | "premium"

export default function StreamDetailContent({ streamId }: StreamDetailContentProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all")
  const [showStickyBar, setShowStickyBar] = useState(false)
  const subscribeSectionRef = useRef<HTMLDivElement>(null)

  // Sticky bar intersection observer
  useEffect(() => {
    const el = subscribeSectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Fetch stream details
  const { data: stream, isLoading: streamLoading } = useQuery({
    ...streamsRetrieveOptions({
      path: { id: streamId as any }
    })
  })

  // Fetch stream posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    ...streamPostsListOptions({
      query: {
        stream: stream?.id,
        is_published: true,
        page_size: 20,
      } as any
    }),
    enabled: !!stream?.id && typeof stream.id === 'number'
  })


  const handleSubscribe = (tier: "entry" | "premium" = "entry") => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/streams/${streamId}`,
        title: "Sign in to Subscribe",
        description: "Create an account or sign in to subscribe to this stream"
      })
      return
    }

    // Redirect to stream checkout page
    router.push(`/checkout/stream?streamId=${streamId}&tier=${tier}`)
  }

  const handleUpgrade = (newTier: "entry" | "premium") => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/streams/${streamId}`,
        title: "Sign in to Upgrade",
        description: "Sign in to upgrade your subscription"
      })
      return
    }

    // Redirect to stream checkout page for upgrade
    router.push(`/checkout/stream?streamId=${streamId}&tier=${newTier}`)
  }

  // Free follow mutation
  const followFreeMutation = useMutation({
    ...streamsSubscribeCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Following!",
        description: `You're now following ${stream?.title}. You'll see free content in your feed.`,
      })
      queryClient.invalidateQueries({ queryKey: ['streamsRetrieve'] })
    },
    onError: (error: any) => {
      const message = error?.body?.error || error?.body?.detail || "Could not follow this stream."
      toast({
        title: "Failed to follow",
        description: message,
        variant: "destructive",
      })
    }
  })

  const handleFollowFree = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/streams/${streamId}`,
        title: "Sign in to Follow",
        description: "Create an account or sign in to follow this stream for free"
      })
      return
    }

    if (!stream?.id) return
    followFreeMutation.mutate({
      path: { id: stream.id },
      body: { tier: 'free' } as any
    })
  }

  // Map API response to StreamPost format
  const mapApiPostToStreamPost = (apiPost: any): StreamPost => {
    const userTier = (stream as any)?.subscription_tier || null
    // For public users or non-subscribers, show preview access (no full access)
    // For subscribers, check actual access
    const hasAccess = userTier ? (apiPost.can_access || false) : false

    return {
      id: apiPost.public_uuid || apiPost.id,
      practitionerId: apiPost.practitioner_id || stream?.practitioner_id || '',
      practitionerSlug: apiPost.practitioner_slug || stream?.practitioner_slug || '',
      practitionerName: apiPost.practitioner_name || stream?.practitioner_name || 'Unknown Practitioner',
      practitionerImage: apiPost.practitioner_image || stream?.practitioner_image || '/placeholder.svg',
      streamId: apiPost.stream || stream?.id || '',
      streamTitle: apiPost.stream_title || stream?.title || '',
      content: apiPost.content || '',
      teaserText: apiPost.teaser_text || undefined,
      mediaUrls: apiPost.media?.map((m: any) => m.url ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${m.url}` : '') || [],
      contentType: apiPost.post_type as any || 'article',
      isPremium: apiPost.tier_level !== 'free',
      tierLevel: apiPost.tier_level,
      createdAt: apiPost.published_at || apiPost.created_at,
      likes: apiPost.like_count || 0,
      comments: apiPost.comment_count || 0,
      views: apiPost.view_count || 0,
      tags: apiPost.tags || [],
      isLiked: apiPost.is_liked || false,
      isSaved: apiPost.is_saved || false,
      hasAccess: hasAccess,
      userSubscriptionTier: userTier,
      linkedService: apiPost.linked_service_detail ? {
        id: apiPost.linked_service_detail.id,
        title: apiPost.linked_service_detail.title,
        serviceType: apiPost.linked_service_detail.service_type,
        price: parseFloat(apiPost.linked_service_detail.price),
        duration: apiPost.linked_service_detail.duration,
        slug: apiPost.linked_service_detail.slug,
        practitionerName: apiPost.linked_service_detail.practitioner_name,
      } : null
    }
  }

  if (streamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!stream) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-light text-olive-900 mb-2">Stream not found</h2>
          <p className="text-muted-foreground mb-4">This stream may have been removed or doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/streams')}>
            Back to Streams
          </Button>
        </div>
      </div>
    )
  }

  const posts = postsData?.results?.map(mapApiPostToStreamPost) || []
  const freePosts = posts.filter(p => p.tierLevel === 'free')
  const entryPosts = posts.filter(p => p.tierLevel === 'entry')
  const premiumPosts = posts.filter(p => p.tierLevel === 'premium')

  const filteredPosts =
    activeFilter === "all" ? posts :
    activeFilter === "free" ? freePosts :
    activeFilter === "entry" ? entryPosts :
    premiumPosts

  const userTier = (stream as any)?.subscription_tier || null
  const isSubscribed = !!userTier

  const entryPriceCents = stream.entry_tier_price_cents || 0
  const premiumPriceCents = stream.premium_tier_price_cents || 0
  const entryPriceDisplay = entryPriceCents > 0 ? `$${(entryPriceCents / 100).toFixed(2)}` : "Free"
  const premiumPriceDisplay = premiumPriceCents > 0 ? `$${(premiumPriceCents / 100).toFixed(2)}` : "Free"

  const initials = stream.practitioner_name?.split(' ').map((n: string) => n[0]).join('') || '?'

  return (
    <>
      {/* Sticky subscribe bar */}
      {showStickyBar && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sage-200/60 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-8 w-8">
                {stream.practitioner_image ? (
                  <AvatarImage src={stream.practitioner_image} alt={stream.practitioner_name} />
                ) : null}
                <AvatarFallback className="text-xs bg-sage-100 text-olive-800">{initials}</AvatarFallback>
              </Avatar>
              <span className="font-serif text-sm font-medium text-olive-900 truncate">{stream.title}</span>
            </div>
            {isSubscribed ? (
              <Badge variant="secondary" className="shrink-0 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Following
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={handleFollowFree}
                disabled={followFreeMutation.isPending}
                className="shrink-0 bg-sage-600 hover:bg-sage-700 text-white text-xs px-4"
              >
                {followFreeMutation.isPending ? <Spinner className="h-3 w-3" /> : "Follow"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-cream-50">
        {/* Cover photo */}
        <div className="relative">
          <div
            className="h-48 sm:h-56 w-full bg-sage-100"
            style={{
              backgroundImage: stream.cover_image_url ? `url(${stream.cover_image_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-4 left-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="bg-white/90 backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* Single column layout */}
        <div className="max-w-2xl mx-auto px-4">
          {/* Profile hero */}
          <div className="relative">
            {/* Avatar overlapping cover */}
            <div
              className="-mt-12 mb-3 cursor-pointer"
              onClick={() => router.push(`/practitioners/${stream.practitioner_slug || stream.practitioner_id}`)}
            >
              <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                {stream.practitioner_image ? (
                  <AvatarImage src={stream.practitioner_image} alt={stream.practitioner_name} />
                ) : null}
                <AvatarFallback className="text-2xl font-medium bg-sage-100 text-olive-800">{initials}</AvatarFallback>
              </Avatar>
            </div>

            {/* Name and meta */}
            <div className="mb-4">
              <h1 className="font-serif text-2xl font-light text-olive-900 mb-0.5">{stream.title}</h1>
              <p
                className="text-muted-foreground text-sm cursor-pointer hover:text-sage-700 transition-colors mb-2"
                onClick={() => router.push(`/practitioners/${stream.practitioner_slug || stream.practitioner_id}`)}
              >
                by {stream.practitioner_name}
              </p>

              {stream.tagline && (
                <p className="text-olive-800 font-serif font-light italic mb-2">{stream.tagline}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {stream.subscriber_count || 0} subscribers
                </span>
                <span>{stream.post_count || 0} posts</span>
              </div>

              {stream.about && (
                <p className="text-olive-700 text-sm leading-relaxed whitespace-pre-line mb-3">{stream.about}</p>
              )}
              {!stream.about && stream.description && (
                <p className="text-olive-700 text-sm leading-relaxed mb-3">{stream.description}</p>
              )}

              {stream.tags && Array.isArray(stream.tags) && (stream.tags as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(stream.tags as string[]).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs font-normal px-2 py-0.5">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="mt-3">
                <span
                  className="text-xs text-sage-600 hover:text-sage-700 cursor-pointer transition-colors font-medium"
                  onClick={() => router.push(`/practitioners/${stream.practitioner_slug || stream.practitioner_id}`)}
                >
                  View {stream.practitioner_name}&apos;s full profile &rarr;
                </span>
              </p>
            </div>
          </div>

          {/* Inline subscribe section */}
          <div ref={subscribeSectionRef} className="mb-6 pb-6 border-b border-sage-200/60">
            {!isSubscribed ? (
              <div className="space-y-3">
                <Button
                  onClick={handleFollowFree}
                  disabled={followFreeMutation.isPending}
                  className="w-full bg-sage-600 hover:bg-sage-700 text-white"
                  size="lg"
                >
                  {followFreeMutation.isPending ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Heart className="h-4 w-4 mr-2" />
                  )}
                  {stream.free_tier_name || "Follow for Free"}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  {/* Entry tier card */}
                  <div className="rounded-lg border border-sage-200/80 bg-white p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="h-4 w-4 text-sage-600" />
                      <span className="text-sm font-medium text-olive-900">
                        {stream.entry_tier_name || "Member"}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-olive-900 mb-1">{entryPriceDisplay}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                    {Array.isArray(stream.entry_tier_perks) && (stream.entry_tier_perks as string[]).length > 0 && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{(stream.entry_tier_perks as string[]).join(' · ')}</p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => handleSubscribe("entry")}
                    >
                      Subscribe
                    </Button>
                  </div>

                  {/* Premium tier card */}
                  <div className="rounded-lg border border-sage-200/80 bg-white p-4 relative">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-olive-900">
                        {stream.premium_tier_name || "Premium"}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-olive-900 mb-1">{premiumPriceDisplay}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                    {Array.isArray(stream.premium_tier_perks) && (stream.premium_tier_perks as string[]).length > 0 && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{(stream.premium_tier_perks as string[]).join(' · ')}</p>
                    )}
                    <Button
                      size="sm"
                      className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => handleSubscribe("premium")}
                    >
                      Subscribe
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-sage-600" />
                  <span className="text-sm text-olive-800">
                    Subscribed &mdash;{" "}
                    <Badge variant="secondary" className="text-xs">
                      {userTier === "premium"
                        ? stream.premium_tier_name || "Premium"
                        : userTier === "entry"
                        ? stream.entry_tier_name || "Member"
                        : stream.free_tier_name || "Free"}
                    </Badge>
                  </span>
                </div>
                {userTier !== "premium" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleUpgrade("premium")}
                  >
                    <Crown className="h-3 w-3 mr-1 text-amber-500" />
                    Upgrade
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Feed filter pills */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto">
            {([
              { key: "all" as FeedFilter, label: "All", count: posts.length },
              { key: "free" as FeedFilter, label: "Free", count: freePosts.length },
              { key: "entry" as FeedFilter, label: "Members", count: entryPosts.length },
              { key: "premium" as FeedFilter, label: "Premium", count: premiumPosts.length },
            ]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`
                  inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                  ${activeFilter === key
                    ? "bg-olive-900 text-white"
                    : "bg-white text-olive-700 border border-sage-200/80 hover:bg-sage-50"
                  }
                `}
              >
                {(key === "entry" || key === "premium") && <Lock className="h-3 w-3" />}
                {label}
                <span className={`text-xs ${activeFilter === key ? "text-white/70" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Content feed */}
          <div className="space-y-4 pb-12">
            {postsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="p-4 bg-sage-50 rounded-full mb-4">
                  <Newspaper className="h-10 w-10 text-sage-400" strokeWidth="1.5" />
                </div>
                <h3 className="font-serif text-xl font-light text-olive-900 mb-2 text-center">
                  {activeFilter === "all" ? "No posts yet" : `No ${activeFilter} posts yet`}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  {activeFilter === "all"
                    ? "This stream doesn't have any posts yet. Check back soon!"
                    : `No ${activeFilter}-tier posts are available right now.`}
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => <ContentCard key={post.id} post={post} />)
            )}
          </div>
        </div>
      </div>
    </>
  )
}
