import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Container, Box, Typography, Breadcrumbs, Link as MuiLink, Paper, Button } from "@mui/material"
import Link from "next/link"
import { NavigateNext as NavigateNextIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material"
import SessionDetails from "@/components/services/session-details"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { getServiceById, getSessionById } from "@/lib/services"

export default async function SessionPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const serviceId = Number.parseInt(params.id)
  const sessionId = Number.parseInt(params.sessionId)

  if (isNaN(serviceId) || isNaN(sessionId)) {
    notFound()
  }

  const service = await getServiceById(serviceId)
  const session = await getSessionById(sessionId)

  if (!service || !session || session.service !== serviceId) {
    notFound()
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
        <MuiLink component={Link} href={`/services/${service.id}`} color="inherit">
          {service.name}
        </MuiLink>
        <Typography color="text.primary">
          {session.title || `Session ${session.sequence_number !== null ? session.sequence_number + 1 : ""}`}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/services/${service.id}`} variant="text">
          Back to {service.service_type_display || service.service_type_code || service.service_type?.name}
        </Button>
      </Box>

      <Paper elevation={1} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {session.title || `Session ${session.sequence_number !== null ? session.sequence_number + 1 : ""}`}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Part of: {service.name}
        </Typography>
      </Paper>

      <Suspense fallback={<LoadingSpinner />}>
        <SessionDetails session={session} service={service} />
      </Suspense>
    </Container>
  )
}
