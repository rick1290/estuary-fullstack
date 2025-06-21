"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Camera, MapPin, Heart, Loader2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authMeOptions, modalitiesListOptions, userModalityPreferencesOptions, userSetModalityPreferencesMutation } from "@/src/client/@tanstack/react-query.gen"
import { authMeUpdate } from "@/src/client/sdk.gen"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function AccountTab() {
  const queryClient = useQueryClient()
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedModalities, setSelectedModalities] = useState<number[]>([])
  const [bio, setBio] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery(authMeOptions())

  // Fetch available modalities
  const { data: modalitiesData, isLoading: modalitiesLoading } = useQuery(modalitiesListOptions())

  // Fetch user's modality preferences
  const { data: userModalityPrefs, isLoading: prefsLoading } = useQuery(userModalityPreferencesOptions())

  // Update modality preferences mutation
  const updateModalitiesMutation = useMutation({
    ...userSetModalityPreferencesMutation(),
    onSuccess: () => {
      toast.success("Wellness interests updated successfully")
      queryClient.invalidateQueries({ queryKey: ["userModalityPreferences"] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update wellness interests")
    }
  })

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { first_name: string; last_name: string; phone_number: string | null }) => {
      return authMeUpdate({
        body: data
      })
    },
    onSuccess: () => {
      toast.success("Profile updated successfully")
      queryClient.invalidateQueries({ queryKey: ["authMe"] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to update profile")
    }
  })

  // Load user data when component mounts or data changes
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.first_name || "")
      setLastName(userProfile.last_name || "")
      setPhoneNumber(userProfile.phone_number || "")
      // Note: Bio would need backend support
    }
  }, [userProfile])

  // Load user's modality preferences when data is available
  useEffect(() => {
    console.log("User modality preferences response:", userModalityPrefs)
    if (userModalityPrefs?.results) {
      const modalityIds = userModalityPrefs.results.map((pref: any) => pref.id)
      console.log("Setting selected modality IDs:", modalityIds)
      setSelectedModalities(modalityIds)
    }
  }, [userModalityPrefs])

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

  const handleModalityToggle = (modalityId: number) => {
    console.log("Toggling modality:", modalityId)
    console.log("Current selected:", selectedModalities)
    
    if (selectedModalities.includes(modalityId)) {
      setSelectedModalities(selectedModalities.filter((id) => id !== modalityId))
    } else {
      if (selectedModalities.length < 6) {
        setSelectedModalities([...selectedModalities, modalityId])
      }
    }
  }

  const handleSaveChanges = async () => {
    setIsLoading(true)
    try {
      // Update basic profile info
      await updateProfileMutation.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null
      })
      
      // Update modality preferences
      await updateModalitiesMutation.mutateAsync({
        body: {
          modality_ids: selectedModalities
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (profileLoading || modalitiesLoading || prefsLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
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
              {firstName.charAt(0) || userProfile?.email?.charAt(0)?.toUpperCase() || "U"}
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
          {modalitiesData?.results?.map((modality) => {
            console.log("Modality:", modality.id, modality.name, "Selected:", selectedModalities.includes(modality.id))
            return (
              <Badge
                key={modality.id}
                variant={selectedModalities.includes(modality.id) ? "terracotta" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedModalities.length >= 6 && !selectedModalities.includes(modality.id)
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={() => handleModalityToggle(modality.id)}
                title={modality.description || modality.name}
              >
                {modality.name}
              </Badge>
            )
          })}
        </div>
        
        {selectedModalities.length > 0 && (
          <p className="text-sm text-gray-600 mt-3">
            {selectedModalities.length} of 6 interests selected
          </p>
        )}
        {selectedModalities.length >= 6 && (
          <p className="text-sm text-amber-600 mt-1">Maximum interests selected</p>
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
        <Button 
          size="lg" 
          className="px-8"
          onClick={handleSaveChanges}
          disabled={isLoading || updateProfileMutation.isPending || updateModalitiesMutation.isPending}
        >
          {isLoading || updateProfileMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  )
}