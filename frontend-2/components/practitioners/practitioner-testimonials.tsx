"use client"

import { useState } from "react"
import { Box, Typography, Avatar, Rating, IconButton, Paper, useTheme, useMediaQuery, CircularProgress } from "@mui/material"
import { ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon } from "@mui/icons-material"
import { useQuery } from "@tanstack/react-query"
import { reviewsListOptions } from "@/src/client/@tanstack/react-query.gen"

export default function PractitionerTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const { data, isLoading, isError } = useQuery(
    reviewsListOptions({
      query: {
        min_rating: 4,
        is_published: true,
        ordering: "-created_at",
        page_size: 6,
      },
    })
  )

  const reviews = data?.results ?? []

  // Hide section if no reviews, error, or still loading with no data
  if (isError) return null
  if (!isLoading && reviews.length === 0) return null

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1))
  }

  const visibleReviews = isMobile
    ? [reviews[activeIndex]]
    : [
        reviews[activeIndex],
        reviews[(activeIndex + 1) % reviews.length],
        reviews[(activeIndex + 2) % reviews.length],
      ].filter(Boolean)

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <IconButton onClick={handlePrev} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <IconButton onClick={handleNext} sx={{ ml: 2 }}>
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexWrap: { xs: "wrap", md: "nowrap" } }}>
        {visibleReviews.map((review) => (
          <Paper
            key={review.public_uuid}
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2,
              flex: 1,
              minWidth: { xs: "100%", md: "30%" },
              position: "relative",
              "&::before": {
                content: '"""',
                position: "absolute",
                top: 10,
                left: 15,
                fontSize: "4rem",
                color: "primary.light",
                opacity: 0.3,
                lineHeight: 1,
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Avatar
                src={review.user_avatar_url || undefined}
                alt={review.display_name || "Reviewer"}
                sx={{ width: 60, height: 60, mr: 2, border: "2px solid", borderColor: "primary.main" }}
              />
              <Box>
                <Typography variant="h6">
                  {review.is_anonymous ? "Anonymous" : (review.display_name || "Community Member")}
                </Typography>
                {review.service_name && (
                  <Typography variant="body2" color="text.secondary">
                    {review.service_name}
                  </Typography>
                )}
                <Rating value={Number(review.rating) || 5} readOnly size="small" sx={{ mt: 0.5 }} />
              </Box>
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontStyle: "italic",
                pl: 2,
                borderLeft: "3px solid",
                borderColor: "primary.light",
              }}
            >
              "{review.comment}"
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
