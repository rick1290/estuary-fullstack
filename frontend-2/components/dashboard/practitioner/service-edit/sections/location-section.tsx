"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Video, Users } from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"

interface LocationSectionProps {
  service: ServiceReadable
  data: {
    location_type?: string
    address_id?: number
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}


export function LocationSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: LocationSectionProps) {
  const [localData, setLocalData] = useState(data)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Location Type */}
        <div className="space-y-3">
          <Label>Service Location*</Label>
          <RadioGroup
            value={localData.location_type || "virtual"}
            onValueChange={(value) => handleChange("location_type", value)}
          >
            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="virtual" id="virtual" />
              <Label htmlFor="virtual" className="flex items-center gap-2 cursor-pointer flex-1">
                <Video className="h-4 w-4" />
                <div>
                  <div className="font-medium">Online</div>
                  <div className="text-sm text-muted-foreground">
                    Service delivered via video call
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="in_person" id="in_person" />
              <Label htmlFor="in_person" className="flex items-center gap-2 cursor-pointer flex-1">
                <MapPin className="h-4 w-4" />
                <div>
                  <div className="font-medium">In-Person</div>
                  <div className="text-sm text-muted-foreground">
                    Service at your physical location
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="hybrid" id="hybrid" />
              <Label htmlFor="hybrid" className="flex items-center gap-2 cursor-pointer flex-1">
                <Users className="h-4 w-4" />
                <div>
                  <div className="font-medium">Hybrid</div>
                  <div className="text-sm text-muted-foreground">
                    Both online and in-person options
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>


        {/* In-Person Details */}
        {(localData.location_type === "in_person" || localData.location_type === "hybrid") && (
          <div className="space-y-4 pl-6 border-l-2">
            <h4 className="font-medium">Physical Location</h4>
            
            <div className="space-y-2">
              <Label>Address</Label>
              {/* This would be replaced with actual address selection */}
              <div className="p-4 border rounded-lg bg-muted/50 max-w-md">
                <p className="text-sm">
                  Your business address from your practitioner profile will be used
                </p>
                <Button variant="link" className="p-0 h-auto mt-2">
                  Update business address
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}