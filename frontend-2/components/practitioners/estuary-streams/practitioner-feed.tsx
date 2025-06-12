"use client"

import { useState, useEffect } from "react"
import { Box, Typography, Button, Paper, useTheme, useMediaQuery } from "@mui/material"
import { Bookmark as BookmarkIcon, RssFeed as RssFeedIcon } from "@mui/icons-material"
import FeedPost from "./feed-post"
import SubscriptionCTA from "./subscription-cta"
import { mockFeedPosts, mockComments, mockSubscriptionTiers } from "@/lib/mock-feed-data"
import type { FeedPost as FeedPostType, SubscriptionTier } from "@/types/feed"
import { useAuth } from "@/hooks/use-auth"

interface PractitionerFeedProps {
  practitionerId: string
  practitionerName: string
  practitionerImage?: string
}

export default function PractitionerFeed({
  practitionerId,
  practitionerName,
  practitionerImage,
}: PractitionerFeedProps) {
  const [posts, setPosts] = useState<FeedPostType[]>([])
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const { user } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  // Fetch posts and subscription info
  useEffect(() => {
    // In a real app, this would be an API call
    setPosts(mockFeedPosts)
    setSubscriptionTiers(mockSubscriptionTiers)

    // Check if user is subscribed (mock)
    setIsSubscribed(user?.id === "user1") // Just for demo
  }, [practitionerId, user])

  const handleSubscribe = () => {
    setShowSubscriptionModal(true)
  }

  const handleCloseSubscriptionModal = () => {
    setShowSubscriptionModal(false)
  }

  const handleLikePost = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { ...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked }
          : post,
      ),
    )
  }

  const handleCommentPost = (postId: string, comment: string) => {
    // In a real app, this would send the comment to an API
    console.log(`Comment on post ${postId}: ${comment}`)
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <RssFeedIcon color="primary" />
          <Typography variant="h5" component="h2">
            Estuary Streams
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary">
          Follow {practitionerName}'s journey and gain exclusive insights through regular updates, tips, and premium
          content.
        </Typography>

        {!isSubscribed && (
          <Box sx={{ mt: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<BookmarkIcon />}
              onClick={handleSubscribe}
              fullWidth={isMobile}
            >
              Subscribe to Unlock Premium Content
            </Button>
          </Box>
        )}
      </Paper>

      {/* Feed Posts */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {posts.map((post) => (
          <FeedPost
            key={post.id}
            post={post}
            comments={mockComments[post.id] || []}
            isSubscribed={isSubscribed}
            practitionerName={practitionerName}
            practitionerImage={practitionerImage}
            onLike={() => handleLikePost(post.id)}
            onComment={(comment) => handleCommentPost(post.id, comment)}
            onSubscribe={handleSubscribe}
          />
        ))}
      </Box>

      {/* Subscription CTA */}
      <SubscriptionCTA
        open={showSubscriptionModal}
        onClose={handleCloseSubscriptionModal}
        subscriptionTiers={subscriptionTiers}
        practitionerName={practitionerName}
      />
    </Box>
  )
}
