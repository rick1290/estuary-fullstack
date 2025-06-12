"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Container, Box, Typography, Paper, Button, Grid, Divider, Alert, AlertTitle } from "@mui/material"
import {
  CheckCircle as CheckCircleIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
} from "@mui/icons-material"
import { getServiceById } from "@/lib/services"

export default function BookingConfirmationPage({ params }: { params: { id: string } }) {
  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mock booking details - in a real app, this would come from the API
  const bookingDetails = {
    id: "BK" + Math.floor(Math.random() * 10000000),
    date: new Date().toISOString(),
    status: "confirmed",
    sessions: [0, 1], // Session indices
    customer: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    },
    totalPrice: 623.26,
  }

  useEffect(() => {
    const fetchService = async () => {
      try {
        const serviceId = Number.parseInt(params.id)
        if (isNaN(serviceId)) {
          setError("Invalid service ID")
          setLoading(false)
          return
        }

        const serviceData = await getServiceById(serviceId)
        if (!serviceData) {
          setError("Service not found")
          setLoading(false)
          return
        }

        setService(serviceData)
        setLoading(false)
      } catch (err) {
        setError("Failed to load service data")
        setLoading(false)
      }
    }

    fetchService()
  }, [params.id])

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography>Loading...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 3 }}>
          <Button component={Link} href="/marketplace" variant="contained">
            Return to Marketplace
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={1} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Booking Confirmed!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Thank you for your booking. We've sent a confirmation email to {bookingDetails.customer.email}.
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Booking Details
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Booking ID
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {bookingDetails.id}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Booking Date
              </Typography>
              <Typography variant="body1">
                {new Date(bookingDetails.date).toLocaleDateString()} at{" "}
                {new Date(bookingDetails.date).toLocaleTimeString()}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body1" color="success.main" fontWeight="medium">
                {bookingDetails.status.charAt(0).toUpperCase() + bookingDetails.status.slice(1)}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Customer
              </Typography>
              <Typography variant="body1">
                {bookingDetails.customer.firstName} {bookingDetails.customer.lastName}
              </Typography>
              <Typography variant="body1">{bookingDetails.customer.email}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Service Details
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Service
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {service.name}
              </Typography>
              <Typography variant="body2">
                {service.service_type.name.charAt(0).toUpperCase() + service.service_type.name.slice(1)}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Practitioner
              </Typography>
              <Typography variant="body1">{service.primary_practitioner.display_name}</Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Location
              </Typography>
              <Typography variant="body1">
                {service.location_type.charAt(0).toUpperCase() + service.location_type.slice(1)}
                {service.location && ` - ${service.location}`}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Price
              </Typography>
              <Typography variant="h6" color="primary.main">
                ${bookingDetails.totalPrice.toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" gutterBottom>
          Booked Sessions
        </Typography>

        {bookingDetails.sessions.map((sessionIndex) => {
          const session = service.sessions[sessionIndex]
          return (
            <Paper key={session.id} variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {session.title || `Session ${sessionIndex + 1}`}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarIcon color="action" fontSize="small" />
                    <Typography variant="body2">{new Date(session.start_time).toLocaleDateString()}</Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TimeIcon color="action" fontSize="small" />
                    <Typography variant="body2">
                      {new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                      {new Date(session.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationIcon color="action" fontSize="small" />
                    <Typography variant="body2">
                      {service.location_type.charAt(0).toUpperCase() + service.location_type.slice(1)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon color="action" fontSize="small" />
                    <Typography variant="body2">{service.primary_practitioner.display_name}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )
        })}

        <Alert severity="info" sx={{ mt: 4 }}>
          <AlertTitle>What's Next?</AlertTitle>
          <Typography variant="body2">
            You'll receive instructions on how to join your{" "}
            {service.location_type === "virtual" ? "virtual session" : "session"} via email. If you have any questions,
            please contact us at support@sanctuary.com.
          </Typography>
        </Alert>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 4 }}>
          <Button variant="outlined" component={Link} href="/dashboard/client/bookings">
            View My Bookings
          </Button>
          <Button variant="contained" component={Link} href="/marketplace">
            Explore More Services
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
