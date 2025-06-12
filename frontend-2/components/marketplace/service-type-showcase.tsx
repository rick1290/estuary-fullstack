import type React from "react"
import Link from "next/link"
import { Paper, Box, Typography, Button, Avatar } from "@mui/material"

interface ServiceTypeShowcaseProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color?: string
}

export default function ServiceTypeShowcase({
  title,
  description,
  icon,
  href,
  color = "#7986cb",
}: ServiceTypeShowcaseProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.3s, box-shadow 0.3s",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 12px 20px rgba(0,0,0,0.1)",
        },
        borderRadius: 4,
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px)",
        border: "1px solid",
        borderColor: "rgba(0, 0, 0, 0.05)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <Avatar
          sx={{
            width: 70,
            height: 70,
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {icon}
        </Avatar>
      </Box>
      <Typography variant="h6" component="h3" align="center" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3, flexGrow: 1 }}>
        {description}
      </Typography>
      <Button
        variant="outlined"
        fullWidth
        component={Link}
        href={href}
        sx={{
          borderRadius: "28px",
          borderColor: color,
          color: color,
          "&:hover": {
            backgroundColor: `${color}10`,
            borderColor: color,
          },
          mt: "auto",
        }}
      >
        Explore
      </Button>
    </Paper>
  )
}
