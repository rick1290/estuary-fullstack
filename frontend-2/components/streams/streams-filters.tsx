"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Video, ImageIcon, FileText, Mic, TrendingUp, Clock, Heart } from "lucide-react"

interface StreamsFiltersProps {
  initialContentType?: string
  initialTags?: string[]
  initialShowLocked?: boolean
  initialSort?: string
}

export default function StreamsFilters({
  initialContentType,
  initialTags = [],
  initialShowLocked = false,
  initialSort = "recent",
}: StreamsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [contentType, setContentType] = useState<string | undefined>(initialContentType)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [showLocked, setShowLocked] = useState<boolean>(initialShowLocked)
  const [sort, setSort] = useState<string>(initialSort)

  // Available content types
  const contentTypes = [
    { value: "video", label: "Videos", icon: <Video className="h-4 w-4" /> },
    { value: "image", label: "Images", icon: <ImageIcon className="h-4 w-4" /> },
    { value: "article", label: "Articles", icon: <FileText className="h-4 w-4" /> },
    { value: "audio", label: "Audio", icon: <Mic className="h-4 w-4" /> },
  ]

  // Available tags
  const availableTags = [
    "Mindfulness",
    "Fitness",
    "Nutrition",
    "Mental Health",
    "Yoga",
    "Meditation",
    "Spirituality",
    "Personal Growth",
    "Wellness",
    "Coaching",
  ]

  // Sort options
  const sortOptions = [
    { value: "trending", label: "Trending", icon: <TrendingUp className="h-4 w-4" /> },
    { value: "recent", label: "Most Recent", icon: <Clock className="h-4 w-4" /> },
    { value: "engagement", label: "Most Engaged", icon: <Heart className="h-4 w-4" /> },
  ]

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams()

    if (contentType) {
      params.set("type", contentType)
    }

    tags.forEach((tag) => {
      params.append("tag", tag)
    })

    if (showLocked) {
      params.set("locked", "true")
    }

    if (sort) {
      params.set("sort", sort)
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  // Reset filters
  const resetFilters = () => {
    setContentType(undefined)
    setTags([])
    setShowLocked(false)
    setSort("recent")
    router.push(pathname)
  }

  // Handle content type change
  const handleContentTypeChange = (value: string) => {
    setContentType(value === contentType ? undefined : value)
  }

  // Handle tag change
  const handleTagChange = (value: string) => {
    setTags(tags.includes(value) ? tags.filter((tag) => tag !== value) : [...tags, value])
  }

  return (
    <div className="space-y-6">
      {/* Content Type Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Content Type</h4>
        <div className="space-y-2">
          {contentTypes.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={contentType === type.value}
                onCheckedChange={() => handleContentTypeChange(type.value)}
                className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
              />
              <span className="flex items-center gap-2 text-sm text-gray-700 group-hover:text-gray-900">
                {type.icon}
                <span>{type.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sort By Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Sort By</h4>
        <RadioGroup value={sort} onValueChange={setSort}>
          <div className="space-y-2">
            {sortOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <RadioGroupItem 
                  value={option.value} 
                  className="border-gray-300 text-gray-900 data-[state=checked]:border-gray-900"
                />
                <span className="flex items-center gap-2 text-sm text-gray-700 group-hover:text-gray-900">
                  {option.icon}
                  <span>{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Topics Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Topics</h4>
        <div className="space-y-2">
          {availableTags.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox 
                checked={tags.includes(tag)} 
                onCheckedChange={() => handleTagChange(tag)}
                className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Premium Content Toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <Checkbox 
            checked={showLocked} 
            onCheckedChange={(checked) => setShowLocked(checked as boolean)}
            className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">
            Include Premium Content
          </span>
        </label>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button 
          variant="default" 
          onClick={applyFilters} 
          className="w-full"
        >
          Apply Filters
        </Button>
        <Button 
          variant="outline" 
          onClick={resetFilters}
          className="w-full"
        >
          Reset All
        </Button>
      </div>
    </div>
  )
}
