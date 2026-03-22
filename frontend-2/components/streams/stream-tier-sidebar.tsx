"use client"

import { Check, Users, Zap, Crown, Heart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface StreamTierSidebarProps {
  stream: any // StreamReadable from API
  onFollowFree: () => void
  onSubscribe: (tier: "entry" | "premium") => void
  onUpgrade: (tier: "entry" | "premium") => void
  isAuthenticated: boolean
}

function formatPrice(cents: number | null | undefined): string {
  if (!cents) return "Free"
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`
}

function PerksList({ perks }: { perks: string[] | null | undefined }) {
  if (!perks || perks.length === 0) return null
  return (
    <ul className="space-y-2 mt-3">
      {perks.map((perk, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-olive-800">
          <Check className="h-4 w-4 mt-0.5 shrink-0 text-sage-600" />
          <span>{perk}</span>
        </li>
      ))}
    </ul>
  )
}

export default function StreamTierSidebar({
  stream,
  onFollowFree,
  onSubscribe,
  onUpgrade,
  isAuthenticated,
}: StreamTierSidebarProps) {
  const currentTier = stream.user_subscription?.tier_level as
    | "free"
    | "entry"
    | "premium"
    | undefined
  const isSubscribed = !!currentTier

  return (
    <div className="space-y-4">
      {/* Subscriber count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
        <Users className="h-4 w-4" />
        <span>{stream.subscriber_count || 0} subscribers</span>
      </div>

      {/* Follow for Free – prominent when not subscribed */}
      {!isSubscribed && (
        <Card className="border-2 border-green-300 bg-green-50/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Follow for Free</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get access to all free-tier content from {stream.title}.
            </p>
            <Button
              onClick={onFollowFree}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Follow for Free
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Free Tier Card ── */}
      <Card
        className={
          currentTier === "free"
            ? "border-2 border-green-500 bg-green-50/30"
            : "border border-green-200/60"
        }
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">
                {stream.free_tier_name || "Free"}
              </CardTitle>
            </div>
            {currentTier === "free" && (
              <Badge className="bg-sage-100 text-sage-800 border-0">Current Plan</Badge>
            )}
          </div>
          <span className="text-sm font-medium text-green-700">Free</span>
        </CardHeader>
        <CardContent>
          {stream.free_tier_description && (
            <p className="text-sm text-muted-foreground">
              {stream.free_tier_description}
            </p>
          )}
          <PerksList perks={stream.free_tier_perks} />
        </CardContent>
      </Card>

      {/* ── Entry Tier Card ── */}
      <Card
        className={
          currentTier === "entry"
            ? "border-2 border-sage-500 bg-sage-50/30"
            : "border border-sage-200/60"
        }
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-sage-600" />
              <CardTitle className="text-base">
                {stream.entry_tier_name || "Entry"}
              </CardTitle>
            </div>
            {currentTier === "entry" && (
              <Badge className="bg-sage-100 text-sage-800 border-0">Current Plan</Badge>
            )}
          </div>
          <span className="text-sm font-medium text-sage-700">
            {formatPrice(stream.entry_tier_price_cents)}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {stream.entry_tier_description && (
            <p className="text-sm text-muted-foreground">
              {stream.entry_tier_description}
            </p>
          )}
          <PerksList perks={stream.entry_tier_perks} />

          {/* Action button logic */}
          {!isSubscribed && (
            <Button
              onClick={() => onSubscribe("entry")}
              variant="outline"
              className="w-full border-sage-300 text-sage-800 hover:bg-sage-100"
            >
              Subscribe – {formatPrice(stream.entry_tier_price_cents)}
            </Button>
          )}
          {currentTier === "free" && (
            <Button
              onClick={() => onUpgrade("entry")}
              className="w-full bg-sage-600 hover:bg-sage-700 text-white"
            >
              Upgrade to {stream.entry_tier_name || "Entry"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Premium Tier Card ── */}
      <Card
        className={
          currentTier === "premium"
            ? "border-2 border-terracotta-500 bg-terracotta-50/30"
            : "border border-terracotta-200/60"
        }
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-terracotta-600" />
              <CardTitle className="text-base">
                {stream.premium_tier_name || "Premium"}
              </CardTitle>
            </div>
            {currentTier === "premium" && (
              <Badge className="bg-terracotta-100 text-terracotta-800 border-0">Current Plan</Badge>
            )}
          </div>
          <span className="text-sm font-medium text-terracotta-700">
            {formatPrice(stream.premium_tier_price_cents)}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {stream.premium_tier_description && (
            <p className="text-sm text-muted-foreground">
              {stream.premium_tier_description}
            </p>
          )}
          <PerksList perks={stream.premium_tier_perks} />

          {/* Action button logic */}
          {!isSubscribed && (
            <Button
              onClick={() => onSubscribe("premium")}
              className="w-full bg-terracotta-500 hover:bg-terracotta-600 text-white"
            >
              Subscribe – {formatPrice(stream.premium_tier_price_cents)}
            </Button>
          )}
          {(currentTier === "free" || currentTier === "entry") && (
            <Button
              onClick={() => onUpgrade("premium")}
              className="w-full bg-terracotta-500 hover:bg-terracotta-600 text-white"
            >
              Upgrade to {stream.premium_tier_name || "Premium"}
            </Button>
          )}
          {currentTier === "premium" && (
            <div className="text-center py-2 px-3 bg-terracotta-50 rounded-lg">
              <p className="text-sm font-medium text-terracotta-700">
                You have full access
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
