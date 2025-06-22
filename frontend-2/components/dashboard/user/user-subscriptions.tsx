"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { Crown, Calendar, CreditCard, AlertCircle, ChevronRight, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import SubscriptionModal from "@/components/streams/subscription-modal"

interface SubscriptionCardProps {
  subscription: any // TODO: Replace with proper type from API
  onUnsubscribe: () => void
  onChangeTier: () => void
}

function SubscriptionCard({ subscription, onUnsubscribe, onChangeTier }: SubscriptionCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const handleUnsubscribe = async () => {
    if (!confirm("Are you sure you want to cancel this subscription? You'll continue to have access until the end of your billing period.")) {
      return
    }
    
    setLoading(true)
    try {
      // TODO: Replace with actual API call when api-client is available
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Subscription cancelled",
        description: "Your subscription will end at the end of the current billing period.",
      })
      onUnsubscribe()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const tierColors = {
    free: "bg-gray-100 text-gray-700",
    entry: "bg-sage-100 text-sage-700",
    premium: "bg-terracotta-100 text-terracotta-700",
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video relative bg-gradient-to-br from-sage-100 to-terracotta-100">
        {subscription.stream.coverImage ? (
          <Image
            src={subscription.stream.coverImage}
            alt={subscription.stream.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="h-20 w-20 text-white/50" />
          </div>
        )}
        <Badge className={`absolute top-4 right-4 ${tierColors[subscription.tier as keyof typeof tierColors]}`}>
          {subscription.tier} tier
        </Badge>
      </div>
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{subscription.stream.title}</CardTitle>
            <CardDescription className="mt-1">
              by {subscription.stream.practitioner.displayName}
            </CardDescription>
          </div>
          <Link href={`/streams/${subscription.stream.id}`}>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Started
            </span>
            <span>{subscription.startedAt ? format(new Date(subscription.startedAt), "MMM d, yyyy") : "-"}</span>
          </div>
          
          {subscription.tier !== "free" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  Monthly price
                </span>
                <span>${(subscription.priceCents / 100).toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next billing</span>
                <span>{subscription.currentPeriodEnd ? format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy") : "-"}</span>
              </div>
            </>
          )}
          
          {subscription.canceledAt && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Subscription ends on {subscription.endsAt ? format(new Date(subscription.endsAt), "MMM d, yyyy") : "-"}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <Separator />
        
        <div className="flex gap-2">
          {subscription.tier !== "free" && !subscription.canceledAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={onChangeTier}
              className="flex-1"
            >
              Change Tier
            </Button>
          )}
          
          {!subscription.canceledAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnsubscribe}
              disabled={loading}
              className={subscription.tier === "free" ? "w-full" : "flex-1"}
            >
              {loading ? "Cancelling..." : "Cancel"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Mock subscription data - replace with API call when available
const mockSubscriptions = [
  {
    id: "sub-1",
    user: { id: "user-1", name: "John Doe" },
    stream: {
      id: "stream-1",
      title: "Mindful Living Journey",
      coverImage: null,
      practitioner: { displayName: "Sarah Johnson" },
      entryTierPriceCents: 1500,
      premiumTierPriceCents: 3000,
    },
    tier: "entry",
    status: "active",
    priceCents: 1500,
    startedAt: "2024-01-15T00:00:00Z",
    currentPeriodEnd: "2024-02-15T00:00:00Z",
    canceledAt: null,
    endsAt: null,
  },
  {
    id: "sub-2",
    user: { id: "user-1", name: "John Doe" },
    stream: {
      id: "stream-2",
      title: "Yoga & Wellness",
      coverImage: null,
      practitioner: { displayName: "Mike Chen" },
      entryTierPriceCents: 1000,
      premiumTierPriceCents: 2000,
    },
    tier: "free",
    status: "active",
    priceCents: 0,
    startedAt: "2024-01-10T00:00:00Z",
    currentPeriodEnd: null,
    canceledAt: null,
    endsAt: null,
  },
];

export default function UserSubscriptions() {
  const [subscriptions, setSubscriptions] = useState(mockSubscriptions)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const refetch = () => {
    // Mock refetch - in real app would refetch from API
    setIsLoading(true)
    setTimeout(() => {
      setSubscriptions([...mockSubscriptions])
      setIsLoading(false)
    }, 500)
  }
  
  const activeSubscriptions = subscriptions?.filter(sub => sub.status === "active") || []
  const cancelledSubscriptions = subscriptions?.filter(sub => sub.status === "canceled") || []
  const expiringSoon = activeSubscriptions.filter(sub => {
    if (sub.tier === "free" || sub.canceledAt || !sub.currentPeriodEnd) return false
    const daysUntilEnd = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilEnd <= 7 && daysUntilEnd > 0
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted animate-pulse rounded" />
                <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${activeSubscriptions
                .filter(sub => sub.tier !== "free")
                .reduce((total, sub) => total + (sub.priceCents / 100), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringSoon.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {expiringSoon.length} subscription{expiringSoon.length > 1 ? 's' : ''} expiring within 7 days.
            Review them below to ensure uninterrupted access.
          </AlertDescription>
        </Alert>
      )}

      {/* Subscriptions Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeSubscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledSubscriptions.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Crown className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No active subscriptions</h3>
                <p className="text-muted-foreground mb-4">
                  Explore streams to find content that interests you
                </p>
                <Link href="/streams">
                  <Button>Browse Streams</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSubscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onUnsubscribe={() => refetch()}
                  onChangeTier={() => {
                    setSelectedSubscription(subscription)
                    setShowUpgradeModal(true)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="cancelled" className="space-y-4">
          {cancelledSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No cancelled subscriptions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cancelledSubscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onUnsubscribe={() => refetch()}
                  onChangeTier={() => {
                    setSelectedSubscription(subscription)
                    setShowUpgradeModal(true)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upgrade/Change Tier Modal */}
      {selectedSubscription && (
        <SubscriptionModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          streamId={selectedSubscription.stream.id}
          streamTitle={selectedSubscription.stream.title}
          practitionerName={selectedSubscription.stream.practitioner.displayName}
          entryPrice={selectedSubscription.stream.entryTierPriceCents}
          premiumPrice={selectedSubscription.stream.premiumTierPriceCents}
          currentTier={selectedSubscription.tier}
          onSubscriptionSuccess={() => {
            refetch()
            setShowUpgradeModal(false)
          }}
        />
      )}
    </div>
  )
}