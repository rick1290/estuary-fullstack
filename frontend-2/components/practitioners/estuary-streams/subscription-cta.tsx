"use client"

import { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from "@mui/material"
import { Close as CloseIcon, Check as CheckIcon } from "@mui/icons-material"
import type { SubscriptionTier } from "@/types/feed"

interface SubscriptionCTAProps {
  open: boolean
  onClose: () => void
  subscriptionTiers: SubscriptionTier[]
  practitionerName: string
}

export default function SubscriptionCTA({ open, onClose, subscriptionTiers, practitionerName }: SubscriptionCTAProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "annual">("monthly")
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId)
  }

  const handleSubscribe = () => {
    // In a real app, this would process the subscription
    console.log(`Subscribing to tier ${selectedTier} with ${billingCycle} billing`)
    onClose()
  }

  const getBillingLabel = (cycle: "monthly" | "quarterly" | "annual") => {
    switch (cycle) {
      case "monthly":
        return "Monthly"
      case "quarterly":
        return "Quarterly"
      case "annual":
        return "Annual"
      default:
        return "Monthly"
    }
  }

  const getDiscountPercentage = (cycle: "monthly" | "quarterly" | "annual") => {
    switch (cycle) {
      case "quarterly":
        return 10
      case "annual":
        return 20
      default:
        return 0
    }
  }

  const adjustPriceForBilling = (price: number, originalCycle: "monthly" | "quarterly" | "annual") => {
    // If the tier's original cycle matches the selected cycle, return the original price
    if (originalCycle === billingCycle) return price

    // Convert to monthly price first
    let monthlyPrice = price
    if (originalCycle === "quarterly") monthlyPrice = price / 3
    if (originalCycle === "annual") monthlyPrice = price / 12

    // Apply discount based on selected billing cycle
    const discount = getDiscountPercentage(billingCycle)
    const discountedMonthlyPrice = monthlyPrice * (1 - discount / 100)

    // Convert to selected billing cycle
    if (billingCycle === "monthly") return discountedMonthlyPrice
    if (billingCycle === "quarterly") return discountedMonthlyPrice * 3
    if (billingCycle === "annual") return discountedMonthlyPrice * 12

    return price
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography variant="h5">Subscribe to {practitionerName}'s Estuary Streams</Typography>
        <IconButton edge="end" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Unlock Premium Content & Exclusive Benefits
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Choose a subscription tier that fits your needs and get access to exclusive content, personalized guidance,
            and more from {practitionerName}.
          </Typography>
        </Box>

        {/* Billing Cycle Selector */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Select Billing Cycle
          </Typography>
          <Tabs value={billingCycle} onChange={(_, value) => setBillingCycle(value)} variant="fullWidth" sx={{ mb: 2 }}>
            <Tab
              label={
                <Box>
                  <Typography variant="body2">Monthly</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Standard rate
                  </Typography>
                </Box>
              }
              value="monthly"
            />
            <Tab
              label={
                <Box>
                  <Typography variant="body2">Quarterly</Typography>
                  <Typography variant="caption" color="success.main">
                    Save 10%
                  </Typography>
                </Box>
              }
              value="quarterly"
            />
            <Tab
              label={
                <Box>
                  <Typography variant="body2">Annual</Typography>
                  <Typography variant="caption" color="success.main">
                    Save 20%
                  </Typography>
                </Box>
              }
              value="annual"
            />
          </Tabs>
        </Box>

        {/* Subscription Tiers */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {subscriptionTiers.map((tier) => {
            const adjustedPrice = adjustPriceForBilling(tier.price, tier.billingCycle)
            const isSelected = selectedTier === tier.id

            return (
              <Card
                key={tier.id}
                variant="outlined"
                sx={{
                  borderColor: isSelected ? "primary.main" : "divider",
                  borderWidth: isSelected ? 2 : 1,
                  position: "relative",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.main",
                    transform: "translateY(-4px)",
                    boxShadow: 2,
                  },
                }}
              >
                {tier.isPopular && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    Popular
                  </Box>
                )}

                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {tier.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {tier.description}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" component="span">
                      ${adjustedPrice.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" component="span" color="text.secondary">
                      /{billingCycle === "monthly" ? "mo" : billingCycle === "quarterly" ? "quarter" : "year"}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <List dense disablePadding>
                    {tier.features.map((feature, index) => (
                      <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    variant={isSelected ? "contained" : "outlined"}
                    color="primary"
                    fullWidth
                    onClick={() => handleSelectTier(tier.id)}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </Button>
                </CardActions>
              </Card>
            )
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubscribe} variant="contained" color="primary" disabled={!selectedTier}>
          Subscribe Now
        </Button>
      </DialogActions>
    </Dialog>
  )
}
