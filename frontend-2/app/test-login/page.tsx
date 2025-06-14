"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Avatar,
  Chip,
  Divider,
} from "@mui/material"
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material"
import { useAuth } from "@/hooks/use-auth"

// Test accounts for easy login
const TEST_ACCOUNTS = [
  {
    name: "John Doe",
    email: "user@example.com",
    password: "password123",
    role: "user",
    avatar: "J",
    description: "Regular user account with access to bookings, messages, and favorites.",
    color: "secondary.main",
    icon: <PersonIcon />,
    dashboard: "/dashboard/user",
  },
  {
    name: "Dr. Sarah Johnson",
    email: "practitioner@example.com",
    password: "password123",
    role: "practitioner",
    avatar: "S",
    description: "Practitioner account with access to services, bookings, and analytics.",
    color: "primary.main",
    icon: <SchoolIcon />,
    dashboard: "/dashboard/practitioner",
  },
]

export default function TestLoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const handleLogin = async (email: string, password: string, dashboard: string) => {
    try {
      setLoading(email)
      await login(email, password)
      router.push(dashboard)
    } catch (error) {
      console.error("Login failed:", error)
      setLoading(null)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Test Login
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select an account to access the dashboard
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {TEST_ACCOUNTS.map((account) => (
            <Grid item xs={12} md={6} key={account.email}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Avatar sx={{ bgcolor: account.color, mr: 2 }}>{account.avatar}</Avatar>
                    <Box>
                      <Typography variant="h6">{account.name}</Typography>
                      <Chip
                        icon={account.icon}
                        label={account.role === "practitioner" ? "Practitioner" : "User"}
                        size="small"
                        color={account.role === "practitioner" ? "primary" : "secondary"}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {account.description}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Login Credentials:
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {account.email}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Password:</strong> {account.password}
                    </Typography>
                  </Box>
                </CardContent>

                <Divider />

                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    color={account.role === "practitioner" ? "primary" : "secondary"}
                    onClick={() => handleLogin(account.email, account.password, account.dashboard)}
                    disabled={loading === account.email}
                    endIcon={<ArrowForwardIcon />}
                    startIcon={<DashboardIcon />}
                  >
                    {loading === account.email ? "Logging in..." : "Access Dashboard"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Return to{" "}
            <Link href="/auth/login" style={{ textDecoration: "none" }}>
              <Typography component="span" variant="body2" color="primary">
                regular login
              </Typography>
            </Link>{" "}
            or{" "}
            <Link href="/" style={{ textDecoration: "none" }}>
              <Typography component="span" variant="body2" color="primary">
                home page
              </Typography>
            </Link>
            .
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}
