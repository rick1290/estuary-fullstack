"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Copy,
  Gift,
  Users,
  TrendingUp,
  CheckCircle,
  Share2,
  Mail,
  DollarSign,
  Calendar,
  ChevronRight,
  Info,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { referralsStatsRetrieveOptions, referralsListOptions, referralsInviteCreateMutation } from "@/src/client/@tanstack/react-query.gen"

export default function PractitionerReferrals() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")

  // Fetch referral stats from API
  const { data: stats, isLoading: statsLoading } = useQuery({
    ...referralsStatsRetrieveOptions(),
  })

  // Fetch referral list from API
  const { data: referralsData, isLoading: referralsLoading } = useQuery({
    ...referralsListOptions(),
  })

  // Invite mutation
  const inviteMutation = useMutation({
    ...referralsInviteCreateMutation(),
    onSuccess: (data: any) => {
      toast({
        title: "Invitation sent!",
        description: data?.message || `An invitation has been sent to ${email}`,
      })
      setEmail("")
      queryClient.invalidateQueries({ queryKey: referralsListOptions().queryKey })
      queryClient.invalidateQueries({ queryKey: referralsStatsRetrieveOptions().queryKey })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invite",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    },
  })

  const referralCode = stats?.referral_code ?? ""
  const referralLink = stats?.referral_link ?? ""
  const totalReferrals = stats?.total_referrals ?? 0
  const convertedReferrals = stats?.converted_referrals ?? 0
  const pendingReferrals = stats?.pending_referrals ?? 0
  const totalEarnings = Number(stats?.total_earnings ?? 0)
  const pendingEarnings = Number(stats?.pending_earnings ?? 0)

  const referrals = referralsData?.results ?? []

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard.",
    })
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    toast({
      title: "Code copied!",
      description: "Your referral code has been copied to clipboard.",
    })
  }

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    inviteMutation.mutate({
      body: { email },
    } as any)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'converted': return 'default'
      case 'pending': return 'secondary'
      case 'expired': return 'outline'
      case 'rejected': return 'destructive'
      default: return 'secondary'
    }
  }

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-light text-olive-900">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              {convertedReferrals} converted, {pendingReferrals} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-light text-olive-900">
              {totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0}%
            </div>
            <Progress
              value={totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-light text-olive-900">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From referral rewards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-light text-olive-900">${pendingEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting eligibility
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program Info */}
      <Card className="border-sage-200/60 bg-cream-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-sage-600" />
            Referral Program Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-sage-600" />
                <span className="font-medium">Invite Practitioners</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Share your unique referral link or code
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-sage-600" />
                <span className="font-medium">They Join & Earn</span>
              </div>
              <p className="text-sm text-muted-foreground">
                They complete onboarding and earn $500
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-sage-600" />
                <span className="font-medium">You Earn $100</span>
              </div>
              <p className="text-sm text-muted-foreground">
                For each successful referral
              </p>
            </div>
          </div>

          <Alert className="border-sage-200 bg-sage-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Referrals must complete their first $500 in earnings within 90 days for you to receive your reward.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="share" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="share">Share</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="share" className="space-y-4">
          {/* Referral Link */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share this link with practitioners who might be interested in joining Estuary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={handleCopyLink} variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm">Referral Code</Label>
                  <div className="flex gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                      {referralCode}
                    </code>
                    <Button onClick={handleCopyCode} variant="outline" size="sm">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Share via</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Social Media
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Send Direct Invite */}
          <Card>
            <CardHeader>
              <CardTitle>Send Direct Invitation</CardTitle>
              <CardDescription>
                Invite practitioners directly via email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="practitioner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
              <CardDescription>
                Track the status of practitioners you've referred
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No referrals yet. Share your link to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((referral: any) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {referral.referred_name || referral.email_sent_to}
                        </p>
                        <p className="text-sm text-muted-foreground">{referral.email_sent_to}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {referral.created_at
                            ? new Date(referral.created_at).toLocaleDateString()
                            : "Unknown"}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge variant={getStatusVariant(referral.status) as any}>
                          {referral.status}
                        </Badge>
                        {referral.referrer_reward_amount && Number(referral.referrer_reward_amount) > 0 && (
                          <p className="text-sm font-medium text-green-600">
                            +${Number(referral.referrer_reward_amount).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {referrals.length > 0 && (
                <Button variant="outline" className="w-full mt-4">
                  View All Referrals
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Rewards</CardTitle>
              <CardDescription>
                Your earnings from the referral program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">Lifetime Earnings</Label>
                  <p className="font-serif text-2xl font-light text-olive-900">${totalEarnings.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Available for Payout</Label>
                  <p className="font-serif text-2xl font-light text-green-600">
                    ${(totalEarnings - pendingEarnings).toFixed(2)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Reward Tiers</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Standard Referral</p>
                      <p className="text-sm text-muted-foreground">1-5 successful referrals</p>
                    </div>
                    <p className="font-bold">$100/referral</p>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-sage-50">
                    <div>
                      <p className="font-medium">Silver Tier</p>
                      <p className="text-sm text-muted-foreground">6-10 successful referrals</p>
                    </div>
                    <p className="font-bold text-sage-700">$125/referral</p>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Gold Tier</p>
                      <p className="text-sm text-muted-foreground">11+ successful referrals</p>
                    </div>
                    <p className="font-bold text-amber-600">$150/referral</p>
                  </div>
                </div>
              </div>

              <Button className="w-full">
                Request Payout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
