"use client"

import { useState } from "react"
import { DollarSign, Info, Save, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useMutation } from "@tanstack/react-query"
import { streamsPricingPartialUpdateMutation, streamsPartialUpdateMutation } from "@/src/client/@tanstack/react-query.gen"

interface StreamPricingProps {
  streamId: number
  currentEntryPrice?: number
  currentPremiumPrice?: number
  currentFreeDescription?: string | null
  currentEntryDescription?: string | null
  currentPremiumDescription?: string | null
  currentFreePerks?: string[]
  currentEntryPerks?: string[]
  currentPremiumPerks?: string[]
  currentFreeTierName?: string
  currentEntryTierName?: string
  currentPremiumTierName?: string
  onPricingUpdate?: () => void
}

export default function StreamPricing({
  streamId,
  currentEntryPrice = 0,
  currentPremiumPrice = 0,
  currentFreeDescription = '',
  currentEntryDescription = '',
  currentPremiumDescription = '',
  currentFreePerks = [],
  currentEntryPerks = [],
  currentPremiumPerks = [],
  currentFreeTierName = 'Free',
  currentEntryTierName = 'Entry',
  currentPremiumTierName = 'Premium',
  onPricingUpdate
}: StreamPricingProps) {
  const { toast } = useToast()
  const [entryPrice, setEntryPrice] = useState(currentEntryPrice / 100)
  const [premiumPrice, setPremiumPrice] = useState(currentPremiumPrice / 100)

  // Tier names
  const [freeTierName, setFreeTierName] = useState(currentFreeTierName || 'Free')
  const [entryTierName, setEntryTierName] = useState(currentEntryTierName || 'Entry')
  const [premiumTierName, setPremiumTierName] = useState(currentPremiumTierName || 'Premium')

  // Tier descriptions
  const [freeDescription, setFreeDescription] = useState(currentFreeDescription || '')
  const [entryDescription, setEntryDescription] = useState(currentEntryDescription || '')
  const [premiumDescription, setPremiumDescription] = useState(currentPremiumDescription || '')

  // Tier perks
  const [freePerks, setFreePerks] = useState<string[]>(currentFreePerks || [])
  const [entryPerks, setEntryPerks] = useState<string[]>(currentEntryPerks || [])
  const [premiumPerks, setPremiumPerks] = useState<string[]>(currentPremiumPerks || [])
  const [newFreePerk, setNewFreePerk] = useState('')
  const [newEntryPerk, setNewEntryPerk] = useState('')
  const [newPremiumPerk, setNewPremiumPerk] = useState('')

  const updatePricingMutation = useMutation({
    ...streamsPricingPartialUpdateMutation(),
    onSuccess: () => {
      // After pricing updates, also save descriptions & perks
      updateDetailsMutation.mutate({
        path: { id: streamId },
        body: {
          free_tier_name: freeTierName,
          entry_tier_name: entryTierName,
          premium_tier_name: premiumTierName,
          free_tier_description: freeDescription || null,
          entry_tier_description: entryDescription || null,
          premium_tier_description: premiumDescription || null,
          free_tier_perks: freePerks,
          entry_tier_perks: entryPerks,
          premium_tier_perks: premiumPerks,
        } as any
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.body?.detail || "Failed to update pricing. Please try again.",
        variant: "destructive",
      })
    }
  })

  const updateDetailsMutation = useMutation({
    ...streamsPartialUpdateMutation(),
    onSuccess: () => {
      toast({
        title: "Tiers updated",
        description: "Your pricing, descriptions, and perks have been saved.",
      })
      if (onPricingUpdate) {
        onPricingUpdate()
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error saving tier details",
        description: error?.body?.detail || "Pricing was saved but tier details failed. Try again.",
        variant: "destructive",
      })
    }
  })

  const addPerk = (
    perks: string[],
    setPerks: (p: string[]) => void,
    newPerk: string,
    setNewPerk: (s: string) => void
  ) => {
    if (newPerk.trim()) {
      setPerks([...perks, newPerk.trim()])
      setNewPerk('')
    }
  }

  const removePerk = (perks: string[], setPerks: (p: string[]) => void, index: number) => {
    setPerks(perks.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (entryPrice < 1) {
      toast({
        title: "Invalid price",
        description: "Entry tier price must be at least $1",
        variant: "destructive",
      })
      return
    }

    if (premiumPrice <= entryPrice) {
      toast({
        title: "Invalid price",
        description: "Premium tier price must be higher than entry tier price",
        variant: "destructive",
      })
      return
    }

    if (!streamId) {
      toast({
        title: "Error",
        description: "Stream ID is required",
        variant: "destructive",
      })
      return
    }

    updatePricingMutation.mutate({
      path: {
        id: streamId
      },
      body: {
        entry_tier_price_cents: Math.round(entryPrice * 100),
        premium_tier_price_cents: Math.round(premiumPrice * 100),
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium">Subscription Pricing</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Set monthly subscription prices for your content tiers. Subscribers will be charged monthly to access your content.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The platform takes a 15% commission on all subscription revenue. Prices shown to subscribers include this fee.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Free Tier</CardTitle>
            <CardDescription>Always free - available to everyone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free-tier-name">Display Name</Label>
              <Input
                id="free-tier-name"
                value={freeTierName}
                onChange={(e) => setFreeTierName(e.target.value)}
                placeholder="e.g. Community, Follower, Free"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">This is what subscribers see. Internally it&apos;s always &quot;Free&quot;.</p>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-semibold">0</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-description">Description</Label>
              <Textarea
                id="free-description"
                placeholder="What do free followers get? e.g. 'Access to weekly posts and community updates'"
                value={freeDescription}
                onChange={(e) => setFreeDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Perks</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {freePerks.map((perk, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {perk}
                    <button type="button" onClick={() => removePerk(freePerks, setFreePerks, i)} className="ml-1 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a perk..."
                  value={newFreePerk}
                  onChange={(e) => setNewFreePerk(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerk(freePerks, setFreePerks, newFreePerk, setNewFreePerk) } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addPerk(freePerks, setFreePerks, newFreePerk, setNewFreePerk)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entry Tier</CardTitle>
            <CardDescription>Basic paid subscription with access to entry-level content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entry-tier-name">Display Name</Label>
              <Input
                id="entry-tier-name"
                value={entryTierName}
                onChange={(e) => setEntryTierName(e.target.value)}
                placeholder="e.g. Supporter, Member, Insider"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-price">Monthly Price (USD)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="entry-price"
                  type="number"
                  min="1"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll receive ${(entryPrice * 0.85).toFixed(2)} per subscriber after platform fees
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-description">Description</Label>
              <Textarea
                id="entry-description"
                placeholder="What do entry subscribers get? e.g. 'Behind-the-scenes content and monthly Q&As'"
                value={entryDescription}
                onChange={(e) => setEntryDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Perks</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {entryPerks.map((perk, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {perk}
                    <button type="button" onClick={() => removePerk(entryPerks, setEntryPerks, i)} className="ml-1 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a perk..."
                  value={newEntryPerk}
                  onChange={(e) => setNewEntryPerk(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerk(entryPerks, setEntryPerks, newEntryPerk, setNewEntryPerk) } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addPerk(entryPerks, setEntryPerks, newEntryPerk, setNewEntryPerk)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Premium Tier</CardTitle>
            <CardDescription>Full access to all your exclusive content and perks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="premium-tier-name">Display Name</Label>
              <Input
                id="premium-tier-name"
                value={premiumTierName}
                onChange={(e) => setPremiumTierName(e.target.value)}
                placeholder="e.g. VIP, Inner Circle, All Access"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium-price">Monthly Price (USD)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="premium-price"
                  type="number"
                  min="1"
                  step="0.01"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(parseFloat(e.target.value) || 0)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll receive ${(premiumPrice * 0.85).toFixed(2)} per subscriber after platform fees
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium-description">Description</Label>
              <Textarea
                id="premium-description"
                placeholder="What do premium subscribers get? e.g. '1-on-1 sessions, exclusive workshops, and VIP community access'"
                value={premiumDescription}
                onChange={(e) => setPremiumDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Perks</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {premiumPerks.map((perk, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {perk}
                    <button type="button" onClick={() => removePerk(premiumPerks, setPremiumPerks, i)} className="ml-1 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a perk..."
                  value={newPremiumPerk}
                  onChange={(e) => setNewPremiumPerk(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerk(premiumPerks, setPremiumPerks, newPremiumPerk, setNewPremiumPerk) } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addPerk(premiumPerks, setPremiumPerks, newPremiumPerk, setNewPremiumPerk)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimated Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">10 Entry subscribers:</span>
              <span>${(entryPrice * 10 * 0.85).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">5 Premium subscribers:</span>
              <span>${(premiumPrice * 5 * 0.85).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total (after fees):</span>
              <span>${((entryPrice * 10 + premiumPrice * 5) * 0.85).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={updatePricingMutation.isPending || !streamId}
          className="gap-2"
        >
          {updatePricingMutation.isPending ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Pricing
            </>
          )}
        </Button>
      </div>

      {currentEntryPrice > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Existing subscribers will continue at their current rates. 
            New pricing only applies to new subscribers.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}