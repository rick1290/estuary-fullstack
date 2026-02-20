"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface CtaAction {
  label: string
  href?: string
  onClick?: () => void
}

interface DashboardEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  cta?: CtaAction
  secondaryCta?: CtaAction
  variant?: "card" | "inline"
  iconColorClass?: string
  iconBgClass?: string
}

function CtaButton({ action, variant }: { action: CtaAction; variant: "primary" | "secondary" }) {
  const button = (
    <Button
      variant={variant === "primary" ? "default" : "outline"}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  )

  if (action.href) {
    return <Button asChild variant={variant === "primary" ? "default" : "outline"}><Link href={action.href}>{action.label}</Link></Button>
  }

  return button
}

export default function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  cta,
  secondaryCta,
  variant = "card",
  iconColorClass = "text-sage-600",
  iconBgClass = "bg-sage-100",
}: DashboardEmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={cn("rounded-full p-3 mb-4", iconBgClass)}>
        <Icon className={cn("h-6 w-6", iconColorClass)} />
      </div>
      <h3 className="text-lg font-medium text-olive-900 mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {(cta || secondaryCta) && (
        <div className="flex items-center gap-3">
          {cta && <CtaButton action={cta} variant="primary" />}
          {secondaryCta && <CtaButton action={secondaryCta} variant="secondary" />}
        </div>
      )}
    </div>
  )

  if (variant === "card") {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="pt-6">{content}</CardContent>
      </Card>
    )
  }

  return content
}
