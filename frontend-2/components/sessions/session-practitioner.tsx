import { Paper, Typography, Box, Divider, Avatar, Grid, Rating, Button } from "@mui/material"
import Link from "next/link"

interface SessionPractitionerProps {
  practitioner: any
}

export default function SessionPractitioner({ practitioner }: SessionPractitionerProps) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        About Your Practitioner
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4} md={3}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar src={practitioner.image} alt={practitioner.name} sx={{ width: 120, height: 120, mb: 2 }} />
            <Button
              variant="outlined"
              component={Link}
              href={`/practitioners/${practitioner.id}`}
              sx={{ width: "100%" }}
            >
              View Full Profile
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} sm={8} md={9}>
          <Typography variant="h6" gutterBottom>
            {practitioner.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {practitioner.title}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Rating value={4.8} precision={0.1} readOnly size="small" />
            <Typography variant="body2" sx={{ ml: 1 }}>
              4.8 (56 reviews)
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            {practitioner.bio}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  )
}
