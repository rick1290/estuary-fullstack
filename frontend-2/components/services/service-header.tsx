import { Box, Typography, Chip, Button, Rating, Avatar, Stack, Paper } from "@mui/material"
import {
  AccessTime as AccessTimeIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Verified as VerifiedIcon,
  Language as LanguageIcon,
  SignalCellularAlt as LevelIcon,
} from "@mui/icons-material"
import Link from "next/link"
import type { Service } from "@/types/service"
import { formatExperienceLevel } from "@/lib/utils"

interface ServiceHeaderProps {
  service: Service
}

export default function ServiceHeader({ service }: ServiceHeaderProps) {
  const {
    name,
    price,
    duration,
    service_type_code,
    service_type_display,
    category,
    location_type,
    max_participants,
    experience_level,
    languages,
    primary_practitioner,
    average_rating,
    total_reviews,
    tags,
  } = service

  return (
    <Box sx={{ mb: 6 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Chip
          label={service_type_display || (service_type_code && service_type_code.charAt(0).toUpperCase() + service_type_code.slice(1)) || 'Service'}
          color="primary"
          size="small"
        />
        <Chip label={category.name} variant="outlined" size="small" />
        <Chip label={location_type.charAt(0).toUpperCase() + location_type.slice(1)} variant="outlined" size="small" />
      </Box>

      <Typography variant="h3" component="h1" gutterBottom>
        {name}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 3 }}>
        {average_rating ? (
          <>
            <Rating value={Number.parseFloat(average_rating)} precision={0.1} readOnly />
            <Typography variant="body2">
              {average_rating} ({total_reviews} {total_reviews === 1 ? "review" : "reviews"})
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No reviews yet
          </Typography>
        )}
      </Box>

      <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={primary_practitioner.profile_image_url}
              alt={primary_practitioner.display_name}
              sx={{ width: 64, height: 64 }}
            />
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6">{primary_practitioner.display_name}</Typography>
                {primary_practitioner.is_verified && <VerifiedIcon color="primary" fontSize="small" />}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {primary_practitioner.title}
              </Typography>
              {primary_practitioner.average_rating && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Rating
                    value={Number.parseFloat(primary_practitioner.average_rating)}
                    precision={0.1}
                    readOnly
                    size="small"
                  />
                  <Typography variant="body2">{primary_practitioner.average_rating}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 3,
              ml: { md: "auto" },
              mt: { xs: 2, md: 0 },
            }}
          >
            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccessTimeIcon color="action" fontSize="small" />
                <Typography variant="body2">
                  {duration} minutes {service_type_code === "course" && "per session"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GroupIcon color="action" fontSize="small" />
                <Typography variant="body2">
                  {max_participants === 1 ? "Individual" : `Up to ${max_participants} participants`}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LevelIcon color="action" fontSize="small" />
                <Typography variant="body2">{formatExperienceLevel(experience_level)}</Typography>
              </Box>
            </Stack>

            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocationIcon color="action" fontSize="small" />
                <Typography variant="body2">
                  {location_type.charAt(0).toUpperCase() + location_type.slice(1)}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LanguageIcon color="action" fontSize="small" />
                <Typography variant="body2">{languages.map((lang) => lang.name).join(", ")}</Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h4" component="p" color="primary.main" gutterBottom>
            ${Number.parseFloat(price).toFixed(2)}
            {service_type_code === "course" && " per session"}
          </Typography>
          {service.is_package && service.total_package_price && (
            <Typography variant="body2" color="success.main">
              Save $
              {(
                Number.parseFloat(price) * service.sessions.length -
                Number.parseFloat(service.total_package_price)
              ).toFixed(2)}{" "}
              with package
            </Typography>
          )}
        </Box>
        <Button variant="contained" size="large" component={Link} href={`/services/${service.id}/book`}>
          {service_type_code === "session"
            ? "Book Session"
            : service_type_code === "package"
              ? "Book Package"
              : service_type_code === "workshop"
                ? "Register"
                : "Enroll Now"}
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag.replace(/-/g, " ")}
            size="small"
            variant="outlined"
            component={Link}
            href={`/marketplace?tag=${tag}`}
            clickable
            sx={{ textDecoration: "none" }}
          />
        ))}
      </Box>
    </Box>
  )
}
