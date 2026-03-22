"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import StreamTierSidebar from "./stream-tier-sidebar"
import type { StreamPost } from "@/types/stream"

interface StreamDetailContentProps {
  streamId: string
}

export default function StreamDetailContent({ streamId }: StreamDetailContentProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch stream details
  const { data: stream, isLoading: streamLoading } = useQuery({
    ...streamsRetrieveOptions({
      path: { id: streamId }
    })
  })

  // Fetch stream posts - get all posts for preview/subscription purposes
  const { data: postsData, isLoading: postsLoading } = useQuery({
    ...streamPostsListOptions({
      query: {
        stream: stream?.id,
        is_published: true,
        page_size: 20,
        // Don't filter by tier - we want to show all content for preview
        include_all_tiers: true
      }
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
    const userTier = stream?.user_subscription?.tier_level || null
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
          <p className="text-muted-foreground mb-4">This stream may have been removed or doesn't exist.</p>
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

  return (
    <>
      <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="relative">
        <div 
          className="h-64 bg-sage-100"
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
              onClick={() => router.back()}
              className="bg-white/90 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl -mt-20 relative z-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="border border-sage-200/60 bg-white">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div
                    className="h-20 w-20 rounded-full bg-sage-100 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-sage-300 transition-all"
                    onClick={() => router.push(`/practitioners/${stream.practitioner_slug || stream.practitioner_id}`)}
                  >
                    {stream.practitioner_image ? (
                      <img
                        src={stream.practitioner_image}
                        alt={stream.practitioner_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-medium text-olive-800">
                        {stream.practitioner_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="font-serif text-2xl font-light text-olive-900 mb-1">{stream.title}</h1>
                    <p
                      className="text-muted-foreground mb-2 cursor-pointer hover:text-sage-700 transition-colors"
                      onClick={() => router.push(`/practitioners/${stream.practitioner_slug || stream.practitioner_id}`)}
                    >
                      by {stream.practitioner_name}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {stream.subscriber_count || 0} subscribers
                      </span>
                      <span>{stream.post_count || 0} posts</span>
                    </div>
                  </div>
                </div>
                {stream.description && (
                  <p className="mt-4 text-muted-foreground">{stream.description}</p>
                )}
                {stream.tags && stream.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {stream.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* About Section */}
            {(stream.about || stream.tagline) && (
              <Card className="mt-4 border border-sage-200/60 bg-white">
                <CardContent className="pt-6">
                  {stream.tagline && (
                    <p className="text-lg font-serif font-light text-olive-800 mb-3 italic">
                      {stream.tagline}
                    </p>
                  )}
                  {stream.about && (
                    <div className="text-olive-700 leading-relaxed whitespace-pre-line">
                      {stream.about}
                    </div>
                  )}
                  <p className="mt-4">
                    <span
                      className="text-sm text-sage-600 hover:text-sage-700 cursor-pointer transition-colors font-medium"
                      onClick={() => router.push(`/practitioners/${stream.practitioner_slug || stream.practitioner_id}`)}
                    >
                      View {stream.practitioner_name}&apos;s full profile →
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Content Tabs */}
            <div className="mt-8">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All ({posts.length})</TabsTrigger>
                  <TabsTrigger value="free">
                    <Unlock className="h-4 w-4 mr-1" />
                    Free ({freePosts.length})
                  </TabsTrigger>
                  <TabsTrigger value="entry">
                    <Lock className="h-4 w-4 mr-1" />
                    Entry ({entryPosts.length})
                  </TabsTrigger>
                  <TabsTrigger value="premium">
                    <Lock className="h-4 w-4 mr-1" />
                    Premium ({premiumPosts.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6 space-y-4">
                  {postsLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : posts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No posts yet</p>
                  ) : (
                    posts.map((post) => <ContentCard key={post.id} post={post} />)
                  )}
                </TabsContent>
                
                <TabsContent value="free" className="mt-6 space-y-4">
                  {freePosts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No free posts yet</p>
                  ) : (
                    freePosts.map((post) => <ContentCard key={post.id} post={post} />)
                  )}
                </TabsContent>
                
                <TabsContent value="entry" className="mt-6 space-y-4">
                  {entryPosts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No entry tier posts yet</p>
                  ) : (
                    entryPosts.map((post) => <ContentCard key={post.id} post={post} />)
                  )}
                </TabsContent>
                
                <TabsContent value="premium" className="mt-6 space-y-4">
                  {premiumPosts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No premium posts yet</p>
                  ) : (
                    premiumPosts.map((post) => <ContentCard key={post.id} post={post} />)
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Sidebar - Subscription */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <StreamTierSidebar
                stream={stream}
                onFollowFree={handleFollowFree}
                onSubscribe={handleSubscribe}
                onUpgrade={handleUpgrade}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}