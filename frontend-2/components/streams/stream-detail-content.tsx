"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Lock, Unlock, Check } from "lucide-react"
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
import StreamSubscriptionPayment from "./stream-subscription-payment"
import type { StreamPost } from "@/types/stream"
import { Elements } from "@stripe/react-stripe-js"
import { getStripe } from "@/lib/stripe-loader"

const stripePromise = getStripe()

interface StreamDetailContentProps {
  streamId: string
}

export default function StreamDetailContent({ streamId }: StreamDetailContentProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTier, setSelectedTier] = useState<"free" | "entry" | "premium">("free")
  const [showPayment, setShowPayment] = useState(false)
  const [paymentTier, setPaymentTier] = useState<"entry" | "premium">("entry")

  // Fetch stream details
  const { data: stream, isLoading: streamLoading } = useQuery({
    ...streamsRetrieveOptions({
      path: { id: streamId }
    })
  })

  // Fetch stream posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    ...streamPostsListOptions({
      query: {
        stream: stream?.id,
        is_published: true,
        page_size: 20
      }
    }),
    enabled: !!stream?.id && typeof stream.id === 'number'
  })

  // Subscribe mutation
  const subscribeMutation = useMutation({
    ...streamsSubscribeCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Subscribed successfully!",
        description: `You are now subscribed to ${stream?.title}`,
      })
      queryClient.invalidateQueries({ 
        queryKey: streamsRetrieveOptions({ 
          path: { id: streamId } 
        }).queryKey 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Subscription failed",
        description: error?.body?.detail || "Failed to subscribe to stream",
        variant: "destructive",
      })
    }
  })

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    ...streamsSubscriptionChangeTierCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Subscription updated!",
        description: "Your subscription tier has been updated",
      })
      queryClient.invalidateQueries({ 
        queryKey: streamsRetrieveOptions({ 
          path: { id: streamId } 
        }).queryKey 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.body?.detail || "Failed to update subscription",
        variant: "destructive",
      })
    }
  })

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/streams/${streamId}`,
        title: "Sign in to Subscribe",
        description: "Create an account or sign in to subscribe to this stream"
      })
      return
    }

    if (selectedTier === "free") {
      subscribeMutation.mutate({
        path: {
          id: stream?.id!
        },
        body: {
          tier: "free"
        }
      })
    } else {
      // Show payment flow for paid tiers
      setPaymentTier(selectedTier as "entry" | "premium")
      setShowPayment(true)
    }
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

    // Show payment flow for tier upgrade
    setPaymentTier(newTier)
    setShowPayment(true)
  }

  // Map API response to StreamPost format
  const mapApiPostToStreamPost = (apiPost: any): StreamPost => {
    return {
      id: apiPost.public_uuid || apiPost.id,
      practitionerId: stream?.practitioner?.public_uuid || '',
      practitionerName: stream?.practitioner?.display_name || 'Unknown Practitioner',
      practitionerImage: stream?.practitioner?.profile_image_url || '/placeholder.svg',
      streamId: stream?.public_uuid || stream?.id,
      streamTitle: stream?.title || '',
      content: apiPost.content || '',
      mediaUrls: apiPost.media?.map((m: any) => m.media_url) || [],
      contentType: apiPost.post_type as any || 'article',
      isPremium: apiPost.tier_level !== 'free',
      tierLevel: apiPost.tier_level,
      createdAt: apiPost.published_at || apiPost.created_at,
      likes: apiPost.like_count || 0,
      comments: apiPost.comment_count || 0,
      views: apiPost.view_count || 0,
      tags: apiPost.tags || [],
      isLiked: false,
      isSaved: false,
      hasAccess: apiPost.can_access || false,
      userSubscriptionTier: stream?.user_subscription?.tier_level || null
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
          <h2 className="text-2xl font-bold mb-2">Stream not found</h2>
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
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white">
      {/* Header */}
      <div className="relative">
        <div 
          className="h-64 bg-gradient-to-br from-sage-200 to-terracotta-200"
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
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center shadow-lg overflow-hidden">
                    {stream.practitioner?.profile_image_url ? (
                      <img 
                        src={stream.practitioner.profile_image_url} 
                        alt={stream.practitioner.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-medium text-olive-800">
                        {stream.practitioner?.display_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1">{stream.title}</h1>
                    <p className="text-muted-foreground mb-2">by {stream.practitioner?.display_name}</p>
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
            <Card className="sticky top-6 shadow-xl">
              {!showPayment ? (
                <>
                  <CardHeader>
                    <CardTitle>Subscribe to {stream.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                {/* Free Tier */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTier === 'free' 
                      ? 'border-sage-600 bg-sage-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTier('free')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Free</h3>
                    <span className="text-2xl font-bold">$0</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Access to free content
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Community updates
                    </li>
                  </ul>
                </div>

                {/* Entry Tier */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTier === 'entry' 
                      ? 'border-sage-600 bg-sage-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTier('entry')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Entry</h3>
                    <span className="text-2xl font-bold">
                      ${((stream.entry_tier_price_cents || 0) / 100).toFixed(2)}/mo
                    </span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Everything in Free
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Entry-level exclusive content
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Monthly group sessions
                    </li>
                  </ul>
                </div>

                {/* Premium Tier */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTier === 'premium' 
                      ? 'border-sage-600 bg-sage-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTier('premium')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Premium</h3>
                    <span className="text-2xl font-bold">
                      ${((stream.premium_tier_price_cents || 0) / 100).toFixed(2)}/mo
                    </span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Everything in Entry
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      All premium content
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      1-on-1 monthly check-ins
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Priority support
                    </li>
                  </ul>
                </div>

                {/* Subscribe/Upgrade Button */}
                {!stream.user_subscription ? (
                  <Button 
                    onClick={handleSubscribe} 
                    className="w-full"
                    disabled={subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      `Subscribe - ${selectedTier === 'free' ? 'Free' : `$${
                        selectedTier === 'entry' 
                          ? ((stream.entry_tier_price_cents || 0) / 100).toFixed(2)
                          : ((stream.premium_tier_price_cents || 0) / 100).toFixed(2)
                      }/mo`}`
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-sage-50 rounded-lg">
                      <p className="text-sm text-sage-700 font-medium">
                        Current tier: {stream.user_subscription.tier_level}
                      </p>
                    </div>
                    {stream.user_subscription.tier_level !== 'premium' && (
                      <Button 
                        onClick={() => handleUpgrade(
                          stream.user_subscription!.tier_level === 'free' ? 'entry' : 'premium'
                        )} 
                        className="w-full"
                      >
                        Upgrade to {stream.user_subscription.tier_level === 'free' ? 'Entry' : 'Premium'}
                      </Button>
                    )}
                  </div>
                )}
                  </CardContent>
                </>
              ) : (
                <Elements stripe={stripePromise}>
                  <StreamSubscriptionPayment
                    stream={stream}
                    selectedTier={paymentTier}
                    onSuccess={() => {
                      setShowPayment(false)
                      setSelectedTier("free")
                    }}
                    onCancel={() => setShowPayment(false)}
                  />
                </Elements>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}