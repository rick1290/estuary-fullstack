"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { 
  Users, 
  Plus, 
  Trash2,
  Search,
  DollarSign,
  Percent,
  AlertCircle,
  UserCheck,
  UserPlus,
  Calculator,
  PieChart,
  Info
} from "lucide-react"
import { practitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import type { PractitionerListResponse } from "@/src/client/types.gen"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface AdditionalPractitioner {
  practitionerId: number
  practitioner?: PractitionerListResponse
  role?: string
  revenueSharePercentage: number
  isPrimary?: boolean
}

export function RevenueSharingStep() {
  const { formState, updateFormField } = useServiceForm()
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [practitioners, setPractitioners] = useState<AdditionalPractitioner[]>([])

  // Primary practitioner always gets remaining percentage
  const primaryPractitioner: AdditionalPractitioner = {
    practitionerId: user?.practitioner_profile?.id || 0,
    practitioner: user?.practitioner_profile as any,
    revenueSharePercentage: 100,
    isPrimary: true,
    role: "Primary Practitioner"
  }

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

  // Initialize with existing data
  useEffect(() => {
    if (formState.additional_practitioner_ids?.length) {
      // TODO: Fetch practitioner details for IDs
      const existingPractitioners = formState.additional_practitioner_ids.map((id, index) => ({
        practitionerId: id,
        revenueSharePercentage: 0, // Default, would come from backend
        role: "Co-Practitioner"
      }))
      setPractitioners(existingPractitioners)
    }
  }, [formState.additional_practitioner_ids])

  // Update form state when practitioners change
  useEffect(() => {
    updateFormField("additional_practitioner_ids", practitioners.map(p => p.practitionerId))
  }, [practitioners, updateFormField])

  const totalAllocatedPercentage = practitioners.reduce(
    (sum, p) => sum + p.revenueSharePercentage, 
    0
  )
  const primaryPercentage = Math.max(0, 100 - totalAllocatedPercentage)

  const addPractitioner = (practitioner: PractitionerListResponse) => {
    const newPractitioner: AdditionalPractitioner = {
      practitionerId: practitioner.id,
      practitioner: practitioner,
      revenueSharePercentage: 0,
      role: "Co-Practitioner"
    }
    setPractitioners([...practitioners, newPractitioner])
    setShowSearch(false)
    setSearchQuery("")
  }

  const updatePractitioner = (index: number, updates: Partial<AdditionalPractitioner>) => {
    const updated = [...practitioners]
    updated[index] = { ...updated[index], ...updates }
    
    // Ensure total doesn't exceed 100%
    const newTotal = updated.reduce((sum, p) => sum + p.revenueSharePercentage, 0)
    if (newTotal > 100) {
      toast({
        title: "Invalid percentage",
        description: "Total revenue share cannot exceed 100%",
        variant: "destructive"
      })
      return
    }
    
    setPractitioners(updated)
  }

  const removePractitioner = (index: number) => {
    setPractitioners(practitioners.filter((_, i) => i !== index))
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
  }

  const calculateEarnings = (percentage: number) => {
    const servicePrice = parseFloat(formState.price || "0")
    const platformCommission = 0.05 // 5% platform fee
    const netAmount = servicePrice * (1 - platformCommission)
    return (netAmount * percentage / 100).toFixed(2)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Revenue Sharing</h2>
        <p className="text-muted-foreground">
          Add co-practitioners and configure how revenue is shared for this service. The platform takes a 5% commission.
        </p>
      </div>

      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Revenue Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                <p className="text-2xl font-semibold">${formState.price || "0"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Platform Fee (5%)</p>
                <p className="text-2xl font-semibold">
                  ${(parseFloat(formState.price || "0") * 0.05).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Practitioners</p>
                <p className="text-2xl font-semibold">{practitioners.length + 1}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Allocated</p>
                <p className={`text-2xl font-semibold ${totalAllocatedPercentage > 100 ? 'text-destructive' : ''}`}>
                  {totalAllocatedPercentage}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Practitioner */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Practitioner</CardTitle>
          <CardDescription>
            As the service owner, you automatically receive any unallocated revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={primaryPractitioner.practitioner?.profile_image_url} />
                <AvatarFallback>
                  {primaryPractitioner.practitioner?.display_name?.charAt(0) || "P"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {primaryPractitioner.practitioner?.display_name || "You"}
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
        </CardContent>
      </Card>

      {/* Additional Practitioners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Additional Practitioners</CardTitle>
              <CardDescription>
                Add practitioners who will share revenue from this service
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Practitioner List */}
          {practitioners.length > 0 && (
            <div className="space-y-4">
              {practitioners.map((practitioner, index) => (
                <div key={practitioner.practitionerId} className="space-y-4 p-4 border rounded-lg">
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
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={practitioner.role || ""}
                            onChange={(e) => updatePractitioner(index, { role: e.target.value })}
                            placeholder="Role (e.g., Co-Facilitator)"
                            className="h-7 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removePractitioner(index)}
                    >
                      <Trash2 className="h-4 w-4" />
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
                      className="w-full"
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
                          className="w-full justify-start h-auto py-2 px-3 hover:bg-accent"
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
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No practitioners found matching "{searchQuery}"
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
              <Plus className="mr-2 h-4 w-4" />
              Add Practitioner
            </Button>
          )}
        </CardContent>
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
        <AlertDescription>
          <strong>Revenue Sharing Information:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• The platform deducts a 5% commission from all bookings</li>
            <li>• Primary practitioner automatically receives any unallocated percentage</li>
            <li>• Co-practitioners will need to accept the invitation before appearing on the service</li>
            <li>• Revenue is distributed after each successful booking</li>
            <li>• All practitioners can view their earnings in their dashboard</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}