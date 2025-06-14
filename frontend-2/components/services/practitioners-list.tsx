import Link from "next/link"
import { Box, Typography, Grid, Card, CardContent, CardMedia, Button, Chip, Rating } from "@mui/material"
import { Verified as VerifiedIcon, Person as PersonIcon } from "@mui/icons-material"
import type { Practitioner } from "@/types/service"

interface PractitionersListProps {
  practitioners: Practitioner[]
}

export default function PractitionersList({ practitioners }: PractitionersListProps) {
  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Meet Your Practitioners
      </Typography>

      <Grid container spacing={3}>
        {practitioners.map((practitioner) => (
          <Grid item xs={12} md={6} key={practitioner.id}>
            <Card
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                height: "100%",
              }}
            >
              <CardMedia
                component="img"
                sx={{
                  width: { xs: "100%", sm: 150 },
                  height: { xs: 200, sm: "auto" },
                }}
                image={practitioner.profile_image_url}
                alt={practitioner.display_name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="h6">{practitioner.display_name}</Typography>
                  {practitioner.is_verified && <VerifiedIcon color="primary" fontSize="small" />}
                  <Chip
                    label={practitioner.role.charAt(0).toUpperCase() + practitioner.role.slice(1)}
                    size="small"
                    color={practitioner.is_primary ? "primary" : "default"}
                    sx={{ ml: "auto" }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {practitioner.title}
                </Typography>

                {practitioner.average_rating && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
                    <Rating
                      value={Number.parseFloat(practitioner.average_rating)}
                      precision={0.1}
                      readOnly
                      size="small"
                    />
                    <Typography variant="body2">{practitioner.average_rating}</Typography>
                  </Box>
                )}

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonIcon />}
                  component={Link}
                  href={`/practitioners/${practitioner.id}`}
                  sx={{ mt: 1 }}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
