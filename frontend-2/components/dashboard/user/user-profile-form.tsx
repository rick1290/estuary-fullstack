"use client"

import { useState } from "react"
import { Box, TextField, Button, Grid, Typography, Avatar, Divider } from "@mui/material"
import { Edit as EditIcon, Save as SaveIcon } from "@mui/icons-material"

// Mock user data
const userData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+1 (555) 123-4567",
  address: "123 Main Street",
  city: "San Francisco",
  state: "CA",
  zipCode: "94105",
  country: "United States",
  bio: "I'm passionate about wellness and personal growth. Looking forward to exploring new practices and connecting with practitioners.",
  profileImage: "/abstract-user-icon.png",
}

export default function UserProfileForm() {
  const [profile, setProfile] = useState(userData)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSaving(true)

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      setIsEditing(false)
    }, 1000)
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Personal Information</Typography>
        <Button
          startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
          onClick={() => !isEditing && setIsEditing(true)}
          type={isEditing ? "submit" : "button"}
          variant={isEditing ? "contained" : "outlined"}
          disabled={isSaving}
        >
          {isEditing ? (isSaving ? "Saving..." : "Save Changes") : "Edit Profile"}
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Avatar
            src={profile.profileImage}
            alt={`${profile.firstName} ${profile.lastName}`}
            sx={{ width: 120, height: 120, mb: 2 }}
          />
          {isEditing && (
            <Button variant="outlined" component="label" size="small">
              Change Photo
              <input type="file" hidden accept="image/*" />
            </Button>
          )}
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                value={profile.email}
                disabled
                helperText="Email cannot be changed"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            Address Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                name="address"
                value={profile.address}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={profile.city}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                name="state"
                value={profile.state}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ZIP/Postal Code"
                name="zipCode"
                value={profile.zipCode}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={profile.country}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            About You
          </Typography>
          <TextField
            fullWidth
            label="Bio"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            disabled={!isEditing}
            multiline
            rows={4}
            helperText={`${profile.bio.length}/500 characters`}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
