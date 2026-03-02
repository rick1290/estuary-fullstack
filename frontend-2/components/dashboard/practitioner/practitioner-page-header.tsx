"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { HelpCircle, ArrowLeft } from "lucide-react"

interface PractitionerPageHeaderProps {
  title: string
  helpLink?: string
  backLink?: string
  backLabel?: string
  action?: {
    label: string
    icon?: ReactNode
    href?: string
    onClick?: () => void
  }
  tabs?: {
    value: string
    label: string
  }[]
  activeTab?: string
  onTabChange?: (value: string) => void
  className?: string
  children?: ReactNode
}

export function PractitionerPageHeader({
  title,
  helpLink,
  backLink,
  backLabel,
  action,
  tabs,
  activeTab,
  onTabChange,
  className,
  children
}: PractitionerPageHeaderProps) {
  return (
    <div className={cn("bg-cream-50/50 overflow-hidden", className)}>
      <div className="px-4 sm:px-6">
        {/* Back link if provided */}
        {backLink && (
          <div className="pt-3">
            <Link href={backLink}>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {backLabel || "Back"}
              </Button>
            </Link>
          </div>
        )}

        {/* Title row with action - compact spacing */}
        <div className={cn("flex items-center justify-between gap-3 py-4", backLink && "pt-2")}>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl font-light text-olive-900 truncate">{title}</h1>
            {helpLink && (
              <Link
                href={helpLink}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 hidden sm:flex"
              >
                Help docs
                <HelpCircle className="h-3 w-3" />
              </Link>
            )}
          </div>

          {action && (
            <Button
              onClick={action.onClick}
              asChild={!!action.href}
              size="sm"
              className="shrink-0"
            >
              {action.href ? (
                <Link href={action.href}>
                  {action.icon}
                  <span className={cn("hidden sm:inline", action.icon ? "ml-2" : "")}>{action.label}</span>
                </Link>
              ) : (
                <>
                  {action.icon}
                  <span className={cn("hidden sm:inline", action.icon ? "ml-2" : "")}>{action.label}</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Tabs directly below - scrollable on mobile */}
        {tabs && tabs.length > 0 ? (
          <div className="overflow-x-auto scrollbar-none">
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className="h-auto p-0 bg-transparent border-0 rounded-none w-max justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap text-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        ) : children ? (
          children
        ) : null}
      </div>
    </div>
  )
}