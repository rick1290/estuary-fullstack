"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  Plus, 
  X,
  Search,
  DollarSign,
  Calculator,
  PieChart,
  Info,
  AlertCircle
} from "lucide-react"
import { practitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import type { ServiceReadable, PractitionerListResponse } from "@/src/client/types.gen"
import { useAuth } from "@/hooks/use-auth"

interface RevenueSharingSectionProps {
  service: ServiceReadable
  data: {
    additionalPractitioners?: Array<{
      practitionerId: number
      practitioner?: PractitionerListResponse
      role?: string
      revenueSharePercentage: number
    }>
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function RevenueSharingSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: RevenueSharingSectionProps) {
  const { user } = useAuth()
  const [localData, setLocalData] = useState(data)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [practitioners, setPractitioners] = useState(data.additionalPractitioners || [])

  // Fetch available practitioners
  const { data: practitionersData, isLoading } = useQuery({
    ...practitionersListOptions({
      query: {
        search: searchQuery,
        page_size: 20,
        is_active: true
      }
    }),
    enabled: showSearch && searchQuery.length >= 3
  })

  const availablePractitioners = practitionersData?.results?.filter(
    p => p.id !== user?.practitioner_profile?.id && 
         !practitioners.find(ap => ap.practitionerId === p.id)
  ) || []

  useEffect(() => {
    setLocalData(data)
    setPractitioners(data.additionalPractitioners || [])
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const totalAllocatedPercentage = practitioners.reduce(
    (sum, p) => sum + p.revenueSharePercentage, 
    0
  )
  const primaryPercentage = Math.max(0, 100 - totalAllocatedPercentage)

  const addPractitioner = (practitioner: PractitionerListResponse) => {
    const newPractitioner = {
      practitionerId: practitioner.id,
      practitioner: practitioner,
      revenueSharePercentage: 0,
      role: "Co-Practitioner"
    }
    const updated = [...practitioners, newPractitioner]
    setPractitioners(updated)
    handleChange('additionalPractitioners', updated)
    setShowSearch(false)
    setSearchQuery("")
  }

  const updatePractitioner = (index: number, updates: any) => {
    const updated = [...practitioners]
    updated[index] = { ...updated[index], ...updates }
    
    // Ensure total doesn't exceed 100%
    const newTotal = updated.reduce((sum, p) => sum + p.revenueSharePercentage, 0)
    if (newTotal > 100) return
    
    setPractitioners(updated)
    handleChange('additionalPractitioners', updated)
  }

  const removePractitioner = (index: number) => {
    const updated = practitioners.filter((_, i) => i !== index)
    setPractitioners(updated)
    handleChange('additionalPractitioners', updated)
  }

  const distributeEvenly = () => {
    const totalPractitioners = practitioners.length + 1 // Include primary
    const evenShare = Math.floor(100 / totalPractitioners)
    const remainder = 100 - (evenShare * totalPractitioners)
    
    const updated = practitioners.map((p, index) => ({
      ...p,
      revenueSharePercentage: evenShare + (index === 0 ? remainder : 0)
    }))
    
    setPractitioners(updated)
    handleChange('additionalPractitioners', updated)
  }

  const calculateEarnings = (percentage: number) => {
    const servicePrice = service.price_cents ? service.price_cents / 100 : 0
    const platformCommission = 0.05 // 5% platform fee
    const netAmount = servicePrice * (1 - platformCommission)
    return (netAmount * percentage / 100).toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            <h3 className="font-medium">Revenue Distribution</h3>
          </div>
          
          {/* Visual representation */}
          <div className="flex h-8 overflow-hidden rounded-lg border">
            <div 
              className="bg-primary transition-all duration-300"
              style={{ width: `${primaryPercentage}%` }}
              title={`Primary: ${primaryPercentage}%`}
            />
            {practitioners.map((p, index) => (
              <div
                key={p.practitionerId}
                className="bg-secondary transition-all duration-300"
                style={{ 
                  width: `${p.revenueSharePercentage}%`,
                  opacity: 0.8 - (index * 0.1)
                }}
                title={`${p.practitioner?.display_name || 'Co-Practitioner'}: ${p.revenueSharePercentage}%`}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Service Price</p>
              <p className="text-lg font-semibold">
                ${service.price_cents ? (service.price_cents / 100).toFixed(2) : "0.00"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Platform Fee (5%)</p>
              <p className="text-lg font-semibold">
                ${service.price_cents ? ((service.price_cents / 100) * 0.05).toFixed(2) : "0.00"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Practitioners</p>
              <p className="text-lg font-semibold">{practitioners.length + 1}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Allocated</p>
              <p className={`text-lg font-semibold ${totalAllocatedPercentage > 100 ? 'text-destructive' : ''}`}>
                {totalAllocatedPercentage}%
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Primary Practitioner */}
      <Card className="p-6">
        <div className="space-y-4">
          <h4 className="font-medium">Primary Practitioner</h4>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user?.practitioner_profile?.profile_image_url} />
                <AvatarFallback>
                  {user?.practitioner_profile?.display_name?.charAt(0) || "P"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {user?.practitioner_profile?.display_name || "You"}
                </p>
                <p className="text-sm text-muted-foreground">Primary Practitioner</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-primary">{primaryPercentage}%</p>
              <p className="text-sm text-muted-foreground">
                ${calculateEarnings(primaryPercentage)} per booking
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            As the service owner, you automatically receive any unallocated revenue
          </p>
        </div>
      </Card>

      {/* Additional Practitioners */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Additional Practitioners</h4>
            {practitioners.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={distributeEvenly}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Distribute Evenly
              </Button>
            )}
          </div>

          {/* Practitioner List */}
          {practitioners.length > 0 && (
            <div className="space-y-3">
              {practitioners.map((practitioner, index) => (
                <div key={practitioner.practitionerId} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={practitioner.practitioner?.profile_image_url} />
                        <AvatarFallback>
                          {practitioner.practitioner?.display_name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {practitioner.practitioner?.display_name || `Practitioner ${practitioner.practitionerId}`}
                        </p>
                        <Input
                          value={practitioner.role || ""}
                          onChange={(e) => updatePractitioner(index, { role: e.target.value })}
                          placeholder="Role (e.g., Co-Facilitator)"
                          className="h-7 text-sm mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePractitioner(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Revenue Share: {practitioner.revenueSharePercentage}%</Label>
                      <span className="text-sm text-muted-foreground">
                        ${calculateEarnings(practitioner.revenueSharePercentage)} per booking
                      </span>
                    </div>
                    <Slider
                      value={[practitioner.revenueSharePercentage]}
                      onValueChange={(value) => {
                        const otherPractitionersTotal = practitioners
                          .filter((_, i) => i !== index)
                          .reduce((sum, p) => sum + p.revenueSharePercentage, 0)
                        const maxAllowed = Math.min(100 - otherPractitionersTotal, value[0])
                        updatePractitioner(index, { 
                          revenueSharePercentage: maxAllowed 
                        })
                      }}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Practitioner */}
          {showSearch ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search practitioners by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {searchQuery.length < 3 ? (
                <p className="text-center text-muted-foreground py-4">
                  Type at least 3 characters to search
                </p>
              ) : isLoading ? (
                <p className="text-center text-muted-foreground py-4">Searching...</p>
              ) : (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {availablePractitioners.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {availablePractitioners.map((practitioner) => (
                        <Button
                          key={practitioner.id}
                          type="button"
                          variant="ghost"
                          className="w-full justify-start h-auto py-2 px-3"
                          onClick={() => addPractitioner(practitioner)}
                        >
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage src={practitioner.profile_image_url} />
                            <AvatarFallback>
                              {practitioner.display_name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left flex-1">
                            <p className="font-medium">{practitioner.display_name}</p>
                            {practitioner.specializations && (
                              <p className="text-xs text-muted-foreground">
                                {practitioner.specializations.slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No practitioners found
                    </p>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery("")
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowSearch(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Practitioner
            </Button>
          )}
        </div>
      </Card>

      {/* Validation Warning */}
      {totalAllocatedPercentage > 100 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Total revenue share exceeds 100%. Please adjust the percentages.
          </AlertDescription>
        </Alert>
      )}

      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p className="font-medium">Revenue Sharing Information:</p>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>The platform deducts a 5% commission from all bookings</li>
            <li>Primary practitioner automatically receives any unallocated percentage</li>
            <li>Co-practitioners will need to accept the invitation before appearing on the service</li>
            <li>Revenue is distributed after each successful booking</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || totalAllocatedPercentage > 100}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}