"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  User,
  Sparkles,
  Clock,
  CreditCard,
  ArrowRight,
  PartyPopper,
  X,
} from "lucide-react"
import { useSetupChecklist } from "@/hooks/use-setup-checklist"
import type { ChecklistItem } from "@/hooks/use-setup-checklist"

const DISMISS_KEY = "estuary-setup-checklist-dismissed"

const itemIcons: Record<string, typeof User> = {
  profile: User,
  services: Sparkles,
  availability: Clock,
  stripe: CreditCard,
}

export default function SetupChecklist() {
  const { items, completedCount, totalCount, isAllComplete, isLoading } = useSetupChecklist()
  const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true")
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true")
    setDismissed(true)
  }

  if (dismissed) return null

  if (isLoading) {
    return (
      <Card className="mb-6 border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-2 w-full mt-3" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const progressPercent = (completedCount / totalCount) * 100

  // Celebration state
  if (isAllComplete) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-6 border-2 border-sage-200 bg-gradient-to-r from-sage-50 to-cream-50">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100">
                    <PartyPopper className="h-6 w-6 text-sage-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-olive-900">You're all set!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your practice is ready to receive clients. Great work!
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-olive-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-6 border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-olive-900">
              Get your practice flowing
            </CardTitle>
            <Badge variant="secondary" className="bg-sage-100 text-sage-700">
              {completedCount} of {totalCount}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2 mt-2 bg-sage-100 [&>div]:bg-sage-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <ChecklistRow key={item.id} item={item} index={index} />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ChecklistRow({ item, index }: { item: ChecklistItem; index: number }) {
  const Icon = itemIcons[item.id] || Sparkles

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`flex items-center gap-4 rounded-lg p-3 transition-colors ${
        item.isComplete ? "opacity-60" : "hover:bg-sage-50"
      }`}
    >
      {/* Completion indicator */}
      {item.isComplete ? (
        <CheckCircle2 className="h-10 w-10 text-sage-600 shrink-0 p-1" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-sage-300">
          <Icon className="h-5 w-5 text-sage-500" />
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${item.isComplete ? "line-through text-muted-foreground" : "text-olive-900"}`}>
          {item.title}
        </p>
        {!item.isComplete && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        )}
      </div>

      {/* CTA */}
      {!item.isComplete && (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={item.href}>
            {item.ctaLabel}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </motion.div>
  )
}
