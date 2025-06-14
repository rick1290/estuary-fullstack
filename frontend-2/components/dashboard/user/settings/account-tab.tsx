"use client"

import type React from "react"

import { useState } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Camera, MapPin, Heart } from "lucide-react"

// Mock data for modality interests
const MODALITY_OPTIONS = [
  "Meditation",
  "Yoga",
  "Coaching",
  "Therapy",
  "Fitness",
  "Nutrition",
  "Art Therapy",
  "Sound Healing",
  "Breathwork",
  "Dance",
  "Mindfulness",
  "Energy Healing",
]

export default function AccountTab() {
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [firstName, setFirstName] = useState("Rick")
  const [lastName, setLastName] = useState("Nielsen")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedModalities, setSelectedModalities] = useState<string[]>(["Meditation", "Yoga", "Mindfulness"])
  const [bio, setBio] = useState("I'm passionate about wellness and personal growth. Looking forward to exploring new practices and connecting with practitioners.")

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleModalityToggle = (modality: string) => {
    if (selectedModalities.includes(modality)) {
      setSelectedModalities(selectedModalities.filter((m) => m !== modality))
    } else {
      if (selectedModalities.length < 6) {
        setSelectedModalities([...selectedModalities, modality])
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-medium text-gray-900">Account Settings</h2>
        <p className="mt-1 text-sm text-gray-600">Update your personal information and preferences</p>
      </div>

      {/* Profile Image Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Profile Photo</h3>
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 ring-4 ring-gray-100">
            <AvatarImage src={profileImage || undefined} alt="Profile" />
            <AvatarFallback className="bg-warm-100 text-warm-600 text-2xl font-medium">
              {firstName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Camera className="mr-2 h-4 w-4" />
                Change photo
                <input 
                  hidden 
                  accept="image/jpeg,image/png" 
                  type="file" 
                  onChange={handleImageUpload} 
                />
              </label>
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              JPG or PNG. Max size 2MB.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Personal Information */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-normal">First name</Label>
            <Input 
              id="firstName" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-normal">Last name</Label>
            <Input 
              id="lastName" 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="phoneNumber" className="text-sm font-normal">Phone number</Label>
            <div className="flex">
              <div className="flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md">
                <span className="text-sm text-gray-600">+1</span>
              </div>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="rounded-l-none bg-white"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Location */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address" className="text-sm font-normal">Street address</Label>
            <Input id="address" className="bg-white" placeholder="123 Main Street" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm font-normal">City</Label>
            <Input id="city" className="bg-white" placeholder="New York" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state" className="text-sm font-normal">State</Label>
            <Input id="state" className="bg-white" placeholder="NY" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode" className="text-sm font-normal">ZIP code</Label>
            <Input id="zipCode" className="bg-white" placeholder="10001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-normal">Country</Label>
            <Input id="country" defaultValue="United States" className="bg-white" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Wellness Interests */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Wellness Interests
        </h3>
        <p className="text-sm text-gray-600 mb-4">Select up to 6 types of services you're interested in</p>
        
        <div className="flex flex-wrap gap-2">
          {MODALITY_OPTIONS.map((modality) => (
            <Badge
              key={modality}
              variant={selectedModalities.includes(modality) ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                selectedModalities.includes(modality) 
                  ? "bg-warm-200 text-warm-800 border-warm-300 hover:bg-warm-300" 
                  : "hover:bg-gray-50"
              } ${
                selectedModalities.length >= 6 && !selectedModalities.includes(modality)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={() => handleModalityToggle(modality)}
            >
              {modality}
            </Badge>
          ))}
        </div>
        
        {selectedModalities.length >= 6 && (
          <p className="text-sm text-amber-600 mt-3">Maximum of 6 interests selected</p>
        )}
      </div>

      <Separator />

      {/* Bio */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">About You</h3>
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-normal">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-[120px] bg-white resize-none"
            placeholder="Tell us a bit about yourself..."
            maxLength={500}
          />
          <p className="text-xs text-gray-500 text-right">{bio.length}/500 characters</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button size="lg" className="px-8">
          Save Changes
        </Button>
      </div>
    </div>
  )
}