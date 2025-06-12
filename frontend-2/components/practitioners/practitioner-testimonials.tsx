"use client"

import { useState } from "react"
import { Box, Typography, Avatar, Rating, IconButton, Paper, useTheme, useMediaQuery } from "@mui/material"
import { ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon } from "@mui/icons-material"

// Mock data for testimonials
const TESTIMONIALS = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    title: "Holistic Therapist",
    image: "/practitioner-1.jpg",
    rating: 5,
    testimonial:
      "Joining Sanctuary Marketplace transformed my practice. I've connected with clients who truly value my approach to holistic therapy, and the platform makes it easy to manage bookings and payments. My client base has grown by 40% in just three months!",
  },
  {
    id: 2,
    name: "Michael Chen",
    title: "Yoga Instructor",
    image: "/practitioner-2.jpg",
    rating: 5,
    testimonial:
      "As a yoga instructor who offers both in-person and virtual classes, I needed a platform that could handle both formats seamlessly. Sanctuary Marketplace delivers exactly that, plus their marketing support has helped me fill my workshops consistently.",
  },
  {
    id: 3,
    name: "Aisha Patel",
    title: "Life Coach",
    image: "/practitioner-3.jpg",
    rating: 4,
    testimonial:
      "The dashboard tools make it so easy to track client progress and manage my coaching packages. I appreciate how the platform handles all the administrative details so I can focus on what I do best - helping my clients transform their lives.",
  },
  {
    id: 4,
    name: "James Wilson",
    title: "Nutritional Therapist",
    image: "/practitioner-4.jpg",
    rating: 5,
    testimonial:
      "The verification process gives my practice credibility, and clients often mention that it was a factor in choosing me. The platform's focus on wellness practitioners means I'm connecting with clients who are specifically looking for nutrition guidance.",
  },
]

export default function PractitionerTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1))
  }

  const visibleTestimonials = isMobile
    ? [TESTIMONIALS[activeIndex]]
    : [
        TESTIMONIALS[activeIndex],
        TESTIMONIALS[(activeIndex + 1) % TESTIMONIALS.length],
        TESTIMONIALS[(activeIndex + 2) % TESTIMONIALS.length],
      ]

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
        {visibleTestimonials.map((testimonial) => (
          <Paper
            key={testimonial.id}
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
                src={testimonial.image}
                alt={testimonial.name}
                sx={{ width: 60, height: 60, mr: 2, border: "2px solid", borderColor: "primary.main" }}
              />
              <Box>
                <Typography variant="h6">{testimonial.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {testimonial.title}
                </Typography>
                <Rating value={testimonial.rating} readOnly size="small" sx={{ mt: 0.5 }} />
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
              "{testimonial.testimonial}"
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
