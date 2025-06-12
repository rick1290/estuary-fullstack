"use client"

import React from "react"
import { Box } from "@mui/material"

interface CustomTabProps {
  label: string
  icon: React.ReactElement
  index: number
  activeTab: number
  onClick: (index: number) => void
}

export default function CustomTab({ label, icon, index, activeTab, onClick }: CustomTabProps) {
  return (
    <Box
      component="button"
      onClick={() => onClick(index)}
      sx={{
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        minWidth: "100px",
        textTransform: "none",
        fontSize: "0.9rem",
        fontFamily: "inherit",
        color: activeTab === index ? "primary.main" : "text.primary",
        bgcolor: "transparent",
        border: "none",
        borderBottom: activeTab === index ? "2px solid" : "2px solid transparent",
        borderColor: activeTab === index ? "primary.main" : "transparent",
        cursor: "pointer",
        transition: "all 0.2s",
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      {React.cloneElement(icon, {
        sx: { mr: 1, color: activeTab === index ? "primary.main" : "action.active" },
      })}
      {label}
    </Box>
  )
}
