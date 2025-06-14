import { Grid, Card, CardContent, Typography, Box } from "@mui/material"
import {
  EmojiEvents as TrophyIcon,
  Spa as SpaIcon,
  Psychology as PsychologyIcon,
  Star as StarIcon,
  ThumbUp as ThumbUpIcon,
  Lightbulb as LightbulbIcon,
  EmojiEvents,
} from "@mui/icons-material"
import type { Benefit } from "@/types/service"

interface ServiceBenefitsProps {
  benefits: Benefit[]
}

export default function ServiceBenefits({ benefits }: ServiceBenefitsProps) {
  // Map benefit icons to MUI icons
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "trophy":
        return <TrophyIcon fontSize="large" color="primary" />
      case "award":
        return <StarIcon fontSize="large" color="primary" />
      case "medal":
        return <EmojiEvents fontSize="large" color="primary" />
      case "certificate":
        return <PsychologyIcon fontSize="large" color="primary" />
      case "crown":
        return <SpaIcon fontSize="large" color="primary" />
      case "thumbs-up":
        return <ThumbUpIcon fontSize="large" color="primary" />
      default:
        return <LightbulbIcon fontSize="large" color="primary" />
    }
  }

  return (
    <Grid container spacing={3}>
      {benefits.map((benefit, index) => (
        <Grid item xs={12} sm={6} md={3} key={benefit.id || index}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 3,
              },
            }}
          >
            <CardContent
              sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
            >
              <Box sx={{ mb: 2 }}>{getIcon(benefit.icon)}</Box>
              <Typography variant="h6" component="h3" gutterBottom>
                {benefit.title}
              </Typography>
              {benefit.description && (
                <Typography variant="body2" color="text.secondary">
                  {benefit.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
