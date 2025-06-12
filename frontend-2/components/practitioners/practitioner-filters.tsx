"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Filter } from "lucide-react"

// Mock data for filter options
const MODALITIES = ["Virtual", "In-Person", "Both"]
const LANGUAGES = ["English", "Spanish", "French", "German", "Chinese", "Japanese", "Arabic"]
const SPECIALTIES = [
  "Meditation",
  "Yoga",
  "Fitness",
  "Nutrition",
  "Life Coaching",
  "Therapy",
  "Mindfulness",
  "Breathwork",
  "Energy Healing",
  "Spiritual Guidance",
]
const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"]

interface PractitionerFiltersProps {
  initialLocation?: string
  initialModality?: string
  initialLanguage?: string
  initialSpecialties?: string[]
  initialMinRating?: string
  initialExperienceLevel?: string
}

export default function PractitionerFilters({
  initialLocation,
  initialModality,
  initialLanguage,
  initialSpecialties = [],
  initialMinRating,
  initialExperienceLevel,
}: PractitionerFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Filter states
  const [location, setLocation] = useState<string>(initialLocation || "")
  const [modality, setModality] = useState<string>(initialModality || "")
  const [language, setLanguage] = useState<string>(initialLanguage || "")
  const [specialties, setSpecialties] = useState<string[]>(initialSpecialties)
  const [minRating, setMinRating] = useState<number>(initialMinRating ? Number.parseInt(initialMinRating) : 0)
  const [experienceLevel, setExperienceLevel] = useState<string>(initialExperienceLevel || "")

  // Update local state when props change
  useEffect(() => {
    setLocation(initialLocation || "")
    setModality(initialModality || "")
    setLanguage(initialLanguage || "")
    setSpecialties(initialSpecialties)
    setMinRating(initialMinRating ? Number.parseInt(initialMinRating) : 0)
    setExperienceLevel(initialExperienceLevel || "")
  }, [initialLocation, initialModality, initialLanguage, initialSpecialties, initialMinRating, initialExperienceLevel])

  const handleSpecialtyChange = (specialty: string) => {
    setSpecialties((prev) => (prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty]))
  }

  const handleRatingChange = (value: number[]) => {
    setMinRating(value[0])
  }

  const applyFilters = () => {
    // Get current URL search params
    const params = new URLSearchParams(window.location.search)

    // Update or remove location parameter
    if (location) {
      params.set("location", location)
    } else {
      params.delete("location")
    }

    // Update or remove modality parameter
    if (modality) {
      params.set("modality", modality)
    } else {
      params.delete("modality")
    }

    // Update or remove language parameter
    if (language) {
      params.set("language", language)
    } else {
      params.delete("language")
    }

    // Clear existing specialties
    params.delete("specialty")

    // Add selected specialties
    specialties.forEach((specialty) => {
      params.append("specialty", specialty)
    })

    // Update or remove minRating parameter
    if (minRating > 0) {
      params.set("minRating", minRating.toString())
    } else {
      params.delete("minRating")
    }

    // Update or remove experienceLevel parameter
    if (experienceLevel) {
      params.set("experienceLevel", experienceLevel)
    } else {
      params.delete("experienceLevel")
    }

    // Navigate to the new URL
    router.push(`${pathname}?${params.toString()}`)
  }

  const resetFilters = () => {
    setLocation("")
    setModality("")
    setLanguage("")
    setSpecialties([])
    setMinRating(0)
    setExperienceLevel("")

    // Keep only the search query if it exists
    const params = new URLSearchParams()
    const query = new URLSearchParams(window.location.search).get("q")
    if (query) params.set("q", query)

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <Separator className="mb-6" />

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modality</Label>
            <RadioGroup value={modality} onValueChange={setModality}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="" id="all-modalities" />
                <Label htmlFor="all-modalities">All Modalities</Label>
              </div>
              {MODALITIES.map((m) => (
                <div key={m} className="flex items-center space-x-2">
                  <RadioGroupItem value={m} id={`modality-${m}`} />
                  <Label htmlFor={`modality-${m}`}>{m}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <RadioGroup value={language} onValueChange={setLanguage}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="" id="all-languages" />
                <Label htmlFor="all-languages">All Languages</Label>
              </div>
              {LANGUAGES.map((lang) => (
                <div key={lang} className="flex items-center space-x-2">
                  <RadioGroupItem value={lang} id={`language-${lang}`} />
                  <Label htmlFor={`language-${lang}`}>{lang}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Specialties</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SPECIALTIES.map((specialty) => (
                <div key={specialty} className="flex items-center space-x-2">
                  <Checkbox
                    id={`specialty-${specialty}`}
                    checked={specialties.includes(specialty)}
                    onCheckedChange={() => handleSpecialtyChange(specialty)}
                  />
                  <Label htmlFor={`specialty-${specialty}`}>{specialty}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Minimum Rating</Label>
            <Slider
              defaultValue={[0]}
              value={[minRating]}
              onValueChange={handleRatingChange}
              min={0}
              max={5}
              step={1}
              className="my-6"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Any</span>
              <span className="text-sm font-medium">5 Stars</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Experience Level</Label>
            <RadioGroup value={experienceLevel} onValueChange={setExperienceLevel}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="" id="any-experience" />
                <Label htmlFor="any-experience">Any Experience</Label>
              </div>
              {EXPERIENCE_LEVELS.map((level) => (
                <div key={level} className="flex items-center space-x-2">
                  <RadioGroupItem value={level} id={`experience-${level}`} />
                  <Label htmlFor={`experience-${level}`}>{level}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={applyFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
