"use client"

import { useState } from "react"
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Avatar,
  IconButton,
  Button,
  TextField,
  Divider,
  Chip,
  Grid,
  Paper,
  Collapse,
  useTheme,
  useMediaQuery,
} from "@mui/material"
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Lock as LockIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
} from "@mui/icons-material"
import type { FeedPost, Comment } from "@/types/feed"
import { formatDistanceToNow } from "date-fns"

interface FeedPostProps {
  post: FeedPost
  comments: Comment[]
  isSubscribed: boolean
  practitionerName: string
  practitionerImage?: string
  onLike: () => void
  onComment: (comment: string) => void
  onSubscribe: () => void
}

export default function FeedPost({
  post,
  comments,
  isSubscribed,
  practitionerName,
  practitionerImage,
  onLike,
  onComment,
  onSubscribe,
}: FeedPostProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  const handleLike = () => {
    setIsLiked(!isLiked)
    onLike()
  }

  const handleToggleComments = () => {
    setShowComments(!showComments)
  }

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(commentText)
      setCommentText("")
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  // Determine if content should be blurred/locked
  const isContentLocked = post.isPremium && !isSubscribed

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "visible",
      }}
    >
      {/* Post Header */}
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar
            src={practitionerImage || "/placeholder.svg?height=50&width=50&query=practitioner"}
            alt={practitionerName}
            sx={{ width: 48, height: 48, mr: 2 }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              {practitionerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(post.createdAt)}
            </Typography>
          </Box>
          {post.isPremium && (
            <Chip
              icon={<LockIcon fontSize="small" />}
              label="Premium"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: "auto" }}
            />
          )}
        </Box>

        {/* Post Content */}
        <Typography
          variant="body1"
          paragraph
          sx={{
            mb: 2,
            ...(isContentLocked && {
              overflow: "hidden",
              maxHeight: "80px",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: "60px",
                background: "linear-gradient(transparent, white)",
              },
            }),
          }}
        >
          {post.content}
        </Typography>

        {/* Post Tags */}
        {post.tags && post.tags.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {post.tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  height: 24,
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>

      {/* Post Media */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <Box
          sx={{
            position: "relative",
            ...(isContentLocked && {
              filter: "blur(8px)",
              pointerEvents: "none",
            }),
          }}
        >
          {post.mediaUrls.length === 1 ? (
            <CardMedia
              component="img"
              image={post.mediaUrls[0]}
              alt="Post media"
              sx={{
                width: "100%",
                maxHeight: 500,
                objectFit: "cover",
              }}
            />
          ) : (
            <Grid container spacing={1} sx={{ px: 2, pb: 2 }}>
              {post.mediaUrls.map((url, index) => (
                <Grid item xs={post.mediaUrls.length === 2 ? 6 : 4} key={index}>
                  <Box
                    sx={{
                      paddingTop: "100%", // 1:1 Aspect ratio
                      position: "relative",
                      overflow: "hidden",
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={url}
                      alt={`Post media ${index + 1}`}
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Overlay for premium content */}
          {isContentLocked && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 2,
              }}
            >
              <LockIcon sx={{ color: "white", fontSize: 40, mb: 2 }} />
              <Typography variant="h6" color="white" align="center" sx={{ mb: 2, px: 2 }}>
                Subscribe to unlock premium content
              </Typography>
              <Button variant="contained" color="primary" onClick={onSubscribe}>
                Subscribe Now
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && !isContentLocked && (
        <Box sx={{ p: 2 }}>
          {post.attachments.map((attachment) => (
            <Paper
              key={attachment.id}
              variant="outlined"
              sx={{
                p: 1.5,
                display: "flex",
                alignItems: "center",
                borderRadius: 1,
              }}
            >
              <AttachFileIcon color="action" sx={{ mr: 1 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" noWrap>
                  {attachment.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(attachment.size / 1000000).toFixed(1)} MB
                </Typography>
              </Box>
              <Button size="small" variant="outlined">
                Download
              </Button>
            </Paper>
          ))}
        </Box>
      )}

      {/* Post Actions */}
      <CardContent sx={{ pt: 1, pb: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton onClick={handleLike} color={isLiked ? "primary" : "default"} size="small">
              {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              {post.likes}
            </Typography>

            <IconButton onClick={handleToggleComments} size="small">
              <CommentIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {post.comments}
            </Typography>
          </Box>

          <IconButton size="small">
            <ShareIcon />
          </IconButton>
        </Box>
      </CardContent>

      <Divider />

      {/* Comments Section */}
      <Collapse in={showComments}>
        <CardContent>
          {/* Comment Input */}
          <Box sx={{ display: "flex", mb: 3 }}>
            <Avatar sx={{ width: 36, height: 36, mr: 2 }} src="/placeholder.svg?height=50&width=50&query=user" />
            <TextField
              fullWidth
              size="small"
              placeholder="Write a comment..."
              variant="outlined"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              InputProps={{
                endAdornment: (
                  <IconButton edge="end" onClick={handleSubmitComment} disabled={!commentText.trim()}>
                    <SendIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>

          {/* Comments List */}
          {comments.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {comments.map((comment) => (
                <Box key={comment.id} sx={{ display: "flex" }}>
                  <Avatar
                    src={comment.userProfilePicture}
                    alt={comment.userFullName}
                    sx={{ width: 36, height: 36, mr: 2 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="medium">
                        {comment.userFullName}
                      </Typography>
                      <Typography variant="body2">{comment.content}</Typography>
                    </Paper>
                    <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, ml: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                        {formatDate(comment.createdAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ cursor: "pointer" }}>
                        Like
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>
                        •
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ cursor: "pointer" }}>
                        Reply
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center">
              No comments yet. Be the first to comment!
            </Typography>
          )}
        </CardContent>
      </Collapse>
    </Card>
  )
}
