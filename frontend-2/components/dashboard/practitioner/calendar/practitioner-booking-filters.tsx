"use client"

import type React from "react"

import { useState } from "react"
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  type SelectChangeEvent,
  Grid,
  IconButton,
} from "@mui/material"
import { Search, FilterList, Clear } from "@mui/icons-material"

const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
}

// Mock data for filters
const serviceTypes = ["Meditation", "Coaching", "Yoga", "Nutrition", "Therapy", "Fitness", "Wellness"]

export default function PractitionerBookingFilters() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  })

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleTypeChange = (event: SelectChangeEvent<typeof selectedTypes>) => {
    const {
      target: { value },
    } = event
    setSelectedTypes(typeof value === "string" ? value.split(",") : value)
  }

  const handleDateChange = (field: "start" | "end") => (event: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange({
      ...dateRange,
      [field]: event.target.value,
    })
  }

  const handleToggleFilters = () => {
    setShowFilters(!showFilters)
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedTypes([])
    setDateRange({ start: "", end: "" })
  }

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: showFilters ? 2 : 0 }}>
        <TextField
          fullWidth
          placeholder="Search by title, client, or location..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton aria-label="clear search" onClick={() => setSearchTerm("")} edge="end" size="small">
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          size="small"
        />
        <Button
          variant={showFilters ? "contained" : "outlined"}
          startIcon={<FilterList />}
          onClick={handleToggleFilters}
          size="small"
        >
          Filters
        </Button>
      </Box>

      {showFilters && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="service-type-label">Service Types</InputLabel>
              <Select
                labelId="service-type-label"
                id="service-type"
                multiple
                value={selectedTypes}
                onChange={handleTypeChange}
                input={<OutlinedInput id="select-multiple-chip" label="Service Types" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {serviceTypes.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={dateRange.start}
              onChange={handleDateChange("start")}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="date"
              value={dateRange.end}
              onChange={handleDateChange("end")}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2} sx={{ display: "flex", alignItems: "center" }}>
            <Button variant="outlined" color="inherit" onClick={handleClearFilters} fullWidth size="small">
              Clear All
            </Button>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
