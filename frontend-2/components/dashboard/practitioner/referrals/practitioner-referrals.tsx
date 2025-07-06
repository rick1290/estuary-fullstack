"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PractitionerReferrals() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  
  // Mock data - in real app, fetch from API
  const referralCode = "ESTUARY-PRO-2024"
  const referralLink = `https://estuary.app/join?ref=${referralCode}`
  const totalReferrals = 12
  const activeReferrals = 8
  const pendingReferrals = 4
  const totalEarnings = 1250.00
  const pendingEarnings = 200.00
  
  const recentReferrals = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@example.com",
      status: "active",
      joinedDate: "2024-01-15",
      earnings: 150.00
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "michael@example.com",
      status: "pending",
      joinedDate: "2024-01-18",
      earnings: 0
    },
    {
      id: 3,
      name: "Emma Williams",
      email: "emma@example.com",
      status: "active",
      joinedDate: "2024-01-10",
      earnings: 200.00
    }
  ]

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
    
    toast({
      title: "Invitation sent!",
      description: `An invitation has been sent to ${email}`,
    })
    setEmail("")
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
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              {activeReferrals} active, {pendingReferrals} pending
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalReferrals > 0 ? Math.round((activeReferrals / totalReferrals) * 100) : 0}%
            </div>
            <Progress 
              value={totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0} 
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
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
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
            <div className="text-2xl font-bold">${pendingEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting eligibility
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program Info */}
      <Card className="border-sage-200 bg-gradient-to-br from-sage-50 to-white">
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
                <Button type="submit" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
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
              <div className="space-y-4">
                {recentReferrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{referral.name}</p>
                      <p className="text-sm text-muted-foreground">{referral.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Joined {referral.joinedDate}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant={referral.status === 'active' ? 'default' : 'secondary'}>
                        {referral.status}
                      </Badge>
                      {referral.earnings > 0 && (
                        <p className="text-sm font-medium text-green-600">
                          +${referral.earnings.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="outline" className="w-full mt-4">
                View All Referrals
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
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
                  <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Available for Payout</Label>
                  <p className="text-2xl font-bold text-green-600">
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