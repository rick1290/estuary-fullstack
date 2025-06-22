"use client"

import { useState, useEffect } from "react"
import { Plus, Search, BarChart3, Users, DollarSign, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StreamPostsList from "./stream-posts-list"
import CreatePostDialog from "./create-post-dialog"
import StreamAnalytics from "./stream-analytics"
import SubscriberManagement from "./subscriber-management"
import StreamPricing from "./stream-pricing"
import { mockStreamPosts, mockStreamAnalytics } from "@/lib/mock-stream-management-data"
import type { StreamPost, StreamAnalytics as StreamAnalyticsType } from "@/types/stream-management"

export default function StreamsDashboard() {
  const [posts, setPosts] = useState<StreamPost[]>([])
  const [analytics, setAnalytics] = useState<StreamAnalyticsType | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTier, setFilterTier] = useState<"all" | "free" | "entry" | "premium">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "scheduled" | "published">("all")
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPosts(mockStreamPosts)
      setAnalytics(mockStreamAnalytics)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTier = filterTier === "all" || post.tier === filterTier
    const matchesStatus = filterStatus === "all" || post.status === filterStatus

    return matchesSearch && matchesTier && matchesStatus
  })

  const handleCreatePost = (postData: any) => {
    // In a real app, this would make an API call
    const newPost: StreamPost = {
      id: `post-${Date.now()}`,
      practitionerId: "practitioner-1",
      ...postData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: postData.status === "published" ? new Date().toISOString() : undefined,
      stats: {
        views: 0,
        likes: 0,
        comments: 0,
        unlocks: 0,
      },
    }

    setPosts([newPost, ...posts])
    setCreatePostOpen(false)
  }

  const handleDeletePost = (postId: string) => {
    setPosts(posts.filter((post) => post.id !== postId))
  }

  const handleUpdatePost = (updatedPost: StreamPost) => {
    setPosts(posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)))
  }

  if (loading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreatePostOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Post
        </Button>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalSubscribers}</div>
              <p className="text-xs text-muted-foreground">
                Entry: {analytics.subscribersByTier.entry} | Premium: {analytics.subscribersByTier.premium}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.revenue.monthly}</div>
              <p className="text-xs text-muted-foreground">Total: ${analytics.revenue.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.engagementStats.totalViews}</div>
              <p className="text-xs text-muted-foreground">
                Avg engagement: {analytics.engagementStats.averageEngagement}%
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
      )}

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value as any)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Tiers</option>
                <option value="free">Free</option>
                <option value="entry">Entry</option>
                <option value="premium">Premium</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <StreamPostsList posts={filteredPosts} onDeletePost={handleDeletePost} onUpdatePost={handleUpdatePost} />
        </TabsContent>

        <TabsContent value="analytics">{analytics && <StreamAnalytics analytics={analytics} />}</TabsContent>

        <TabsContent value="subscribers">
          {analytics && <SubscriberManagement subscribers={analytics.recentSubscribers} />}
        </TabsContent>

        <TabsContent value="pricing">
          <StreamPricing 
            streamId="stream-1" // This would come from the actual stream data
            currentEntryPrice={analytics?.revenue.entryTierPrice}
            currentPremiumPrice={analytics?.revenue.premiumTierPrice}
            onPricingUpdate={() => {
              // Refresh analytics or stream data
              console.log("Pricing updated")
            }}
          />
        </TabsContent>
      </Tabs>

      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen} onCreatePost={handleCreatePost} />
    </div>
  )
}
