"use client"

import { useState } from "react"
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
  Paper,
  Button,
  TextField,
  MenuItem,
  Grid,
} from "@mui/material"
import { Save as SaveIcon } from "@mui/icons-material"

// Mock preferences data
const preferencesData = {
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: true,
  reminderTime: "24h",
  language: "en",
  timezone: "America/Los_Angeles",
  theme: "system",
}

// Options for dropdown menus
const reminderOptions = [
  { value: "1h", label: "1 hour before" },
  { value: "3h", label: "3 hours before" },
  { value: "12h", label: "12 hours before" },
  { value: "24h", label: "24 hours before" },
  { value: "48h", label: "48 hours before" },
]

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
]

const timezoneOptions = [
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
]

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System Default" },
]

export default function UserPreferencesForm() {
  const [preferences, setPreferences] = useState(preferencesData)
  const [isSaving, setIsSaving] = useState(false)

  const handleSwitchChange = (event) => {
    setPreferences({
      ...preferences,
      [event.target.name]: event.target.checked,
    })
  }

  const handleSelectChange = (event) => {
    setPreferences({
      ...preferences,
      [event.target.name]: event.target.value,
    })
  }

  const handleSave = () => {
    setIsSaving(true)

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      // In a real app, you would show a success message here
    }, 1000)
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">User Preferences</Typography>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Notification Preferences
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.emailNotifications}
                onChange={handleSwitchChange}
                name="emailNotifications"
              />
            }
            label="Email Notifications"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 2 }}>
            Receive booking confirmations, reminders, and updates via email
          </Typography>

          <FormControlLabel
            control={
              <Switch checked={preferences.smsNotifications} onChange={handleSwitchChange} name="smsNotifications" />
            }
            label="SMS Notifications"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 2 }}>
            Receive booking confirmations, reminders, and updates via text message
          </Typography>

          <FormControlLabel
            control={
              <Switch checked={preferences.marketingEmails} onChange={handleSwitchChange} name="marketingEmails" />
            }
            label="Marketing Emails"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Receive newsletters, promotions, and special offers
          </Typography>
        </FormGroup>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Reminder Settings
        </Typography>
        <TextField
          select
          label="Booking Reminder Time"
          name="reminderTime"
          value={preferences.reminderTime}
          onChange={handleSelectChange}
          fullWidth
          margin="normal"
          helperText="How far in advance you want to receive reminders for upcoming bookings"
        >
          {reminderOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Regional Settings
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Language"
              name="language"
              value={preferences.language}
              onChange={handleSelectChange}
              fullWidth
              margin="normal"
            >
              {languageOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Timezone"
              name="timezone"
              value={preferences.timezone}
              onChange={handleSelectChange}
              fullWidth
              margin="normal"
            >
              {timezoneOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Appearance
        </Typography>
        <TextField
          select
          label="Theme"
          name="theme"
          value={preferences.theme}
          onChange={handleSelectChange}
          fullWidth
          margin="normal"
          helperText="Select your preferred theme for the application"
        >
          {themeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Paper>
    </Box>
  )
}
