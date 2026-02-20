"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useSetupChecklist } from "@/hooks/use-setup-checklist"

const DISMISS_KEY = "estuary-setup-checklist-dismissed"

export default function SetupBanner() {
  const pathname = usePathname()
  const { items, completedCount, totalCount, isAllComplete, isLoading } = useSetupChecklist()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true")
  }, [])

  // Hide on main dashboard (full checklist is there), while loading, or if dismissed/complete
  if (
    pathname === "/dashboard/practitioner" ||
    isLoading ||
    dismissed ||
    isAllComplete
  ) {
    return null
  }

  // Find the first incomplete item
  const nextStep = items.find((i) => !i.isComplete)
  if (!nextStep) return null

  const progressPercent = (completedCount / totalCount) * 100

  return (
    <div className="mb-4 flex items-center gap-4 rounded-lg border border-sage-200 bg-white/80 backdrop-blur-sm px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-olive-700 shrink-0">
        <CheckCircle2 className="h-4 w-4 text-sage-500" />
        <span className="font-medium">Setup: {completedCount}/{totalCount}</span>
      </div>
      <Progress value={progressPercent} className="h-1.5 flex-1 max-w-32 bg-sage-100 [&>div]:bg-sage-500" />
      <Link
        href={nextStep.href}
        className="flex items-center gap-1 text-sm font-medium text-sage-700 hover:text-sage-900 transition-colors ml-auto"
      >
        Next: {nextStep.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
