import Link from "next/link"
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Avatar,
} from "@mui/material"
import {
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Check as CheckIcon,
  Group as GroupIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
} from "@mui/icons-material"
import type { Service, Session } from "@/types/service"
import { formatDate, formatTime } from "@/lib/utils"
import ServiceBenefits from "./service-benefits"

interface SessionDetailsProps {
  session: Session
  service: Service
}

export default function SessionDetails({ session, service }: SessionDetailsProps) {
  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={8}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Session Details
          </Typography>

          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <CalendarIcon color="primary" />
                  <Typography variant="body1">{formatDate(session.start_time)}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <TimeIcon color="primary" />
                  <Typography variant="body1">
                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <GroupIcon color="primary" />
                  <Typography variant="body1">
                    {session.available_spots} of {session.max_participants} spots available
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <LocationIcon color="primary" />
                  <Typography variant="body1">
                    {service.location_type.charAt(0).toUpperCase() + service.location_type.slice(1)}
                    {session.location && ` - ${session.location}`}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {session.description && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {session.description}
              </Typography>
            </Box>
          )}

          {session.agenda && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Session Agenda
              </Typography>
              <Typography variant="body1" paragraph>
                {session.agenda}
              </Typography>
            </Box>
          )}

          {session.what_youll_learn && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                What You'll Learn
              </Typography>
              <List>
                {session.what_youll_learn.split("\n").map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={item.replace(/^- /, "")} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {session.benefits && session.benefits.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Benefits
              </Typography>
              <ServiceBenefits benefits={session.benefits} />
            </Box>
          )}

          {session.agenda_items && session.agenda_items.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Detailed Agenda
              </Typography>
              <List>
                {session.agenda_items.map((item, index) => (
                  <ListItem key={index} sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {index + 1}.
                      </Typography>
                    </ListItemIcon>
                    <ListItemText primary={item.title} secondary={item.description} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </Grid>

      <Grid item xs={12} md={4}>
        <Box sx={{ position: "sticky", top: 20 }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Session Price
              </Typography>
              <Typography variant="h4" color="primary.main" gutterBottom>
                ${Number.parseFloat(session.price).toFixed(2)}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {session.available_spots} of {session.max_participants} spots left
              </Typography>

              <Button
                variant="contained"
                fullWidth
                size="large"
                component={Link}
                href={`/services/${service.id}/sessions/${session.id}/book`}
                sx={{
                  mt: 2,
                  backgroundColor: "primary.main",
                  color: "white",
                  "&:hover": { backgroundColor: "primary.dark" },
                }}
              >
                Book This Session
              </Button>

              <Button
                variant="outlined"
                fullWidth
                component={Link}
                href={`/services/${service.id}/book`}
                sx={{ mt: 2 }}
              >
                Book Full {service.service_type_display || service.service_type_code || 'Service'}
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hosted by
              </Typography>

              {service.practitioners
                .filter((p) => p.is_primary || p.role === "host")
                .map((practitioner) => (
                  <Box key={practitioner.id} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar
                      src={practitioner.profile_image_url}
                      alt={practitioner.display_name}
                      sx={{ width: 50, height: 50 }}
                    />
                    <Box>
                      <Typography variant="subtitle1">{practitioner.display_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {practitioner.title}
                      </Typography>
                    </Box>
                  </Box>
                ))}

              <Button
                variant="text"
                startIcon={<PersonIcon />}
                component={Link}
                href={`/practitioners/${service.primary_practitioner.slug || service.primary_practitioner.id}`}
                fullWidth
              >
                View Profile
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Grid>
    </Grid>
  )
}
