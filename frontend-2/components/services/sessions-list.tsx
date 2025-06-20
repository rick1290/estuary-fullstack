import Link from "next/link"
import { Box, Typography, Paper, Grid, Button, Chip, List, ListItem, ListItemIcon, ListItemText } from "@mui/material"
import {
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Check as CheckIcon,
  Group as GroupIcon,
  Event as EventIcon,
} from "@mui/icons-material"
import type { Session } from "@/types/service"
import { formatDate, formatTime } from "@/lib/utils"
import { getServiceDetailUrl } from "@/lib/service-utils"

interface SessionsListProps {
  sessions: Session[]
  serviceType: string
}

export default function SessionsList({ sessions, serviceType }: SessionsListProps) {
  // Sort sessions by sequence number or start time
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.sequence_number !== null && b.sequence_number !== null) {
      return a.sequence_number - b.sequence_number
    }
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {serviceType === "course" ? "Course Schedule" : "Workshop Sessions"}
      </Typography>

      <Typography variant="body1" paragraph>
        {serviceType === "course"
          ? "This course consists of the following sessions. Each session builds upon the previous one."
          : "This workshop is divided into the following sessions."}
      </Typography>

      <Grid container spacing={3}>
        {sortedSessions.map((session, index) => (
          <Grid item xs={12} key={session.id}>
            <Paper
              elevation={1}
              sx={{
                p: 3,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6">{session.title || `Session ${index + 1}`}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <CalendarIcon color="action" fontSize="small" />
                      <Typography variant="body2">{formatDate(session.start_time)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <TimeIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    color={session.status === "scheduled" ? "primary" : "default"}
                    size="small"
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <GroupIcon fontSize="small" color="action" />
                    <Typography variant="body2">{session.available_spots} spots left</Typography>
                  </Box>
                </Box>
              </Box>

              {session.description && (
                <Typography variant="body2" paragraph>
                  {session.description}
                </Typography>
              )}

              <Grid container spacing={3}>
                {session.what_youll_learn && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      What You'll Learn
                    </Typography>
                    <List dense>
                      {session.what_youll_learn.split("\n").map((item, i) => (
                        <ListItem key={i} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.replace(/^- /, "")}
                            primaryTypographyProps={{ variant: "body2" }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}

                {session.agenda && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Session Agenda
                    </Typography>
                    <Typography variant="body2">{session.agenda}</Typography>
                  </Grid>
                )}
              </Grid>

              {session.benefits && session.benefits.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Session Benefits
                  </Typography>
                  <List dense>
                    {session.benefits.map((benefit, i) => (
                      <ListItem key={i} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={benefit.title}
                          secondary={benefit.description}
                          primaryTypographyProps={{ variant: "body2" }}
                          secondaryTypographyProps={{ variant: "body2" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
                <Typography variant="h6" color="primary.main">
                  ${Number.parseFloat(session.price).toFixed(2)}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<EventIcon />}
                  component={Link}
                  href={getServiceDetailUrl({ id: session.id, service_type_code: 'session' })}
                >
                  Session Details
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
