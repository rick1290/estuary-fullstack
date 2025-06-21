import Link from "next/link"
import Image from "next/image"
import { Grid, Card, CardContent, Typography, Box, Rating, Chip, Button } from "@mui/material"
import { Verified as VerifiedIcon } from "@mui/icons-material"

// Mock data for featured practitioners
const FEATURED_PRACTITIONERS = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    title: "Holistic Therapist",
    image: "/practitioner-1.jpg",
    rating: 4.9,
    reviewCount: 124,
    categories: ["Therapy", "Meditation"],
    featured: true,
    bio: "Creating safe spaces for healing through integrative approaches that honor the whole person—mind, body, and spirit.",
  },
  {
    id: 2,
    name: "Michael Chen",
    title: "Yoga Instructor",
    image: "/practitioner-2.jpg",
    rating: 4.8,
    reviewCount: 98,
    categories: ["Yoga", "Mindfulness"],
    featured: true,
    bio: "Guiding mindful movement practices that help you reconnect with your body's wisdom and find balance in daily life.",
  },
  {
    id: 3,
    name: "Aisha Patel",
    title: "Life Coach",
    image: "/practitioner-3.jpg",
    rating: 4.7,
    reviewCount: 87,
    categories: ["Coaching", "Spiritual"],
    featured: true,
    bio: "Supporting your journey to authentic living through compassionate guidance and practical tools for meaningful change.",
  },
  {
    id: 4,
    name: "James Wilson",
    title: "Nutritional Therapist",
    image: "/practitioner-4.jpg",
    rating: 4.6,
    reviewCount: 76,
    categories: ["Nutrition", "Healing"],
    featured: true,
    bio: "Empowering your relationship with food as medicine through personalized, sustainable approaches to nourishment.",
  },
]

export default function FeaturedPractitioners() {
  return (
    <Grid container spacing={3}>
      {FEATURED_PRACTITIONERS.map((practitioner, index) => (
        <Grid
          item
          xs={12}
          sm={6}
          key={practitioner.id}
          sx={{
            mt: { md: index % 2 === 0 ? 0 : 4 }, // Staggered layout on desktop
          }}
        >
          <Card
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              borderRadius: 3,
              overflow: "hidden",
              transition: "transform 0.3s, box-shadow 0.3s",
              "&:hover": {
                transform: "translateY(-8px)",
                boxShadow: "0 12px 20px rgba(0,0,0,0.1)",
              },
              height: "100%",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: { xs: "100%", sm: "40%" },
                minHeight: { xs: "200px", sm: "auto" },
              }}
            >
              <Image
                src={practitioner.image || "/placeholder.svg"}
                alt={practitioner.name}
                fill
                style={{
                  objectFit: "cover",
                }}
              />
            </Box>
            <CardContent
              sx={{
                flexGrow: 1,
                p: 3,
                width: { xs: "100%", sm: "60%" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" component="h3">
                  {practitioner.name}
                </Typography>
                <VerifiedIcon
                  sx={{
                    ml: 1,
                    color: "#4fc3f7",
                    fontSize: "1.2rem",
                  }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {practitioner.title}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mb: 2, mt: 1 }}>
                <Rating value={practitioner.rating} precision={0.1} readOnly size="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {practitioner.rating} ({practitioner.reviewCount})
                </Typography>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                paragraph
                sx={{
                  mb: 2,
                  flexGrow: 1,
                }}
              >
                {practitioner.bio}
              </Typography>

              <Box sx={{ mb: 2 }}>
                {practitioner.categories.map((category) => (
                  <Chip
                    key={category}
                    label={category}
                    size="small"
                    sx={{
                      mr: 0.5,
                      mb: 0.5,
                      backgroundColor: "rgba(149, 117, 205, 0.1)",
                      color: "#7e57c2",
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>

              <Button
                variant="outlined"
                component={Link}
                href={`/practitioners/${practitioner.slug || practitioner.id}`}
                sx={{
                  borderRadius: "28px",
                  borderColor: "#9575cd",
                  color: "#7e57c2",
                  "&:hover": {
                    backgroundColor: "rgba(149, 117, 205, 0.08)",
                    borderColor: "#7e57c2",
                  },
                  alignSelf: "flex-start",
                }}
              >
                View Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
