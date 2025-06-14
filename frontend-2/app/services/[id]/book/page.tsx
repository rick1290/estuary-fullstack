"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, User, ChevronRight, Check } from "lucide-react"
import { getServiceById } from "@/lib/services"
import { formatDate, formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function BookServicePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [service, setService] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedSessions, setSelectedSessions] = useState<number[]>([])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  // Load service data
  useState(() => {
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

        // For courses and workshops, preselect all sessions
        if (serviceData.service_type.name === "course" || serviceData.service_type.name === "workshop") {
          setSelectedSessions(serviceData.sessions.map((s: any) => s.id))
        }

        setLoading(false)
      } catch (err) {
        setError("Failed to load service data")
        setLoading(false)
      }
    }

    fetchService()
  }, [params.id])

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate session selection
      if (selectedSessions.length === 0) {
        setError("Please select at least one session")
        return
      }
      setError(null)
    } else if (activeStep === 1) {
      // Validate contact information
      if (!firstName || !lastName || !email) {
        setError("Please fill in all required fields")
        return
      }

      if (!agreeToTerms) {
        setError("You must agree to the terms and conditions")
        return
      }

      setError(null)
    }

    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
    setError(null)
  }

  const handleSessionToggle = (sessionId: number) => {
    setSelectedSessions((prev) => {
      if (prev.includes(sessionId)) {
        return prev.filter((id) => id !== sessionId)
      } else {
        return [...prev, sessionId]
      }
    })
  }

  const handleSubmit = () => {
    // In a real app, this would submit the booking to an API
    console.log("Booking submitted:", {
      service: service?.id,
      sessions: selectedSessions,
      customer: {
        firstName,
        lastName,
        email,
        phone,
      },
      specialRequests,
    })

    // Redirect to confirmation page
    router.push(`/services/${service?.id}/book/confirmation`)
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography>Loading...</Typography>
      </Container>
    )
  }

  if (error && !service) {
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

  // Calculate total price
  const totalPrice = selectedSessions.reduce((total, sessionId) => {
    const session = service?.sessions.find((s: any) => s.id === sessionId)
    return total + (session ? Number.parseFloat(session.price) : 0)
  }, 0)

  // Get steps based on service type
  const getSteps = () => {
    if (service?.service_type.name === "one_on_one") {
      return ["Select Time", "Your Information", "Confirmation"]
    } else {
      return ["Select Sessions", "Your Information", "Confirmation"]
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/" color="inherit">
          Home
        </MuiLink>
        <MuiLink component={Link} href="/marketplace" color="inherit">
          Marketplace
        </MuiLink>
        <MuiLink component={Link} href={`/services/${service?.id}`} color="inherit">
          {service?.name}
        </MuiLink>
        <Typography color="text.primary">Book</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/services/${service?.id}`} variant="text">
          Back to {service?.service_type.name}
        </Button>
      </Box>

      <Paper elevation={1} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Book {service?.name}
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {getSteps().map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              {service?.service_type.name === "one_on_one" ? "Select Time" : "Select Sessions"}
            </Typography>

            <Typography variant="body1" paragraph>
              {service?.service_type.name === "one_on_one"
                ? "Choose a time that works for you."
                : service?.service_type.name === "course"
                  ? "This course includes the following sessions. You can select which ones you'd like to attend."
                  : "Select the sessions you'd like to attend."}
            </Typography>

            <Grid container spacing={3}>
              {service?.sessions.map((session: any, index: number) => (
                <Grid item xs={12} key={session.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      borderColor: selectedSessions.includes(session.id) ? "primary.main" : "divider",
                      borderWidth: selectedSessions.includes(session.id) ? 2 : 1,
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={8}>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                          <FormControl>
                            <Checkbox
                              checked={selectedSessions.includes(session.id)}
                              onChange={() => handleSessionToggle(session.id)}
                              color="primary"
                            />
                          </FormControl>

                          <Box>
                            <Typography variant="h6">{session.title || `Session ${index + 1}`}</Typography>

                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
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

                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <PersonIcon color="action" fontSize="small" />
                                <Typography variant="body2">{session.available_spots} spots left</Typography>
                              </Box>
                            </Box>

                            {session.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {session.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Grid>

                      <Grid
                        item
                        xs={12}
                        sm={4}
                        sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}
                      >
                        <Typography variant="h6" color="primary.main">
                          ${Number.parseFloat(session.price).toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Your Information
            </Typography>

            <Typography variant="body1" paragraph>
              Please provide your contact information to complete your booking.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Special Requests or Notes"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} required />
                  }
                  label={
                    <Typography variant="body2">
                      I agree to the{" "}
                      <MuiLink component={Link} href="/terms">
                        Terms of Service
                      </MuiLink>{" "}
                      and{" "}
                      <MuiLink component={Link} href="/privacy">
                        Privacy Policy
                      </MuiLink>
                    </Typography>
                  }
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Booking Summary
            </Typography>

            <Typography variant="body1" paragraph>
              Please review your booking details before confirming.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" gutterBottom>
                  Selected {service?.sessions.length > 1 ? "Sessions" : "Session"}
                </Typography>

                {service?.sessions
                  .filter((session: any) => selectedSessions.includes(session.id))
                  .map((session: any, index: number) => (
                    <Paper key={session.id} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle1">{session.title || `Session ${index + 1}`}</Typography>

                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
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

                      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {service?.location_type.charAt(0).toUpperCase() + service?.location_type.slice(1)}
                        </Typography>
                        <Typography variant="subtitle2" color="primary.main">
                          ${Number.parseFloat(session.price).toFixed(2)}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Your Information
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body1">
                        {firstName} {lastName}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">{email}</Typography>
                    </Grid>

                    {phone && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body1">{phone}</Typography>
                      </Grid>
                    )}

                    {specialRequests && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Special Requests
                        </Typography>
                        <Typography variant="body1">{specialRequests}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ position: "sticky", top: 20 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Payment Summary
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      {service?.sessions
                        .filter((session: any) => selectedSessions.includes(session.id))
                        .map((session: any, index: number) => (
                          <Box
                            key={session.id}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography variant="body2">{session.title || `Session ${index + 1}`}</Typography>
                            <Typography variant="body2">${Number.parseFloat(session.price).toFixed(2)}</Typography>
                          </Box>
                        ))}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="subtitle1">Total</Typography>
                      <Typography variant="subtitle1" color="primary.main">
                        ${totalPrice.toFixed(2)}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" paragraph>
                      Payment will be collected at the time of booking.
                    </Typography>

                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="large"
                      onClick={handleSubmit}
                      sx={{ mt: 2 }}
                    >
                      Confirm Booking
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
          <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
            Back
          </Button>

          <Button variant="contained" onClick={activeStep === 2 ? handleSubmit : handleNext}>
            {activeStep === 2 ? "Confirm Booking" : "Next"}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
