"use client"

import { useState } from "react"
import { Check, Copy, Facebook, Link, Mail, Twitter, Users } from "lucide-react"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const referralCode = "ESTUARY25"
  const referralLink = `https://estuary.com/signup?ref=${referralCode}`

  const copyToClipboard = (text: string, type: "code" | "link") => {
    navigator.clipboard.writeText(text)
    if (type === "code") {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <UserDashboardLayout title="Refer Friends & Earn Rewards">

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="mb-8 border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Share Your Referral Code</CardTitle>
              <CardDescription>
                Learning together is better! Earn rewards by referring friends to Estuary. After they purchase $20 in
                services, you'll get $10 and they'll get $5!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="code" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="code">Referral Code</TabsTrigger>
                  <TabsTrigger value="social">Social Media</TabsTrigger>
                </TabsList>

                <TabsContent value="code" className="space-y-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col space-y-2">
                      <label className="text-sm font-medium">Your Referral Code</label>
                      <div className="flex">
                        <div className="bg-muted p-3 rounded-l-md border border-r-0 border-input flex-1 text-center text-lg font-medium">
                          {referralCode}
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-l-none"
                          onClick={() => copyToClipboard(referralCode, "code")}
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          <span className="ml-2">{copied ? "Copied!" : "Copy"}</span>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        To earn rewards, remind your friend to enter "My profile", select "redeem", and enter the
                        referral code within 24 hours of registration.
                      </p>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-sm font-medium">Your Referral Link</label>
                      <div className="flex">
                        <div className="bg-muted p-3 rounded-l-md border border-r-0 border-input flex-1 truncate text-sm">
                          {referralLink}
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-l-none"
                          onClick={() => copyToClipboard(referralLink, "link")}
                        >
                          {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          <span className="ml-2">{linkCopied ? "Copied!" : "Copy"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="social">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
                      <Facebook className="mr-2 h-4 w-4" />
                      Share on Facebook
                    </Button>
                    <Button className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white">
                      <Twitter className="mr-2 h-4 w-4" />
                      Share on Twitter
                    </Button>
                    <Button className="bg-[#EA4335] hover:bg-[#EA4335]/90 text-white">
                      <Mail className="mr-2 h-4 w-4" />
                      Share via Email
                    </Button>
                    <Button variant="outline">
                      <Link className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Bring friends along and earn rewards in three simple steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 rounded-full p-4 mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">1. Invite Friends</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a friend an invite via email, social media, or with your personal referral link.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 rounded-full p-4 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-8 w-8 text-primary"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                  </div>
                  <h3 className="font-medium mb-2">2. Purchase</h3>
                  <p className="text-sm text-muted-foreground">
                    When your friend purchases $20 in Estuary services or more, you'll both get rewarded.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 rounded-full p-4 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-8 w-8 text-primary"
                    >
                      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                      <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                    </svg>
                  </div>
                  <h3 className="font-medium mb-2">3. Earn Together</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll get $10 and your friend will get $5 in Estuary credits!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="mb-8 border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Your Rewards</CardTitle>
              <CardDescription>Track your referral rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Total Rewards Earned</p>
                  <p className="text-3xl font-bold">$0</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending Referrals</span>
                    <span>0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed Referrals</span>
                    <span>0</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Alert className="w-full">
                <AlertTitle>Reward Details</AlertTitle>
                <AlertDescription>
                  After you invite a friend to Estuary and their purchases reach $20, you'll both earn a reward! You'll
                  earn $10 and your friend will earn $5.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>

          <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto text-sm">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  After you invite a friend to Estuary and their purchases reach $20, you'll both earn a reward! You'll
                  earn $10 and your friend will earn $5.
                </li>
                <li>Purchases using gift cards or coupons do not count toward the $20 purchase requirement.</li>
                <li>
                  New users who have not made a purchase can redeem the referral code within 24 hours after
                  registration.
                </li>
                <li>New users can only be referred once either through a ref-code or an inviting link.</li>
                <li>
                  If your friends have received referral rewards before, you will not be able to get new rewards. Each
                  person can only enjoy a referral reward once.
                </li>
                <li>Users who refer themselves are not eligible to take part in the referral program.</li>
                <li>
                  Anyone who abuses the referral program will not receive the referral bonus and their accounts may be
                  suspended.
                </li>
                <li>Fraudulent purchases will not receive the referral bonus.</li>
                <li>All decisions made by Estuary are final.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
