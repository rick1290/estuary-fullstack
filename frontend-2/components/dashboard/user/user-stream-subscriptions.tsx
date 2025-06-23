"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { Spinner } from "@/components/ui/spinner"
import { Users, Calendar, CreditCard, Settings } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import StreamSubscriptionTierChange from "@/components/streams/stream-subscription-tier-change"

export default function UserStreamSubscriptions() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null)
  const [showManageDialog, setShowManageDialog] = useState(false)

  // TODO: The users/me/stream-subscriptions endpoint is not being generated in the OpenAPI client
  // For now, we'll show a placeholder
  const { data, isLoading } = { data: null, isLoading: false }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Stream Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const subscriptions = data?.results || []

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Stream Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">You haven't subscribed to any streams yet</p>
            <Button onClick={() => router.push('/streams')}>
              Discover Streams
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Stream Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="space-y-4">
          {subscriptions.map((subscription: any) => (
            <div
              key={subscription.id}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div 
                className="flex items-center gap-4 flex-1 cursor-pointer"
                onClick={() => router.push(`/streams/${subscription.stream?.public_uuid}`)}
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center overflow-hidden">
                  {subscription.stream?.practitioner?.profile_image_url ? (
                    <img 
                      src={subscription.stream.practitioner.profile_image_url} 
                      alt={subscription.stream.practitioner.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-olive-800">
                      {subscription.stream?.practitioner?.display_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">{subscription.stream?.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    by {subscription.stream?.practitioner?.display_name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant={subscription.tier_level === 'free' ? 'secondary' : 'default'}>
                    {subscription.tier_level}
                  </Badge>
                  {subscription.tier_level !== 'free' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ${((subscription.tier_level === 'entry' 
                        ? subscription.stream?.entry_tier_price_cents 
                        : subscription.stream?.premium_tier_price_cents) / 100).toFixed(2)}/mo
                    </p>
                  )}
                </div>
                
                {subscription.tier_level !== 'free' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {subscription.is_active ? 'Active' : 'Inactive'}
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSubscription(subscription)
                    setShowManageDialog(true)
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {subscriptions.some((sub: any) => sub.tier_level !== 'free') && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Manage your subscription billing</p>
              </div>
              <Button variant="outline" size="sm">
                Manage Billing
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Manage Subscription Dialog */}
    <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
      <DialogContent className="max-w-2xl">
        {selectedSubscription && (
          <StreamSubscriptionTierChange
            stream={selectedSubscription.stream}
            currentSubscription={selectedSubscription}
            onClose={() => {
              setShowManageDialog(false)
              setSelectedSubscription(null)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}