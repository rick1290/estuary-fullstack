"use client"

import { useState, useEffect } from "react"
import { Plus, Search, BarChart3, Users, DollarSign, Eye, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PractitionerPageHeader } from "../practitioner-page-header"
import StreamPostsList from "./stream-posts-list"
import CreatePostDialog from "./create-post-dialog"
import StreamAnalytics from "./stream-analytics"
import SubscriberManagement from "./subscriber-management"
import StreamPricing from "./stream-pricing"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  streamsListOptions, 
  streamsCreateMutation,
  streamsAnalyticsRetrieveOptions,
  streamsPricingPartialUpdateMutation,
  streamPostsCreateMutation,
  streamPostsListOptions,
  streamPostsPartialUpdateMutation,
  streamPostsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"

const STREAM_TABS = [
  { value: "posts", label: "Posts" },
  { value: "analytics", label: "Analytics" },
  { value: "subscribers", label: "Subscribers" },
  { value: "pricing", label: "Pricing" },
]

export default function StreamsDashboardV2() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("posts")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTier, setFilterTier] = useState<"all" | "free" | "entry" | "premium">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "scheduled" | "published">("all")
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [posts, setPosts] = useState<any[]>([])

  // Fetch practitioner's stream
  const { data: streamsData, isLoading: streamsLoading } = useQuery({
    ...streamsListOptions({
      query: {
        practitioner: user?.practitionerId
      }
    })
  })

  const practitionerStream = streamsData?.results?.[0]

  // Fetch stream analytics
  const { data: analyticsData } = useQuery({
    ...streamsAnalyticsRetrieveOptions({
      path: {
        id: practitionerStream?.id || 0
      }
    }),
    enabled: !!practitionerStream?.id
  })

  // Create stream mutation
  const createStreamMutation = useMutation({
    ...streamsCreateMutation(),
    onSuccess: (data) => {
      toast({
        title: "Stream created!",
        description: "Your stream has been created successfully. Set up your pricing to start accepting subscriptions.",
      })
      // Invalidate the streams query to refetch data
      queryClient.invalidateQueries({ 
        queryKey: [{ 
          _id: 'streamsList',
          query: { practitioner: user?.practitionerId }
        }] 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.body?.detail || "Failed to create stream",
        variant: "destructive",
      })
    }
  })

  const createStream = () => {
    createStreamMutation.mutate({
      body: {
        title: `${user?.firstName || 'My'} Wellness Journey`,
        description: 'Welcome to my exclusive wellness content stream!',
        entry_tier_price_cents: 1000,  // $10 default
        premium_tier_price_cents: 2000, // $20 default
      }
    })
  }

  // Fetch stream posts
  const { data: postsData } = useQuery({
    ...streamPostsListOptions({
      query: {
        stream: practitionerStream?.id
      }
    }),
    enabled: !!practitionerStream?.id
  })

  useEffect(() => {
    if (postsData?.results) {
      setPosts(postsData.results)
    }
  }, [postsData])

  const filteredPosts = posts.filter((post: any) => {
    const matchesSearch =
      (post.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags || []).some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTier = filterTier === "all" || post.tier_level === filterTier
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "published" && post.is_published) ||
      (filterStatus === "draft" && !post.is_published)

    return matchesSearch && matchesTier && matchesStatus
  })

  // Create post mutation
  const createPostMutation = useMutation({
    ...streamPostsCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Post created!",
        description: "Your post has been created successfully.",
      })
      queryClient.invalidateQueries({ 
        queryKey: streamPostsListOptions({ 
          query: { stream: practitionerStream?.id } 
        }).queryKey 
      })
      setCreatePostOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.body?.detail || error?.message || "Failed to create post",
        variant: "destructive",
      })
    }
  })

  const handleCreatePost = async (postData: any) => {
    if (!practitionerStream?.id) {
      toast({
        title: "Create Your Stream First",
        description: "You need to create a stream before you can publish posts. Click 'Create My Stream' to get started.",
        variant: "destructive",
      })
      return
    }

    // Check if we have media files
    const hasMedia = postData.mediaFiles && postData.mediaFiles.length > 0
    
    if (hasMedia) {
      // Create FormData for multipart upload
      const formData = new FormData()
      
      // Add text fields
      formData.append('stream', practitionerStream.id.toString())
      formData.append('title', postData.title || '')
      formData.append('content', postData.content)
      formData.append('post_type', postData.mediaFiles.length > 0 ? 'gallery' : 'post')
      formData.append('tier_level', postData.tier)
      formData.append('is_published', String(postData.status === 'published'))
      formData.append('allow_comments', 'true')
      formData.append('allow_tips', 'true')
      
      // Add tags as JSON
      if (postData.tags && postData.tags.length > 0) {
        formData.append('tags', JSON.stringify(postData.tags))
      }
      
      // Add media files
      postData.mediaFiles.forEach((file: File, index: number) => {
        formData.append(`media_files[${index}]`, file)
        // Add captions if available
        if (postData.mediaCaptions && postData.mediaCaptions[index]) {
          formData.append(`media_captions[${index}]`, postData.mediaCaptions[index])
        }
      })
      
      // Use direct fetch for FormData uploads with proper API URL and auth
      const session = await fetch('/api/auth/session').then(r => r.json())
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      fetch(`${apiUrl}/api/v1/stream-posts/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session?.accessToken || ''}`
        },
        credentials: 'include'
      }).then(async (response) => {
        if (response.ok) {
          toast({
            title: "Post created!",
            description: "Your post has been created successfully.",
          })
          queryClient.invalidateQueries({ 
            queryKey: streamPostsListOptions({ 
              query: { stream: practitionerStream?.id } 
            }).queryKey 
          })
          setCreatePostOpen(false)
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Failed to create post' }))
          throw new Error(errorData.error || errorData.detail || 'Failed to create post')
        }
      }).catch((error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create post",
          variant: "destructive",
        })
      })
    } else {
      // No media, use regular JSON
      const apiData = {
        stream: practitionerStream.id,
        title: postData.title,
        content: postData.content,
        post_type: 'post',
        tier_level: postData.tier,
        is_published: postData.status === 'published',
        tags: postData.tags,
        allow_comments: true,
        allow_tips: true,
      }

      createPostMutation.mutate({
        body: apiData
      })
    }
  }

  // Update post mutation
  const updatePostMutation = useMutation({
    ...streamPostsPartialUpdateMutation(),
    onSuccess: () => {
      toast({
        title: "Post updated!",
        description: "Your post has been updated successfully.",
      })
      queryClient.invalidateQueries({ 
        queryKey: streamPostsListOptions({ 
          query: { stream: practitionerStream?.id } 
        }).queryKey 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.body?.detail || error?.message || "Failed to update post",
        variant: "destructive",
      })
    }
  })

  // Delete post mutation
  const deletePostMutation = useMutation({
    ...streamPostsDestroyMutation(),
    onSuccess: () => {
      toast({
        title: "Post deleted!",
        description: "Your post has been deleted successfully.",
      })
      queryClient.invalidateQueries({ 
        queryKey: streamPostsListOptions({ 
          query: { stream: practitionerStream?.id } 
        }).queryKey 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.body?.detail || error?.message || "Failed to delete post",
        variant: "destructive",
      })
    }
  })

  const handleDeletePost = async (postId: string) => {
    deletePostMutation.mutate({
      path: {
        public_uuid: postId
      }
    })
  }

  const handleUpdatePost = async (updatedPost: any) => {
    const updateData = {
      title: updatedPost.title,
      content: updatedPost.content,
      tier_level: updatedPost.tier_level,
      is_published: updatedPost.is_published,
      tags: updatedPost.tags,
      allow_comments: updatedPost.allow_comments !== false,
      allow_tips: updatedPost.allow_tips !== false,
    }

    updatePostMutation.mutate({
      path: {
        public_uuid: updatedPost.public_uuid
      },
      body: updateData
    })
  }

  if (streamsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // If no stream exists, show creation prompt
  if (!practitionerStream) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Create Your Stream</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Start your content subscription platform and connect with your community.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              With Estuary Streams, you can:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li>• Share exclusive content with subscribers</li>
              <li>• Set your own pricing tiers</li>
              <li>• Build a recurring revenue stream</li>
              <li>• Engage with your community</li>
            </ul>
            <Button 
              onClick={createStream} 
              className="w-full" 
              disabled={createStreamMutation.isPending}
            >
              {createStreamMutation.isPending ? "Creating..." : "Create My Stream"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Content Streams"
        helpLink="/help/practitioner/streams"
        action={{
          label: "Create Post",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => setCreatePostOpen(true)
        }}
        tabs={STREAM_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="px-6 py-4 space-y-6">
        {/* Analytics Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{practitionerStream?.subscriber_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                Free: {practitionerStream?.free_subscriber_count || 0} | Paid: {practitionerStream?.paid_subscriber_count || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analyticsData?.revenue?.monthly || 0}</div>
              <p className="text-xs text-muted-foreground">Total: ${((practitionerStream?.total_revenue_cents || 0) / 100).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.total_views || 0}</div>
              <p className="text-xs text-muted-foreground">
                {practitionerStream?.post_count || 0} total posts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published Posts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{posts.filter((p) => p.status === "published").length}</div>
              <p className="text-xs text-muted-foreground">
                Drafts: {posts.filter((p) => p.status === "draft").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={filterTier} onValueChange={(value: any) => setFilterTier(value)}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <StreamPostsList posts={filteredPosts} onDeletePost={handleDeletePost} onUpdatePost={handleUpdatePost} />
          </div>
        )}

        {activeTab === "analytics" && (
          <StreamAnalytics analytics={analyticsData} streamId={practitionerStream?.id} />
        )}

        {activeTab === "subscribers" && (
          <SubscriberManagement streamId={practitionerStream?.id} />
        )}

        {activeTab === "pricing" && (
          <StreamPricing 
            streamId={practitionerStream?.id}
            currentEntryPrice={practitionerStream?.entry_tier_price_cents}
            currentPremiumPrice={practitionerStream?.premium_tier_price_cents}
            onPricingUpdate={() => {
              // Invalidate the streams query to refetch data
              queryClient.invalidateQueries({ 
                queryKey: [{ 
                  _id: 'streamsList',
                  query: { practitioner: user?.practitionerId }
                }] 
              })
            }}
          />
        )}
      </div>

      <CreatePostDialog 
        open={createPostOpen} 
        onOpenChange={setCreatePostOpen} 
        onCreatePost={handleCreatePost}
        streamId={practitionerStream?.id}
      />
    </>
  )
}